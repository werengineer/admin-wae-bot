// Plain-node tests of the two pure modules (no phone, no server): node test/stream-and-chat.test.mjs
import { createSseParser } from "../src/stream.ts"
import { applyEvent, emptyRun, finishWatching } from "../src/chat-state.ts"

const results = []
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "   " + extra : ""}`) }
const run = (events, sent = "") => events.reduce((s, ev) => applyEvent(s, ev, sent), emptyRun())

// ---- stream parser
{
  const got = []
  const p = createSseParser((e) => got.push(e))
  p.push('data: {"type":"run","runId":"r1","n":1}\n\n: ping\n\ndata: {"type":"del')
  p.push('ta","text":"Hel","n":2}\n\ndata: {not json}\n\ndata: {"type":"delta","text":"lo","n":3}\n\n')
  check("stream: blocks cut anywhere are put together, pings and broken blocks are skipped", got.length === 3 && got[0].runId === "r1" && got[1].text === "Hel" && got[2].text === "lo", JSON.stringify(got.map((g) => g.type)))
  const q = []
  const p2 = createSseParser((e) => q.push(e))
  p2.push('data: {"type":"a"}\n'); p2.push("\n")
  check("stream: a block is handled only when its blank line has arrived", q.length === 1)
  const p3 = createSseParser((e) => q.push(e))
  p3.push('data: {"type":"b"}\n')
  check("stream: an unfinished block is not handled yet", q.length === 1)
}

// ---- run: a normal answer
let s = run([
  { type: "run", runId: "r9", n: 1 },
  { type: "session", sessionId: "S1", projectName: "Academy Admin", n: 2 },
  { type: "model", model: "claude-sonnet-5-5", n: 3 },
  { type: "delta", text: "Hel", n: 4 }, { type: "delta", text: "lo", n: 5 },
  { type: "text", text: "Hello there", n: 6 },
  { type: "end", status: "done", n: 7 },
])
check("run: run id, session, project, model and the last event number are kept", s.jobId === "r9" && s.sessionId === "S1" && s.projectName === "Academy Admin" && s.usedModel === "claude-sonnet-5-5" && s.last === 7 && s.ended)
check("run: words are joined and the finished text replaces them (one bot message)", s.messages.length === 1 && s.messages[0].kind === "bot" && s.messages[0].text === "Hello there" && !s.messages[0].streaming)
s = run([{ type: "delta", text: "ab" }, { type: "delta", text: "cd" }])
check("run: words so far show as one streaming message", s.messages.length === 1 && s.messages[0].text === "abcd" && s.messages[0].streaming === true)
check("run: an older event number never moves 'last' back", applyEvent(applyEvent(emptyRun(), { type: "x", n: 9 }), { type: "x", n: 4 }).last === 9)
check("run: a stopped run says so", /Stopped/.test(run([{ type: "end", status: "stopped" }]).messages[0].text))

// ---- turn numbers, tools, cards
s = emptyRun()
s = { ...s, messages: [{ kind: "user", text: "do it" }] }
s = applyEvent(s, { type: "turn", turn: 3 })
check("turn: the number goes to the message that was just sent", s.messages[0].turn === 3)
s = applyEvent(s, { type: "tool_use", name: "Read", input: { file_path: "/srv/a.ts" } })
s = applyEvent(s, { type: "tool_use", name: "AskUserQuestion", input: { questions: [] } })
check("tools: a tool call is a line, the question tool is not", s.messages.filter((m) => m.kind === "tool").length === 1 && /^Read \{/.test(s.messages.find((m) => m.kind === "tool").text))
s = applyEvent(s, { type: "approval_request", requestId: "A1", toolName: "Bash", input: { command: "ls" }, always: "Bash(ls)" })
s = applyEvent(s, { type: "question", requestId: "Q1", questions: [{ question: "Which?", options: [{ label: "A" }] }] })
s = applyEvent(s, { type: "project_choice", envName: "Development", options: [{ id: "p", label: "P" }] }, "fix the bug")
check("cards: an approval, a question and a project choice each become a waiting card", s.messages.filter((m) => m.kind === "approval" && m.state === "waiting").length === 1 && s.messages.filter((m) => m.kind === "question" && m.state === "waiting").length === 1 && s.messages.find((m) => m.kind === "project").message === "fix the bug")
s = applyEvent(s, { type: "request_done", requestId: "A1", state: "approved" })
s = applyEvent(s, { type: "request_done", requestId: "Q1", state: "gone" })
check("cards: request_done closes the right card with the right state", s.messages.find((m) => m.kind === "approval").state === "approved" && s.messages.find((m) => m.kind === "question").state === "expired")

// ---- finishing
s = run([{ type: "run", runId: "r", n: 1 }, { type: "delta", text: "half" }, { type: "approval_request", requestId: "A2", toolName: "Bash", input: {} }, { type: "end", status: "done" }])
s = finishWatching(s)
check("finish: unfinished text is finished and an open card of an ended run is expired", s.messages[0].streaming === false && s.messages[1].state === "expired")
s = run([{ type: "run", runId: "r", n: 1 }, { type: "approval_request", requestId: "A3", toolName: "Bash", input: {} }])
check("finish: a card of a run that may still be going is left alone", finishWatching(s).messages[0].state === "waiting")
check("events: an error, a gap, a user message from another device, junk", run([{ type: "error", message: "boom" }]).messages[0].text === "Error: boom" && /too long/.test(run([{ type: "gap" }]).messages[0].text) && run([{ type: "user_message", text: "hi" }]).messages[0].kind === "user" && applyEvent(emptyRun(), null).messages.length === 0 && applyEvent(emptyRun(), { type: "nonsense" }).messages.length === 0)

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)
