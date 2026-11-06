// Meeting notes: meetings arrive by themselves (Wispr Flow), already split into tasks, each labelled Development / Marketing / Other.
// Nothing starts by itself: work starts only when "Do it with WAE Bot" is pressed on a task. Same as the web page (components/wae-bot/meetings-panel.tsx):
// same texts, same rules for the buttons, same values sent to the server. The web page edits type, project, deadline and priority in the cells of a
// table; on a phone the pencil of a task opens one window for all of them.
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react-native"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { call, errorOf } from "../api"
import { confirm } from "../confirm"
import { processMeetings } from "../meeting-check"
import { Banner, Btn, Chip, Field, IconBtn, s } from "../components/ui"
import { radius, useTheme, type Theme } from "../theme"
import { toast } from "../toast"
import type { Bot } from "../use-bot"
import type { usePublish } from "../use-publish"

type Kind = "development" | "marketing" | "other"
type Task = { id: string; employee: string; task: string; project: string; deadline: string; priority: string; kind: Kind; status: "new" | "started"; runId: string }
type Meeting = { id: string; name: string; source: string; receivedAt: string; tasks: Task[]; unassigned: string[] }
type Project = { id: string; name: string }

const KIND_LABEL: Record<Kind, string> = { development: "Development", marketing: "Marketing", other: "Other" }
const PRIORITIES = ["high", "medium", "low"] // the same values as the web page (they are stored and sent to the Sheet as they are)
const SOURCE: Record<string, string> = { "wispr-flow": "Wispr Flow", pasted: "Pasted", inbox: "Automation" }
const SEEN_KEY = "wae-bot-meetings-seen"
const TASK_LIMIT = 600

function kindColors(t: Theme, k: Kind) {
  return k === "development" ? { fg: t.blue, bg: t.blueBg, border: t.blueBorder } : k === "marketing" ? { fg: t.orange, bg: t.orangeBg, border: t.orangeBorder } : { fg: t.mutedFg, bg: t.muted, border: t.border }
}

// Why "Do it with WAE Bot" cannot be pressed yet (empty = it can)
function whyNot(t: Task, marketing: boolean): string {
  if (t.kind === "other") return "Set the type to Development or Marketing first."
  if (t.kind === "development" && !t.project) return "Choose a project first."
  if (t.kind === "marketing" && !marketing) return "There is no Marketing folder on the server."
  if (!t.task.trim()) return "Write the task first."
  return ""
}

function whenText(iso: string): string {
  const d = new Date(iso)
  try {
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return d.toLocaleString("en-IN")
  }
}

