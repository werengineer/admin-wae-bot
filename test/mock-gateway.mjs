// A fake gateway + fake login, to try the app screens without the real server:  node test/mock-gateway.mjs
// then start the app with EXPO_PUBLIC_GATEWAY_URL=http://localhost:8787 EXPO_PUBLIC_SUPABASE_URL=http://localhost:8787 EXPO_PUBLIC_SUPABASE_ANON_KEY=x
// Any email / password signs in. Nothing here touches the real bot, Supabase or any data.
import http from "node:http"

const PORT = Number(process.env.MOCK_PORT) || 8787
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json", ...cors }); res.end(JSON.stringify(body)) }
const sse = (res, events, { hold = false, after = 0 } = {}) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", ...cors })
  const out = events.map((ev, i) => ({ ...ev, n: i + 1 })).filter((ev) => ev.n > after)
  const tick = () => {
    const ev = out.shift()
    if (!ev) return hold ? undefined : res.end()
    res.write(`data: ${JSON.stringify(ev)}

`)
    setTimeout(tick, ev.type === "delta" ? 60 : 250)
  }
  tick()
}
const CHAT_EVENTS = [
  { type: "run", runId: "run-chat" },
  { type: "session", sessionId: "s-chat", projectName: "Academy Admin" },
  { type: "model", model: "claude-sonnet-5-5" },
  { type: "delta", text: "Looking at " }, { type: "delta", text: "the login page " }, { type: "delta", text: "now." },
  { type: "text", text: "Looking at the login page now." },
  { type: "tool_use", name: "Read", input: { file_path: "/srv/wae/repos/academy/app/login/page.tsx" } },
  { type: "approval_request", requestId: "req-1", toolName: "Bash", input: { command: "npm test" }, always: "Bash(npm test)" },
]

const meetings = [
  { id: "m1", name: "Weekly sync", source: "wispr-flow", receivedAt: new Date().toISOString(), unassigned: [], tasks: [
    { id: "t1", employee: "Ayush", task: "Fix the login redirect on the Academy admin page", project: "Academy Admin", deadline: "2026-11-08", priority: "High", kind: "development", status: "new", runId: "" },
    { id: "t2", employee: "Bhavya", task: "Prepare the LinkedIn post about the new course", project: "", deadline: "", priority: "Medium", kind: "marketing", status: "new", runId: "" },
    { id: "t3", employee: "Lokesh", task: "Ask the client for camera recordings", project: "", deadline: "", priority: "", kind: "other", status: "new", runId: "" },
    { id: "t4", employee: "Ayush", task: "Enable background runs", project: "Academy Admin", deadline: "", priority: "High", kind: "development", status: "started", runId: "run-7" },
  ] },
]
const sessions = [
  { id: "s1", envId: "dev", title: "Enable background runs", updatedAt: Date.now() - 600000, projectName: "Academy Admin", running: false, lastRunId: "run-7" },
  { id: "s2", envId: "dev", title: "Explain the meeting flow", updatedAt: Date.now() - 86400000 },
]

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x")
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end() }
  let body = ""
  req.on("data", (c) => (body += c)).on("end", () => {
    let b = {}
    try { b = JSON.parse(body || "{}") } catch {}
    const p = url.pathname
    // ---- fake Supabase login
    if (p === "/auth/v1/token") {
      const user = { id: "u1", aud: "authenticated", role: "authenticated", email: String(b.email || "admin@test.com"), email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
      return json(res, 200, { access_token: "mock-access", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "mock-refresh", user })
    }
    if (p === "/auth/v1/logout") { res.writeHead(204, cors); return res.end() }
    // ---- fake gateway
    if (!p.startsWith("/api/wae-bot/")) return json(res, 404, { error: "Not found." })
    if (req.headers.authorization !== "Bearer mock-access") return json(res, 401, { error: "Sign in as an admin." })
    const name = p.slice("/api/wae-bot/".length)
    console.log(`${req.method} ${name}`)
    switch (name) {
      case "environments": return json(res, 200, [{ id: "dev", name: "Development", default: true }, { id: "mkt", name: "Marketing" }])
      case "sessions": return json(res, 200, sessions)
      case "models": return json(res, 200, { models: [{ id: "claude-sonnet-5-5", label: "Sonnet 5.5", group: "main" }, { id: "claude-opus-5-5", label: "Opus 5.5", group: "main" }], efforts: [{ id: "default", label: "Default" }, { id: "low", label: "Fast" }] })
      case "integrations": return json(res, 200, { sheet: true, slack: true })
      case "meetings": return json(res, 200, { meetings, projects: [{ id: "academy", name: "Academy Admin" }, { id: "social", name: "WAE Social" }], marketing: true })
      case "session-messages": return json(res, 200, { items: [{ kind: "user", text: "Enable background runs" }, { kind: "bot", text: "Done. Background runs are on." }] })
      case "meeting-update": {
        const m = meetings.find((x) => x.id === b.meetingId)
        if (!m) return json(res, 404, { error: "No such meeting." })
        if (b.delete) m.tasks = m.tasks.filter((t) => t.id !== b.taskId)
        else if (b.add) m.tasks.push({ id: "t" + Date.now(), employee: "", project: "", deadline: "", priority: "", status: "new", runId: "", kind: "development", ...b.add })
        else if (b.patch) Object.assign(m.tasks.find((t) => t.id === b.taskId) || {}, b.patch)
        return json(res, 200, { ok: true })
      }
      case "meeting-task-start": {
        const t = meetings[0].tasks.find((x) => x.id === b.taskId)
        if (t) { t.status = "started"; t.runId = "run-new" }
        sessions.unshift({ id: "s-new", envId: "dev", title: t?.task || "task", updatedAt: Date.now(), running: true, runId: "run-new", projectName: t?.project })
        return json(res, 200, { ok: true, runId: "run-new" })
      }
      case "allow-rules": return json(res, 200, { rules: [{ id: "r1", label: "Always allow npm test", cwd: "/srv/wae/repos/academy" }] })
      case "allow-rules/delete": return json(res, 200, { ok: true })
      case "product-updates": return json(res, 200, { days: b.days, text: "**This week**\n\n- Login redirect fixed on the Academy admin page\n- Background runs are on\n\nRun `npm test` before you deploy.", repos: [{ repo: "academy", commits: 12 }, { repo: "social", commits: 0, note: "no changes" }] })
      case "publish": return json(res, 200, { sheet: { status: "skipped", message: "not set up" }, slack: { status: "sent" } })
      case "approve": return json(res, 200, { ok: true })
      case "run-stop": return json(res, 200, { ok: true })
      case "chat": return sse(res, CHAT_EVENTS, { hold: true })
      case "run-events": return b.runId === "run-chat" ? sse(res, CHAT_EVENTS, { hold: true, after: Number(b.after) || 0 }) : json(res, 404, { error: "No such run." })
      default: return json(res, 404, { error: "Not found." })
    }
  })
}).listen(PORT, () => console.log(`mock gateway on http://localhost:${PORT}`))
