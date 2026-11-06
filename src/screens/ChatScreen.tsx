// The Chat tab, laid out like the WAE Bot page: "What should we work on?" with the message box in the middle of an empty chat, and the
// message box at the bottom of a running one. The message box holds the environment, Auto-allow, the model / speed menu and Send / Stop.
import * as Clipboard from "expo-clipboard"
import { ArrowUp, Asterisk, Check, Copy, Cpu, Folder, Pencil, Square, Wrench, Zap } from "lucide-react-native"
import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import type { Msg } from "../chat-state"
import { ApprovalCard, ProjectCard, QuestionCard } from "../components/cards"
import { MessageText } from "../components/message-text"
import { tell } from "../confirm"
import { toast } from "../toast"
import { Banner, Btn, IconBtn, Sheet, SheetItem, s } from "../components/ui"
import { radius, useTheme } from "../theme"
import type { Bot } from "../use-bot"

export function ChatScreen({ bot }: { bot: Bot }) {
  const t = useTheme()
  const scroll = useRef<any>(null) // the ScrollView (its instance type changed in this React Native version)
  const [input, setInput] = useState("")
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const [copied, setCopied] = useState("")
  const empty = bot.messages.length === 0

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true })
  }, [bot.messages, bot.quiet])

  // a different chat was opened: an edit that was open does not belong to it
  useEffect(() => setEditing(null), [bot.sessionId])

  const send = () => {
    if (bot.send(input)) setInput("")
  }
  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text)
      setCopied(text)
      setTimeout(() => setCopied(""), 1500)
      toast.info("Copied")
    } catch {
      toast.error("Could not copy. Select the text and copy it yourself.")
    }
  }

  const composer = <Composer bot={bot} input={input} setInput={setInput} send={send} empty={empty} />

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {bot.opening ? (
        <View style={[s.row, { flex: 1, justifyContent: "center", paddingBottom: 64 }]}>
          <ActivityIndicator color={t.mutedFg} />
          <Text style={{ color: t.mutedFg, fontSize: 14 }}>Loading chat…</Text>
        </View>
      ) : empty ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16, gap: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={[s.row, { justifyContent: "center", gap: 12 }]}>
            <Asterisk size={34} color={t.primary} strokeWidth={2.5} />
            <Text style={{ color: t.fg, fontSize: 28, fontWeight: "600", letterSpacing: -0.5, flexShrink: 1 }}>What should we work on?</Text>
          </View>
          {bot.loadError ? <Banner tone="error" text={`WAE Bot server is not connected: ${bot.loadError}`} /> : null}
          {composer}
        </ScrollView>
      ) : (
        <>
          <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {bot.messages.map((m, i) => (
              <Message key={i} m={m} index={i} bot={bot} editing={editing} setEditing={setEditing} copy={copy} copied={copied} />
            ))}
            {bot.busy && bot.quiet && !bot.waitingOnYou && !bot.messages.some((m) => m.kind === "bot" && m.streaming) ? (
              <View style={[s.row, { gap: 12 }]}>
                <ActivityIndicator color={t.primary} />
                <Text style={{ color: t.mutedFg, fontSize: 14 }}>Thinking…</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
            {composer}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )

}


function Message(p: { m: Msg; index: number; bot: Bot; editing: { index: number; text: string } | null; setEditing: (e: { index: number; text: string } | null) => void; copy: (t: string) => void; copied: string }) {
  const t = useTheme()
  const { m, index } = p
  if (m.kind === "user") {
    if (p.editing?.index === index)
      return (
        <View style={{ gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, backgroundColor: t.card, padding: 12 }}>
          <TextInput autoFocus multiline value={p.editing.text} onChangeText={(v) => p.setEditing({ index, text: v })} style={{ color: t.fg, fontSize: 15, minHeight: 60, textAlignVertical: "top" }} />
          <Text style={{ color: t.mutedFg, fontSize: 12 }}>
            {!p.bot.sessionId
              ? "The chat will start again from this message."
              : m.turn !== undefined
                ? "The chat goes back to this message: it and everything after it are removed, and WAE Bot answers again from here."
                : "This is sent as a new message in this chat. The old one stays in the history."}
          </Text>
          <View style={[s.row, { justifyContent: "flex-end" }]}>
            <Btn small variant="outline" label="Cancel" onPress={() => p.setEditing(null)} />
            <Btn
              small
              label="Send"
              disabled={p.bot.busy || !p.editing.text.trim()}
              onPress={() => {
                if (p.bot.sendEdited(index, p.editing!.text)) p.setEditing(null)
              }}
            />
          </View>
        </View>
      )
    return (
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={{ maxWidth: "85%", backgroundColor: t.muted, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text selectable style={{ color: t.fg, fontSize: 15 }}>{m.text}</Text>
        </View>
        <View style={s.row}>
          <IconBtn label="Copy" onPress={() => p.copy(m.text)}>
            {p.copied === m.text ? <Check size={14} color={t.ok} /> : <Copy size={14} color={t.mutedFg} />}
          </IconBtn>
          <IconBtn label="Edit" disabled={p.bot.busy} onPress={() => p.setEditing({ index, text: m.text })}>
            <Pencil size={14} color={t.mutedFg} />
          </IconBtn>
        </View>
      </View>
    )
  }
  if (m.kind === "bot")
    return (
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Asterisk size={20} color={t.primary} strokeWidth={2.5} style={{ marginTop: 3 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <MessageText text={m.text} />
          {!m.streaming ? (
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              <IconBtn label="Copy" onPress={() => p.copy(m.text)}>
                {p.copied === m.text ? <Check size={14} color={t.ok} /> : <Copy size={14} color={t.mutedFg} />}
              </IconBtn>
            </View>
          ) : null}
        </View>
      </View>
    )
  if (m.kind === "tool")
    return (
      <View style={[s.row, { paddingLeft: 32, gap: 6 }]}>
        <Wrench size={12} color={t.mutedFg} />
        <Text numberOfLines={1} style={{ color: t.mutedFg, fontSize: 12, fontFamily: "monospace", flex: 1 }}>{m.text}</Text>
      </View>
    )
  if (m.kind === "approval")
    return <ApprovalCard toolName={m.toolName} input={m.input} always={m.always} state={m.state} onDecide={(allow, always) => p.bot.decide(m.requestId, allow, always)} />
  if (m.kind === "question")
    return <QuestionCard questions={m.questions} state={m.state} answers={m.answers} onSubmit={(a) => p.bot.answerQuestion(m.requestId, a)} />
  return <ProjectCard envName={m.envName} options={m.options} chosen={m.chosen} onChoose={(id, label) => p.bot.chooseProject(index, m.message, id, label)} />
}

// the message box: the same one sits in the middle of an empty chat and at the bottom of a running one
function Composer({ bot, input, setInput, send, empty }: { bot: Bot; input: string; setInput: (v: string) => void; send: () => void; empty: boolean }) {
  const t = useTheme()
  const [menu, setMenu] = useState<"" | "env" | "model" | "speed" | "more">("")
  const envName = bot.envs.find((e) => e.id === bot.envId)?.name
  const main = bot.models.filter((m) => m.group === "main")
  const more = bot.models.filter((m) => m.group === "more")
  const currentModel = bot.models.find((m) => m.id === bot.modelId)
  const currentEffort = bot.efforts.find((e) => e.id === bot.effortId)
  const small = { color: t.mutedFg, fontSize: 12 }

  const modelRow = (m: Bot["models"][number]) => (
    <SheetItem
      key={m.id}
      label={m.label}
      selected={bot.modelId === m.id}
      right={m.needsCredits ? <Text style={[small, { borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11 }]}>Requires usage credits</Text> : undefined}
      onPress={() => {
        bot.setModelId(m.id)
        setMenu("")
      }}
    />
  )

  return (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 20, backgroundColor: t.card }}>
      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        placeholder={empty ? "How can I help you today?" : "Reply to WAE Bot…"}
        placeholderTextColor={t.mutedFg}
        style={{ color: t.fg, fontSize: 15, maxHeight: 200, minHeight: 44, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textAlignVertical: "top" }}
      />
      <View style={[s.row, { justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 8 }]}>
        {/* left side: the environment name may be cut short (…) so that Auto-allow and the model never overlap on a narrow screen */}
        <View style={[s.row, { flex: 1, minWidth: 0, gap: 2, overflow: "hidden" }]}>
          <Pressable disabled={!!bot.sessionId || bot.envs.length === 0} onPress={() => setMenu("env")} onLongPress={() => tell("Environment", bot.sessionId ? "A session keeps its environment" : "Environment")} style={[s.row, { gap: 6, paddingHorizontal: 8, height: 32, borderRadius: radius.sm, opacity: bot.sessionId ? 0.7 : 1, flexShrink: 1, minWidth: 0 }]} accessibilityLabel="Environment">
            <Folder size={14} color={t.mutedFg} />
            <Text numberOfLines={1} style={[small, { flexShrink: 1 }]}>{envName || (bot.envs.length === 0 ? "No environment" : "Environment")}</Text>
          </Pressable>
          {bot.projectName ? <Text numberOfLines={1} style={[small, { flexShrink: 1 }]}>· {bot.projectName}</Text> : null}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: bot.autoAllow }}
            onPress={() => bot.setAutoAllow(!bot.autoAllow)}
            onLongPress={() => tell("Auto-allow", "Auto-allow: everything runs without asking, except deleting (rm, git clean, DROP TABLE ...) and the server's own secrets and safety (sudo, env, kill ...).")}
            style={[s.row, { gap: 6, paddingHorizontal: 8, height: 32, borderRadius: radius.sm, flexShrink: 0 }]}
          >
            <Zap size={14} color={bot.autoAllow ? t.primary : t.mutedFg} />
            <Text numberOfLines={1} style={[small, bot.autoAllow ? { color: t.primary, fontWeight: "500" } : null]}>Auto-allow {bot.autoAllow ? "on" : "off"}</Text>
          </Pressable>
        </View>
        <View style={[s.row, { gap: 4, flexShrink: 0 }]}>
          {main.length > 0 ? (
            <Pressable accessibilityLabel="AI model and speed" onPress={() => setMenu("model")} onLongPress={() => tell("AI model and speed", bot.usedModel ? `AI model and speed. The last answer came from ${bot.usedModel}.` : "AI model and speed for the next message")} style={[s.row, { gap: 6, paddingHorizontal: 8, height: 32, borderRadius: radius.sm }]}>
              <Cpu size={14} color={t.mutedFg} />
              <Text numberOfLines={1} style={[small, { maxWidth: 110 }]}>
                {currentModel?.label || "Model"}
                {bot.effortId !== "default" && currentEffort ? ` · ${currentEffort.label}` : ""}
              </Text>
            </Pressable>
          ) : null}
          {bot.busy ? (
            <Pressable accessibilityLabel="Stop" onPress={bot.stop} style={{ width: 32, height: 32, borderRadius: radius.sm, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
              <Square size={14} color={t.onPrimary} fill={t.onPrimary} />
            </Pressable>
          ) : (
            <Pressable accessibilityLabel="Send message" disabled={!input.trim() || !bot.envId} onPress={send} style={{ width: 32, height: 32, borderRadius: radius.sm, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", opacity: !input.trim() || !bot.envId ? 0.4 : 1 }}>
              <ArrowUp size={16} color={t.onPrimary} />
            </Pressable>
          )}
        </View>
      </View>

      <Sheet visible={menu === "env"} onClose={() => setMenu("")} title="Environment">
        {bot.envs.map((e) => (
          <SheetItem key={e.id} label={e.name} selected={e.id === bot.envId} onPress={() => { bot.setEnvId(e.id); setMenu("") }} />
        ))}
      </Sheet>
      <Sheet visible={menu === "model"} onClose={() => setMenu("")} title="Model">
        {main.map(modelRow)}
        {bot.efforts.length > 0 ? <SheetItem label="Speed" right={<Text style={small}>{currentEffort?.label || "Default"}</Text>} onPress={() => setMenu("speed")} /> : null}
        {more.length > 0 ? <SheetItem label="More models" onPress={() => setMenu("more")} /> : null}
      </Sheet>
      <Sheet visible={menu === "speed"} onClose={() => setMenu("model")} title="Speed (how long it thinks)">
        {bot.efforts.map((e) => (
          <SheetItem key={e.id} label={e.label} hint={e.hint} selected={bot.effortId === e.id} onPress={() => { bot.setEffortId(e.id); setMenu("") }} />
        ))}
      </Sheet>
      <Sheet visible={menu === "more"} onClose={() => setMenu("model")} title="More models">
        {more.map(modelRow)}
      </Sheet>
    </View>
  )
}