export function MeetingsScreen({
  bot,
  pub,
  active,
  openChat,
  onUnread,
  showTab,
}: {
  bot: Bot
  pub: ReturnType<typeof usePublish>
  active: boolean
  openChat: (runId: string) => void
  onUnread: (n: number) => void
  showTab: () => void // opens this tab (the "Open" of a toast on another tab)
}) {
  const t = useTheme()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [marketing, setMarketing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<{ meetingId: string; task: Task } | null>(null)
  const [pasting, setPasting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [seenAt, setSeenAt] = useState(0)
  const [starting, setStarting] = useState<Set<string>>(new Set())
  // many meetings pile up (one per day): the newest and the ones not seen yet are open, the others are folded to one line; a tap on the name folds / opens
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})
  const openedToast = useRef(false)

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        const saved = Number(v)
        if (saved) setSeenAt(saved)
        else {
          const now = Date.now()
          AsyncStorage.setItem(SEEN_KEY, String(now)).catch(() => {})
          setSeenAt(now)
        }
      })
      .catch(() => setSeenAt(Date.now()))
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await call("meetings")
      if (!res.ok) return setError(await errorOf(res))
      const body: any = await res.json()
      const list: Meeting[] = Array.isArray(body.meetings) ? body.meetings : []
      setMeetings(list)
      setProjects(Array.isArray(body.projects) ? body.projects : [])
      setMarketing(!!body.marketing)
      setError("")
      // a meeting that arrived while the app is open: a system notification (the phone shows it as a banner), a toast on any tab, and the badge on
      // the tab. The same list of "already seen" meetings is used by the background task, so one meeting is announced once.
      const arrived = await processMeetings(list)
      if (arrived.length) {
        const names = arrived.map((m) => `${m.name} (${m.tasks.length} tasks)`).join(", ")
        toast.info(`New meeting notes: ${names}. Open Meeting notes to check the tasks.`, { ms: 20000, action: { label: "Open", run: showTab } })
      }
    } catch (e: any) {
      setError(e?.message || "Could not reach the server.")
    } finally {
      setLoaded(true)
    }
  }, [showTab])

  useEffect(() => {
    load()
    const timer = setInterval(() => AppState.currentState === "active" && load(), 15000)
    return () => clearInterval(timer)
  }, [load])

  const unreadIds = new Set(meetings.filter((m) => m.source !== "pasted" && Date.parse(m.receivedAt) > seenAt).map((m) => m.id))
  useEffect(() => onUnread(unreadIds.size), [unreadIds.size, onUnread]) // eslint-disable-line react-hooks/exhaustive-deps

  // the app was opened and meetings came in while it was closed: say so once, with a way to open them (like the page does when it opens)
  useEffect(() => {
    if (!loaded || !seenAt || openedToast.current) return
    openedToast.current = true
    const n = unreadIds.size
    if (n > 0 && !active) toast.info(`${n} new meeting${n === 1 ? "" : "s"} waiting in Meeting notes`, { ms: 20000, action: { label: "Open", run: showTab } })
  }, [loaded, seenAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // looking at the tab for a few seconds counts as seen
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      const now = Date.now()
      setSeenAt(now)
      AsyncStorage.setItem(SEEN_KEY, String(now)).catch(() => {})
    }, 4000)
    return () => clearTimeout(timer)
  }, [active, meetings.length])

  // one call to the server, then the list is read again; the answer (or null after an error toast) is returned
  const send = async (path: string, body: object, fail: string): Promise<any | null> => {
    try {
      const res = await call(path, { body })
      if (!res.ok) throw new Error(await errorOf(res))
      const json = await res.json().catch(() => ({}))
      await load()
      return json ?? {}
    } catch (e: any) {
      toast.error(e?.message || fail)
      return null
    }
  }

  const start = async (m: Meeting, task: Task) => {
    if (whyNot(task, marketing) || starting.has(task.id)) return
    setStarting((prev) => new Set(prev).add(task.id))
    const ok = await send("meeting-task-start", { meetingId: m.id, taskId: task.id, model: bot.modelId, effort: bot.effortId, autoAllow: bot.autoAllow }, "Could not start this task.")
    setStarting((prev) => {
      const next = new Set(prev)
      next.delete(task.id)
      return next
    })
    if (ok) {
      toast.info("Started in the background. It is in Recents (the dot shows it is answering).")
      // the chat shows up in Recents a moment after it starts
      setTimeout(bot.loadSessions, 3000)
      setTimeout(bot.loadSessions, 8000)
    }
  }
  const removeTask = (m: Meeting, task: Task) =>
    confirm("Remove task", "Remove this task from the list?", "Remove", () => void send("meeting-update", { meetingId: m.id, taskId: task.id, delete: true }, "Could not remove the task."), true)
  const removeMeeting = (m: Meeting) => {
    const started = m.tasks.filter((x) => x.status === "started").length
    confirm(
      "Remove meeting",
      `Remove "${m.name}" from the list?${started ? ` ${started} task(s) of it were started; their chats stay in Recents.` : ""}`,
      "Remove",
      () => void send("meeting-update", { meetingId: m.id, removeMeeting: true }, "Could not remove the meeting."),
      true,
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={{ color: t.fg, fontSize: 24, fontWeight: "600", letterSpacing: -0.4 }}>Meeting notes</Text>
          <Btn small variant="outline" label="Paste notes by hand" onPress={() => setPasting(true)} />
        </View>
        <Banner tone="error" text={error} />
        {!loaded ? <Text style={{ color: t.mutedFg, fontSize: 14 }}>Loading meetings…</Text> : null}
        {loaded && meetings.length === 0 && !error ? (
          <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: t.border, borderRadius: radius.lg, padding: 28 }}>
            <Text style={{ color: t.mutedFg, fontSize: 14, textAlign: "center" }}>No meetings yet. After your next Wispr Flow meeting ends, its tasks show up here.</Text>
          </View>
        ) : null}

        {meetings.map((m, index) => {
          const started = m.tasks.filter((x) => x.status === "started").length
          const open = openIds[m.id] ?? (index === 0 || unreadIds.has(m.id))
          const Chevron = open ? ChevronDown : ChevronRight
          return (
            <View key={m.id} style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.card, borderRadius: radius.lg, padding: 14, gap: 12 }}>
              <View style={s.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={open ? "Fold this meeting" : "Open this meeting"}
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenIds((prev) => ({ ...prev, [m.id]: !open }))}
                  style={{ flex: 1, gap: 4 }}
                >
                  <View style={s.row}>
                    <Chevron size={18} color={t.mutedFg} />
                    {unreadIds.has(m.id) ? <View accessibilityLabel="New" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary }} /> : null}
                    <Text numberOfLines={open ? 2 : 1} style={{ flex: 1, color: t.fg, fontWeight: "600", fontSize: 16 }}>{m.name}</Text>
                  </View>
                  <Text style={{ color: t.mutedFg, fontSize: 12, paddingLeft: 26 }}>
                    {SOURCE[m.source] || m.source} · {whenText(m.receivedAt)} · {m.tasks.length} tasks{started ? `, ${started} started` : ""}
                  </Text>
                </Pressable>
                <IconBtn label="Remove this meeting" onPress={() => removeMeeting(m)}><Trash2 size={16} color={t.mutedFg} /></IconBtn>
              </View>
              {open ? <>

              {m.tasks.map((task) => {
                const kc = kindColors(t, task.kind)
                const chat = task.runId ? bot.chatOfRun(task.runId) : undefined
                const blocked = whyNot(task, marketing)
                const busy = starting.has(task.id)
                return (
                  <View key={task.id} style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 12, gap: 8 }}>
                    <View style={s.wrap}>
                      <Text style={{ color: kc.fg, backgroundColor: kc.bg, borderColor: kc.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, fontWeight: "600", overflow: "hidden" }}>{KIND_LABEL[task.kind]}</Text>
                      {task.kind === "development" && task.project ? <Pill text={task.project} /> : null}
                      {task.kind === "marketing" ? <Pill text="Marketing folder" /> : null}
                      {task.priority ? <Pill text={task.priority} /> : null}
                      {task.deadline ? <Pill text={`Due ${task.deadline}`} /> : null}
                    </View>
                    <Text selectable style={{ color: t.fg, fontSize: 15, lineHeight: 22 }}>{task.task}</Text>
                    {task.status === "started" ? (
                      <View style={{ gap: 6 }}>
                        <View style={s.row}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primary }} />
                          <Text style={{ color: t.primary, fontSize: 13, fontWeight: "500" }}>Started in background</Text>
                        </View>
                        <View style={[s.row, { flexWrap: "wrap" }]}>
                          <Btn small variant="outline" label="Open chat" disabled={!chat} onPress={() => openChat(task.runId)} />
                          {!chat ? <Text style={{ color: t.mutedFg, fontSize: 11, flexShrink: 1 }}>The chat shows up in Recents in a few seconds</Text> : null}
                        </View>
                      </View>
                    ) : (
                      <View style={{ gap: 6 }}>
                        {/* one row across the full width: the start button takes what the two icons leave */}
                        <View style={[s.row, { gap: 8 }]}>
                          <Btn small label={busy ? "Starting…" : "Do it with WAE Bot"} disabled={busy || !!blocked} onPress={() => start(m, task)} style={{ flex: 1 }} />
                          <IconBtn label="Edit this task" onPress={() => setEditing({ meetingId: m.id, task })} style={{ borderWidth: 1, borderColor: t.border, padding: 9 }}><Pencil size={17} color={t.fg} /></IconBtn>
                          <IconBtn label="Remove this task" onPress={() => removeTask(m, task)} style={{ borderWidth: 1, borderColor: t.border, padding: 9 }}><Trash2 size={17} color={t.destructive} /></IconBtn>
                        </View>
                        {blocked ? <Text style={{ color: t.mutedFg, fontSize: 11 }}>{blocked}</Text> : null}
                      </View>
                    )}
                  </View>
                )
              })}
              {m.tasks.length === 0 ? <Text style={{ color: t.mutedFg, fontSize: 14 }}>No tasks were found in these notes. You can add one by hand.</Text> : null}

              <View style={[s.row, { flexWrap: "wrap" }]}>
                <Btn small variant="outline" label="Add task" onPress={() => void send("meeting-update", { meetingId: m.id, add: { task: "New task", kind: "development" } }, "Could not add a task.")} />
                {m.unassigned.length > 0 ? <Text style={{ color: t.mutedFg, fontSize: 12, flexShrink: 1 }}>Nobody was named for: {m.unassigned.join(" · ")}</Text> : null}
              </View>

              {m.tasks.length > 0 ? (
                <View style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 12, gap: 8 }}>
                  <Btn
                    small
                    variant="outline"
                    label={pub.publishing && pub.publishedFor === m.id ? "Sending…" : "Send to Sheet & Slack"}
                    disabled={pub.publishing || pub.noTarget}
                    onPress={() =>
                      pub.publish(
                        { kind: "tasks", tasks: m.tasks.map((x) => ({ employee: x.employee, task: x.task, project: x.project, deadline: x.deadline, priority: x.priority })), meeting: m.name },
                        `these ${m.tasks.length} tasks to the Google Sheet and Slack`,
                        m.id,
                      )
                    }
                    style={{ alignSelf: "flex-start" }}
                  />
                  <Text style={{ color: t.mutedFg, fontSize: 12 }}>{pub.integrationNote}</Text>
                  {pub.published && pub.publishedFor === m.id ? (
                    <View style={{ gap: 2 }}>
                      <SentLine label="Google Sheet" r={pub.published.sheet} />
                      <SentLine label="Slack" r={pub.published.slack} />
                    </View>
                  ) : null}
                </View>
              ) : null}
              </> : null}
            </View>
          )
        })}
      </ScrollView>

      {editing ? (
        <TaskEditor
          task={editing.task}
          projects={projects}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            if ((await send("meeting-update", { meetingId: editing.meetingId, taskId: editing.task.id, patch }, "Could not save the task.")) !== null) setEditing(null)
          }}
        />
      ) : null}
      {pasting ? (
        <PasteNotes
          onClose={() => setPasting(false)}
          onSend={async (text) => {
            const body = await send("meeting-add", { transcript: text }, "Could not read these notes.")
            if (body === null) return
            setPasting(false)
            if (body.duplicate) toast.info("These notes were already added a short while ago, so the same meeting is shown.")
            else toast.info(`${body.meeting?.tasks?.length ?? 0} tasks found`)
          }}
        />
      ) : null}
    </View>
  )
}

