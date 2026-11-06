// What a chat looks like after each event of a run. The same rules as the Admin WAE Bot web page (app/page.tsx), kept pure so they can be tested.
// No imports on purpose: it is tested with plain node (test/stream-and-chat.test.mjs).

export type QOption = { label: string; description?: string }
export type QItem = { question: string; header?: string; multiSelect?: boolean; options: QOption[] }
export type ProjectOption = { id: string; label: string; description?: string }

export type Msg =
  | { kind: "user"; text: string; turn?: number }
  | { kind: "bot"; text: string; streaming?: boolean }
  | { kind: "tool"; text: string }
  | { kind: "approval"; requestId: string; toolName: string; input: unknown; always?: string | null; state: "waiting" | "approved" | "denied" | "expired" }
  | { kind: "question"; requestId: string; questions: QItem[]; state: "waiting" | "answered" | "expired"; answers?: Record<string, string> }
  | { kind: "project"; envName: string; options: ProjectOption[]; message: string; state: "waiting" | "chosen"; chosen?: string }

export type RunState = {
  messages: Msg[]
  jobId: string | null // the run on the server that is being watched
  last: number // the number of the last event seen: a lost stream is joined again from there
  ended: boolean
  sessionId: string | null
  projectName: string
  usedModel: string
}

export function emptyRun(): RunState {
  return { messages: [], jobId: null, last: 0, ended: false, sessionId: null, projectName: "", usedModel: "" }
}

const addBot = (s: RunState, text: string): RunState => ({ ...s, messages: [...s.messages, { kind: "bot", text }] })

// one event of a run; `sent` is the message that started this watching (it is needed for the "which project?" card)
export function applyEvent(s: RunState, ev: any, sent = ""): RunState {
  if (!ev || typeof ev !== "object") return s
  let next: RunState = s
  if (typeof ev.n === "number" && ev.n > s.last) next = { ...next, last: ev.n }
  const m = next.messages
  switch (ev.type) {
    case "run":
      return { ...next, jobId: String(ev.runId || "") || null }
    case "end": {
      const done = { ...next, ended: true }
      return ev.status === "stopped" ? addBot(done, "Stopped. Send a message to carry on in this chat.") : done
    }
    case "gap":
      return addBot(next, "Part of the earlier output was too long to replay here. Open this chat again from Recents to see all of it.")
    // the message of a turn that was sent before this screen joined (a reload, another device)
    case "user_message":
      return { ...next, messages: [...m, { kind: "user", text: String(ev.text || "") }] }
    case "session":
      return { ...next, sessionId: ev.sessionId ?? next.sessionId, projectName: ev.projectName || next.projectName }
    case "model":
      return { ...next, usedModel: String(ev.model || "") }
    case "project_choice":
      return { ...next, messages: [...m, { kind: "project", envName: ev.envName, options: ev.options, message: sent, state: "waiting" }] }
    case "question":
      return { ...next, messages: [...m, { kind: "question", requestId: ev.requestId, questions: ev.questions, state: "waiting" }] }
    case "turn": {
      // the server numbers the turn of the message just sent, so that message can be edited later
      let at = -1
      m.forEach((x, j) => {
        if (x.kind === "user" && x.turn === undefined) at = j
      })
      return at < 0 ? next : { ...next, messages: m.map((x, j) => (j === at && x.kind === "user" ? { ...x, turn: ev.turn } : x)) }
    }
    // words as they are written; the finished block (type "text") then replaces them
    case "delta": {
      const last = m[m.length - 1]
      if (last && last.kind === "bot" && last.streaming) return { ...next, messages: [...m.slice(0, -1), { ...last, text: last.text + String(ev.text ?? "") }] }
      return { ...next, messages: [...m, { kind: "bot", text: String(ev.text ?? ""), streaming: true }] }
    }
    case "text": {
      const last = m[m.length - 1]
      const done: Msg = { kind: "bot", text: String(ev.text ?? "") }
      return { ...next, messages: last && last.kind === "bot" && last.streaming ? [...m.slice(0, -1), done] : [...m, done] }
    }
    case "tool_use":
      // the question card already shows an AskUserQuestion call, so it gets no tool line
      if (ev.name === "AskUserQuestion") return next
      return { ...next, messages: [...m, { kind: "tool", text: `${ev.name} ${JSON.stringify(ev.input ?? {}).slice(0, 200)}` }] }
    case "approval_request":
      return { ...next, messages: [...m, { kind: "approval", requestId: ev.requestId, toolName: ev.toolName, input: ev.input, always: ev.always || null, state: "waiting" }] }
    // a card was answered somewhere else, or closed because the run ended
    case "request_done":
      return {
        ...next,
        messages: m.map((x) => {
          if (x.kind === "approval" && x.requestId === ev.requestId && x.state === "waiting")
            return { ...x, state: ev.state === "approved" ? "approved" : ev.state === "denied" ? "denied" : "expired" }
          if (x.kind === "question" && x.requestId === ev.requestId && x.state === "waiting") return { ...x, state: ev.state === "answered" ? "answered" : "expired" }
          return x
        }),
      }
    case "error":
      return addBot(next, `Error: ${ev.message}`)
    default:
      return next
  }
}

// what is left to do when watching is over: unfinished text is finished, and cards of a run that has ended can no longer be answered
export function finishWatching(s: RunState): RunState {
  const over = s.ended || !s.jobId
  return {
    ...s,
    messages: s.messages.map((x) => {
      if (x.kind === "bot" && x.streaming) return { ...x, streaming: false }
      if (over && (x.kind === "approval" || x.kind === "question") && x.state === "waiting") return { ...x, state: "expired" }
      return x
    }),
  }
}

// the first line of a tool call for people: "Read /srv/x/app.ts"
export function toolSummary(text: string): string {
  return text.length > 160 ? text.slice(0, 157) + "…" : text
}
