// All the logic of the chat tab: environments, recent chats, sending a message, watching a run (and joining it again when the stream is lost),
// approvals and questions. The rules of the events are in chat-state.ts (tested); this file is the plumbing around them.
// A run is written by a job on the bot server that goes on when the app is closed or in the background: the app only watches it.
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import { confirm, tell } from "./confirm"
import { call, errorOf, type ApiResponse } from "./api"
import { applyEvent, emptyRun, finishWatching, type Msg, type RunState } from "./chat-state"
import { createSseParser } from "./stream"
import { toast } from "./toast"

export type Env = { id: string; name: string; github?: string; default?: boolean }
export type SessionRow = { id: string; envId: string; title: string; updatedAt: number; projectName?: string; running?: boolean; runId?: string; lastRunId?: string }
export type ModelOption = { id: string; label: string; hint?: string; group?: "main" | "more" | "hidden"; needsCredits?: boolean }
export type EffortOption = { id: string; label: string; hint?: string }
export type AllowRule = { id: string; label: string; cwd: string }

const PREF_AUTO = "wae-bot-auto-allow"
const PREF_MODEL = "wae-bot-model"
const PREF_EFFORT = "wae-bot-effort"
export const PREF_OPEN_CHAT = "wae-bot-open-chat" // the chat that was open: it is opened again when the app starts (the web page does this through ?chat=<id>)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useBot() {
  const [envs, setEnvs] = useState<Env[]>([])
  const [envId, setEnvId] = useState("")
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loadError, setLoadError] = useState("")
  const [rs, setRs] = useState<RunState>(emptyRun())
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [rules, setRules] = useState<AllowRule[]>([])
  // "Thinking…" only shows after 3 quiet seconds, so quick answers do not flicker
  const [activity, setActivity] = useState(0)
  const [quiet, setQuiet] = useState(false)

  const [autoAllow, setAutoAllowState] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [efforts, setEfforts] = useState<EffortOption[]>([])
  const [modelId, setModelIdState] = useState("default")
  const [effortId, setEffortIdState] = useState("default")

  // the run state is also kept in a ref, so the stream reader always works on the newest state
  const rsRef = useRef<RunState>(rs)
  const update = useCallback((fn: (s: RunState) => RunState) => {
    rsRef.current = fn(rsRef.current)
    setRs(rsRef.current)
  }, [])
  const tokenRef = useRef(0) // which watching is the current one; an older one lets go
  const abortRef = useRef<AbortController | null>(null)
  const readerRef = useRef<{ cancel: () => Promise<void> } | null>(null)
  const openingId = useRef<string | null>(null)

  // ---- remembered choices
  useEffect(() => {
    AsyncStorage.getItem(PREF_AUTO).then((v) => setAutoAllowState(v === "1")).catch(() => {})
  }, [])
  // each choice says when it starts to count, like the toasts of the web page
  const setAutoAllow = (on: boolean) => {
    setAutoAllowState(on)
    AsyncStorage.setItem(PREF_AUTO, on ? "1" : "0").catch(() => {})
    toast.info(on ? "Auto-allow is on from your next message" : "Auto-allow is off from your next message")
  }
  const setModelId = (id: string) => {
    setModelIdState(id)
    AsyncStorage.setItem(PREF_MODEL, id).catch(() => {})
    toast.info(`${models.find((m) => m.id === id)?.label || id} is used from your next message`)
  }
  const setEffortId = (id: string) => {
    setEffortIdState(id)
    AsyncStorage.setItem(PREF_EFFORT, id).catch(() => {})
    toast.info(`Speed ${efforts.find((e) => e.id === id)?.label || id} is used from your next message`)
  }

  // ---- first load
  const loadSessions = useCallback(async () => {
    try {
      const res = await call("sessions")
      if (res.ok) setSessions(await res.json())
    } catch {
    } finally {
      setSessionsLoaded(true)
    }
  }, [])

  // "Always allow" rules, per project folder (the server decides what may be remembered)
  const loadAllowRules = useCallback(async () => {
    try {
      const res = await call("allow-rules")
      if (res.ok) setRules(((await res.json()) as { rules?: AllowRule[] }).rules || [])
    } catch {}
  }, [])
  useEffect(() => {
    loadAllowRules()
  }, [loadAllowRules])

  const removeRule = (rule: AllowRule) =>
    confirm("Stop always allowing this?", rule.label, "Remove", async () => {
      try {
        const res = await call("allow-rules/delete", { body: { id: rule.id } })
        if (!res.ok) throw new Error(await errorOf(res))
        setRules((list) => list.filter((r) => r.id !== rule.id))
      } catch (e: any) {
        toast.error(e?.message || "Could not remove the rule.")
      }
    }, true)

  useEffect(() => {
    setQuiet(false)
    if (!busy) return
    const timer = setTimeout(() => setQuiet(true), 3000)
    return () => clearTimeout(timer)
  }, [busy, activity])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await call("environments")
        if (!res.ok) return setLoadError(await errorOf(res))
        const list: Env[] = await res.json()
        setEnvs(list)
        setEnvId((list.find((e) => e.default) || list[0])?.id || "")
        setLoadError("")
        loadSessions()
      } catch (e: any) {
        setLoadError(e?.message || "Could not reach the server.")
      }
    })()
    ;(async () => {
      try {
        const res = await call("models")
        if (!res.ok) return // an older bot server has no model list
        const body: any = await res.json()
        const list: ModelOption[] = Array.isArray(body?.models) ? body.models : []
        const effortList: EffortOption[] = Array.isArray(body?.efforts) ? body.efforts : []
        setModels(list)
        setEfforts(effortList)
        const savedModel = (await AsyncStorage.getItem(PREF_MODEL).catch(() => null)) || ""
        const savedEffort = (await AsyncStorage.getItem(PREF_EFFORT).catch(() => null)) || ""
        const offered = list.filter((m) => m.group !== "hidden")
        setModelIdState(offered.some((m) => m.id === savedModel) ? savedModel : offered.find((m) => m.id === "claude-sonnet-5-5")?.id || offered[0]?.id || "default")
        setEffortIdState(effortList.some((e) => e.id === savedEffort) ? savedEffort : "default")
      } catch {}
    })()
  }, [loadSessions])

  // the chat list is refreshed now and then, so a chat that is answering shows its dot and a finished one loses it
  useEffect(() => {
    const t = setInterval(() => {
      if (AppState.currentState === "active") loadSessions()
    }, 10000)
    return () => clearInterval(t)
  }, [loadSessions])

  // ---- watching a run
  const detach = useCallback(() => {
    tokenRef.current++
    abortRef.current?.abort()
    abortRef.current = null
    readerRef.current?.cancel().catch(() => {})
    setBusy(false)
  }, [])

  // read one stream until it ends. A stream that is silent for 35 s (the server pings every 10 s) is dead and is let go.
  const readStream = async (res: ApiResponse, token: number, sent: string) => {
    const reader = res.body!.getReader()
    readerRef.current = reader
    const decoder = new TextDecoder()
    let lastByte = Date.now()
    const watchdog = setInterval(() => {
      if (Date.now() - lastByte > 35000) reader.cancel().catch(() => {})
    }, 10000)
    const parser = createSseParser((ev) => {
      if (tokenRef.current !== token) return
      setOpening(false)
      setActivity((n) => n + 1)
      update((s) => applyEvent(s, ev, sent))
    })
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        lastByte = Date.now()
        if (tokenRef.current !== token) {
          reader.cancel().catch(() => {})
          return
        }
        parser.push(decoder.decode(value, { stream: true }))
      }
    } finally {
      clearInterval(watchdog)
      if (readerRef.current === reader) readerRef.current = null
    }
  }

  const addBot = (text: string) => update((s) => ({ ...s, messages: [...s.messages, { kind: "bot", text }] }))

  // join the run again after a stream was lost; gives up when the server does not know the run any more, or after a few minutes
  const rejoin = async (ctl: AbortController, token: number): Promise<ApiResponse | null> => {
    for (let attempt = 0; attempt < 40; attempt++) {
      await sleep(Math.min(500 * (attempt + 1), 5000))
      if (ctl.signal.aborted || tokenRef.current !== token) return null
      try {
        const res = await call("run-events", { body: { runId: rsRef.current.jobId, after: rsRef.current.last }, signal: ctl.signal })
        if (res.status === 404) {
          update((s) => ({ ...s, ended: true }))
          addBot("The server no longer has this run (it may have been restarted). Send a message to carry on in this chat.")
          return null
        }
        if (res.ok && res.body) return res
      } catch {
        if (ctl.signal.aborted) return null
      }
    }
    addBot("Lost the connection to the server. Open this chat again from Chats to join the run.")
    return null
  }

  const follow = async (first: ApiResponse, ctl: AbortController, token: number, sent: string) => {
    let res: ApiResponse | null = first
    while (res) {
      try {
        await readStream(res, token, sent)
      } catch (e) {
        if (ctl.signal.aborted || tokenRef.current !== token) throw e
        // a network error in the middle of a stream is not the end of the run: join it again
      }
      if (tokenRef.current !== token || ctl.signal.aborted) return
      if (rsRef.current.ended || !rsRef.current.jobId) return
      res = await rejoin(ctl, token)
    }
  }

  const afterWatching = (ctl: AbortController, token: number) => {
    if (tokenRef.current !== token) return
    setOpening(false)
    if (abortRef.current === ctl) abortRef.current = null
    update(finishWatching)
    setBusy(false)
    loadSessions()
  }

  // a phone that comes back from sleep or from another app: the stream may be dead without anyone knowing. Let it go,
  // so the watching joins the run again from the last event.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && rsRef.current.jobId && !rsRef.current.ended) readerRef.current?.cancel().catch(() => {})
    })
    return () => sub.remove()
  }, [])

  // ---- actions
  // rewindTo = the turn of an edited message: the chat goes back to just before it (the server forks a new session there)
  // fresh = start a brand-new chat even if another chat is open
  const run = async (message: string, projectId?: string, rewindTo?: number, fresh?: boolean) => {
    const token = ++tokenRef.current
    abortRef.current?.abort()
    setBusy(true)
    const ctl = new AbortController()
    abortRef.current = ctl
    update((s) => ({ ...s, jobId: null, last: 0, ended: false }))
    try {
      const res = await call("chat", {
        body: { message, envId, sessionId: fresh ? null : rsRef.current.sessionId, projectId, rewindTo, autoAllow, model: modelId, effort: effortId },
        signal: ctl.signal,
      })
      if (!res.ok || !res.body) throw new Error(await errorOf(res))
      await follow(res, ctl, token, message)
    } catch (e: any) {
      if (tokenRef.current === token) {
        if (e?.name === "AbortError" || ctl.signal.aborted) {
          if (!rsRef.current.ended) addBot("Stopped. Send a message to carry on in this chat.")
        } else addBot(`Error: ${e?.message || "Could not reach the server."}`)
      }
    } finally {
      afterWatching(ctl, token)
    }
  }

  const send = (text: string) => {
    const message = text.trim()
    if (!message || busy || !envId) return false
    update((s) => ({ ...s, messages: [...s.messages, { kind: "user", text: message }] }))
    run(message)
    return true
  }

  // Send an edited message. If the server knows this message's turn, the chat goes BACK to it: this message and everything after it are
  // dropped and the answer is made again from there (a new session; the old one stays in Recents). Without a turn (an old chat) it goes on
  // as a NEW message, and before anything was answered it simply starts again.
  const sendEdited = (index: number, text: string) => {
    const message = text.trim()
    if (!message || busy) return false
    const edited = rsRef.current.messages[index]
    const turn = edited && edited.kind === "user" ? edited.turn : undefined
    if (rsRef.current.sessionId && turn !== undefined) {
      update((s) => ({ ...s, messages: [...s.messages.slice(0, index), { kind: "user", text: message }] }))
      run(message, undefined, turn)
    } else {
      if (rsRef.current.sessionId) update((s) => ({ ...s, messages: [...s.messages, { kind: "user", text: message }] }))
      else update((s) => ({ ...s, messages: [{ kind: "user", text: message }] }))
      run(message)
    }
    return true
  }

  // join a run that is already going (a chat opened from the list while its answer is still being written)
  const attachRun = async (runId: string) => {
    const token = ++tokenRef.current
    abortRef.current?.abort()
    setBusy(true)
    const ctl = new AbortController()
    abortRef.current = ctl
    update((s) => ({ ...s, jobId: runId, last: 0, ended: false }))
    try {
      const res = await call("run-events", { body: { runId, after: 0 }, signal: ctl.signal })
      if (res.status === 404) update((s) => ({ ...s, ended: true })) // it ended and was forgotten; the history shows the result
      else if (!res.ok || !res.body) throw new Error(await errorOf(res))
      else await follow(res, ctl, token, "")
    } catch (e: any) {
      if (tokenRef.current === token && !(e?.name === "AbortError" || ctl.signal.aborted)) addBot(`Error: ${e?.message || "Could not reach the server."}`)
    } finally {
      afterWatching(ctl, token)
    }
  }

  const newChat = () => {
    detach() // the chat that was open keeps answering on the server; the app just stops watching it
    openingId.current = null
    setOpening(false)
    update(() => emptyRun())
  }

  const openSession = async (s: SessionRow) => {
    detach()
    setEnvId(s.envId)
    openingId.current = s.id
    update(() => ({ ...emptyRun(), sessionId: s.id, projectName: s.projectName || "" }))
    setOpening(true)
    const resumed: Msg = { kind: "bot", text: "Session resumed. Your next message continues this conversation." }
    try {
      const res = await call("session-messages", { body: { id: s.id } })
      if (!res.ok) throw new Error(await errorOf(res))
      const body: any = await res.json()
      if (openingId.current !== s.id) return
      const items: Msg[] = Array.isArray(body.items) ? body.items : []
      const running = typeof body.runId === "string" ? body.runId : ""
      update((st) => ({ ...st, messages: items.length ? items : running ? [] : [resumed] }))
      if (running) attachRun(running)
      else setOpening(false)
    } catch {
      if (openingId.current !== s.id) return
      update((st) => ({ ...st, messages: [resumed] }))
      setOpening(false)
    }
  }

  // open the chat of a meeting task that was started (found through the run id the task keeps)
  const chatOfRun = (runId: string) => sessions.find((s) => s.runId === runId || s.lastRunId === runId)

  // Stop: the server stops the run and closes its cards; its "end" event then arrives on the stream. If it does not, we let go after 4 s.
  const stop = async () => {
    const id = rsRef.current.jobId
    const ctl = abortRef.current
    if (!id) return ctl?.abort()
    try {
      await call("run-stop", { body: { runId: id } })
    } catch {}
    setTimeout(() => {
      if (abortRef.current === ctl && !rsRef.current.ended) ctl?.abort()
    }, 4000)
  }

  const expireCard = (requestId: string) => {
    update((s) => ({ ...s, messages: s.messages.map((x) => ((x.kind === "approval" || x.kind === "question") && x.requestId === requestId ? { ...x, state: "expired" } : x)) }))
    toast.error('This request is no longer active. Send a message (for example "continue") to carry on in this chat.')
  }

  const decide = async (requestId: string, allow: boolean, always = false) => {
    try {
      const res = await call("approve", { body: { requestId, allow, ...(always ? { always: true } : {}) } })
      if (res.status === 404) return expireCard(requestId)
      if (!res.ok) throw new Error(await errorOf(res))
      update((s) => ({ ...s, messages: s.messages.map((x) => (x.kind === "approval" && x.requestId === requestId ? { ...x, state: allow ? "approved" : "denied" } : x)) }))
      if (always) loadAllowRules()
    } catch (e: any) {
      toast.error(e?.message || "Could not send your decision.")
    }
  }

  const answerQuestion = async (requestId: string, answers: Record<string, string>) => {
    try {
      const res = await call("approve", { body: { requestId, allow: true, answers } })
      if (res.status === 404) return expireCard(requestId)
      if (!res.ok) throw new Error(await errorOf(res))
      update((s) => ({ ...s, messages: s.messages.map((x) => (x.kind === "question" && x.requestId === requestId ? { ...x, state: "answered", answers } : x)) }))
    } catch (e: any) {
      toast.error(e?.message || "Could not send your answer.")
    }
  }

  // "which project?": the chat starts inside that project's folder on the server
  const chooseProject = (index: number, message: string, id: string, label: string) => {
    if (busy) return
    update((s) => ({
      ...s,
      projectName: label,
      messages: s.messages.map((x, i) => (i === index && x.kind === "project" ? { ...x, state: "chosen", chosen: label } : x)),
    }))
    run(message, id)
  }

  const deleteChat = (s: SessionRow) => {
    if (busy && s.id === rsRef.current.sessionId) return toast.error("Wait until the answer is finished, then delete this chat.")
    confirm("Delete chat", `Delete the chat "${s.title}"? This cannot be undone.`, "Delete", async () => {
      try {
        const res = await call("delete-session", { body: { id: s.id } })
        if (!res.ok) throw new Error(await errorOf(res))
        setSessions((list) => list.filter((x) => x.id !== s.id))
        if (s.id === rsRef.current.sessionId) newChat()
        toast.info("Chat deleted")
      } catch (e: any) {
        toast.error(e?.message || "Could not delete the chat.")
      }
    }, true)
  }

  // the app starts: the chat that was open when it was closed is opened again (the web page does this after a reload, through ?chat=<id>)
  const restored = useRef(false)
  useEffect(() => {
    if (!sessionsLoaded || restored.current) return
    restored.current = true
    AsyncStorage.getItem(PREF_OPEN_CHAT)
      .then((id) => {
        if (!id || rsRef.current.sessionId) return
        const row = sessions.find((x) => x.id === id)
        if (row) openSession(row)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsLoaded, sessions])
  useEffect(() => {
    if (!restored.current) return
    if (rs.sessionId) AsyncStorage.setItem(PREF_OPEN_CHAT, rs.sessionId).catch(() => {})
    else AsyncStorage.removeItem(PREF_OPEN_CHAT).catch(() => {})
  }, [rs.sessionId])

  // the screen is closed: let go of the watching (the run itself goes on)
  useEffect(() => () => detach(), [detach])

  return {
    envs, envId, setEnvId, sessions, loadSessions, loadError,
    messages: rs.messages, sessionId: rs.sessionId, projectName: rs.projectName, usedModel: rs.usedModel,
    busy, opening,
    autoAllow, setAutoAllow, models, efforts, modelId, setModelId, effortId, setEffortId,
    send, sendEdited, stop, newChat, openSession, chatOfRun, decide, answerQuestion, chooseProject, deleteChat,
    sessionsLoaded, rules, removeRule, quiet,
    waitingOnYou: rs.messages.some((m) => (m.kind === "approval" || m.kind === "question") && m.state === "waiting"),
  }
}

export type Bot = ReturnType<typeof useBot>