function Pill({ text }: { text: string }) {
  const t = useTheme()
  return <Text style={{ color: t.fg, borderColor: t.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, overflow: "hidden" }}>{text}</Text>
}

function SentLine({ label, r }: { label: string; r?: { status: "sent" | "skipped" | "error"; message?: string } }) {
  const t = useTheme()
  if (!r) return null
  const word = r.status === "sent" ? "sent" : r.status === "skipped" ? "skipped" : "failed"
  return <Text style={{ color: r.status === "error" ? t.destructive : t.mutedFg, fontSize: 13 }}>{label}: {word}{r.message ? ` (${r.message})` : ""}</Text>
}

function TaskEditor({ task, projects, onClose, onSave }: { task: Task; projects: Project[]; onClose: () => void; onSave: (patch: Partial<Task>) => Promise<void> }) {
  const t = useTheme()
  const [text, setText] = useState(task.task)
  const [kind, setKind] = useState<Kind>(task.kind)
  const [project, setProject] = useState(task.project)
  const [deadline, setDeadline] = useState(task.deadline)
  const [priority, setPriority] = useState(task.priority)
  const [saving, setSaving] = useState(false)
  const names = projects.map((p) => p.name)
  // a project the AI named that is not connected stays visible so it can be changed
  const choices = task.project && !names.includes(task.project) ? [task.project, ...names] : names
  const label = { color: t.mutedFg, fontSize: 12 } as const

  // only what was changed is sent, with the same rules as the page: a task that becomes Marketing has no project
  const patch: Partial<Task> = {}
  if (text.trim() !== task.task) patch.task = text.trim()
  if (kind !== task.kind) {
    patch.kind = kind
    if (kind === "marketing") patch.project = ""
  }
  if (kind === "development" && project !== task.project) patch.project = project
  if (deadline !== task.deadline) patch.deadline = deadline
  if (priority !== task.priority) patch.priority = priority
  const changed = Object.keys(patch).length > 0

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.fg, fontSize: 20, fontWeight: "600" }}>Edit task</Text>
        <Text style={{ color: t.mutedFg, fontSize: 13 }}>
          {task.employee ? `Task of ${task.employee}. ` : ""}Change the words of the task. This is what WAE Bot gets when you press "Do it with WAE Bot".
        </Text>
        <Field label="Task" value={text} onChangeText={setText} maxLength={TASK_LIMIT} multiline style={{ minHeight: 120, textAlignVertical: "top" }} />
        <Text style={{ color: t.mutedFg, fontSize: 12, textAlign: "right" }}>{text.length}/{TASK_LIMIT}</Text>
        <Text style={label}>Type of work</Text>
        <View style={s.wrap}>
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <Chip key={k} label={KIND_LABEL[k]} selected={kind === k} color={kindColors(t, k).fg} onPress={() => setKind(k)} />
          ))}
        </View>
        {kind === "development" ? (
          <>
            <Text style={label}>Project</Text>
            <View style={s.wrap}>
              {choices.map((p) => (
                <Chip key={p} label={p} selected={project === p} onPress={() => setProject(p)} />
              ))}
            </View>
          </>
        ) : null}
        <Field label="Deadline" value={deadline} onChangeText={setDeadline} placeholder="Deadline" />
        <Text style={label}>Priority</Text>
        <View style={s.wrap}>
          {PRIORITIES.map((p) => (
            <Chip key={p} label={p} selected={priority === p} onPress={() => setPriority(priority === p ? "" : p)} />
          ))}
        </View>
        <View style={s.row}>
          <Btn
            label={saving ? "Saving…" : "Save"}
            busy={saving}
            disabled={!text.trim() || !changed}
            onPress={async () => {
              setSaving(true)
              await onSave(patch)
              setSaving(false)
            }}
          />
          <Btn variant="outline" label="Cancel" onPress={onClose} disabled={saving} />
        </View>
      </ScrollView>
    </Modal>
  )
}

function PasteNotes({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => Promise<void> }) {
  const t = useTheme()
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.fg, fontSize: 20, fontWeight: "600" }}>Paste notes by hand</Text>
        <Field value={text} onChangeText={setText} multiline placeholder="Paste or dictate the notes here…" style={{ minHeight: 220, textAlignVertical: "top" }} />
        <View style={s.row}>
          <Btn
            label={busy ? "Reading the notes…" : "Extract tasks"}
            busy={busy}
            disabled={!text.trim()}
            onPress={async () => {
              setBusy(true)
              await onSend(text)
              setBusy(false)
            }}
          />
          <Btn variant="outline" label="Cancel" onPress={onClose} disabled={busy} />
        </View>
      </ScrollView>
    </Modal>
  )
}
