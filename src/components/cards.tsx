// The cards inside a chat, the same as the web page: WAE Bot wants to use a tool (Allow / Always allow / Deny), WAE Bot's question, "which project?".
import { CircleHelp, Folder, ShieldQuestion } from "lucide-react-native"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import type { ProjectOption, QItem } from "../chat-state"
import { radius, useTheme } from "../theme"
import { Btn, Field, s } from "./ui"

function CardShell({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <View style={{ marginLeft: 32, gap: 12, borderWidth: 1, borderColor: t.border, borderRadius: 14, backgroundColor: t.card, padding: 16 }}>{children}</View>
}

const pretty = (v: unknown) => {
  try {
    return JSON.stringify(v, null, 2) ?? ""
  } catch {
    return String(v)
  }
}

export function ApprovalCard({
  toolName,
  input,
  always,
  state,
  onDecide,
}: {
  toolName: string
  input: unknown
  always?: string | null
  state: "waiting" | "approved" | "denied" | "expired"
  onDecide: (allow: boolean, always?: boolean) => void
}) {
  const t = useTheme()
  return (
    <CardShell>
      <View style={s.row}>
        <ShieldQuestion size={16} color={t.mutedFg} />
        <Text style={{ color: t.fg, fontWeight: "500", flex: 1 }}>WAE Bot wants to use {toolName}</Text>
      </View>
      <ScrollView style={{ maxHeight: 190, backgroundColor: t.muted, borderRadius: radius.sm }} contentContainerStyle={{ padding: 10 }} nestedScrollEnabled>
        <Text selectable style={{ color: t.fg, fontFamily: "monospace", fontSize: 12 }}>{pretty(input)}</Text>
      </ScrollView>
      {state === "waiting" ? (
        <View style={{ gap: 8 }}>
          <View style={s.wrap}>
            <Btn small label="Allow" onPress={() => onDecide(true)} />
            {always ? <Btn small variant="secondary" label="Always allow" onPress={() => onDecide(true, true)} /> : null}
            <Btn small variant="outline" label="Deny" onPress={() => onDecide(false)} />
          </View>
          {always ? <Text style={{ color: t.mutedFg, fontSize: 12 }}>{always}. You can take it back in the list in the menu.</Text> : null}
        </View>
      ) : (
        <Text style={{ color: t.mutedFg, fontSize: 12 }}>
          {state === "approved" ? "Allowed" : state === "denied" ? "Denied" : 'Expired: this run stopped before you answered. Send a message (for example "continue") to carry on.'}
        </Text>
      )}
    </CardShell>
  )
}

function Choice({ label, description, selected, disabled, onPress }: { label: string; description?: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  const t = useTheme()
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ borderWidth: 1, borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.muted : "transparent", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, opacity: disabled && !selected ? 0.6 : 1 }}>
      <Text style={{ color: t.fg, fontWeight: "500", fontSize: 14 }}>{label}</Text>
      {description ? <Text style={{ color: t.mutedFg, fontSize: 12 }}>{description}</Text> : null}
    </Pressable>
  )
}

export function QuestionCard({
  questions,
  state,
  answers,
  onSubmit,
}: {
  questions: QItem[]
  state: "waiting" | "answered" | "expired"
  answers?: Record<string, string>
  onSubmit: (answers: Record<string, string>) => void
}) {
  const t = useTheme()
  const [picked, setPicked] = useState<Record<number, string[]>>({})
  const [other, setOther] = useState<Record<number, string>>({})
  const [otherOpen, setOtherOpen] = useState<Record<number, boolean>>({})
  const answered = state !== "waiting"
  // one question with one answer: choosing an option sends it right away
  const quick = questions.length === 1 && !questions[0].multiSelect

  const answerOf = (i: number) => [...(picked[i] || []), ...(otherOpen[i] && (other[i] || "").trim() ? [(other[i] || "").trim()] : [])].join(", ")
  const ready = questions.every((_, i) => answerOf(i) !== "")
  const collect = () => Object.fromEntries(questions.map((q, i) => [q.question, answerOf(i)]))

  const choose = (qi: number, label: string) => {
    const q = questions[qi]
    if (q.multiSelect) return setPicked((p) => ({ ...p, [qi]: (p[qi] || []).includes(label) ? (p[qi] || []).filter((x) => x !== label) : [...(p[qi] || []), label] }))
    setOtherOpen((o) => ({ ...o, [qi]: false }))
    setPicked((p) => ({ ...p, [qi]: [label] }))
    if (quick) onSubmit({ [q.question]: label })
  }
  const openOther = (qi: number) => {
    setOtherOpen((o) => ({ ...o, [qi]: !o[qi] }))
    if (!questions[qi].multiSelect) setPicked((p) => ({ ...p, [qi]: [] }))
  }

  return (
    <CardShell>
      <View style={s.row}>
        <CircleHelp size={16} color={t.mutedFg} />
        <Text style={{ color: t.fg, fontWeight: "500" }}>{"WAE Bot's question"}</Text>
      </View>
      {questions.map((q, qi) => (
        <View key={qi} style={{ gap: 8 }}>
          {q.header ? (
            <View style={{ alignSelf: "flex-start", backgroundColor: t.muted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: t.mutedFg, fontSize: 12 }}>{q.header}</Text>
            </View>
          ) : null}
          <Text style={{ color: t.fg, fontWeight: "500", fontSize: 15 }}>{q.question}</Text>
          {q.multiSelect && !answered ? <Text style={{ color: t.mutedFg, fontSize: 12 }}>You can pick more than one</Text> : null}
          <View style={{ gap: 8 }}>
            {q.options.map((o) => (
              <Choice key={o.label} label={o.label} description={o.description} selected={(picked[qi] || []).includes(o.label)} disabled={answered} onPress={() => choose(qi, o.label)} />
            ))}
            <Choice label="Others" description="Write your own answer" selected={!!otherOpen[qi]} disabled={answered} onPress={() => openOther(qi)} />
          </View>
          {otherOpen[qi] && !answered ? (
            <Field autoFocus value={other[qi] || ""} onChangeText={(v) => setOther((o) => ({ ...o, [qi]: v }))} placeholder="Write your own answer…" onSubmitEditing={() => quick && (other[qi] || "").trim() && onSubmit({ [q.question]: (other[qi] || "").trim() })} />
          ) : null}
        </View>
      ))}
      {!answered && (!quick || otherOpen[0]) ? <Btn small label="Send" disabled={!ready} onPress={() => onSubmit(collect())} style={{ alignSelf: "flex-start" }} /> : null}
      {answered && answers ? (
        <View style={{ gap: 2 }}>
          {Object.entries(answers).map(([q, a]) => (
            <Text key={q} style={{ color: t.mutedFg, fontSize: 12 }}>
              {q} → <Text style={{ color: t.fg, fontWeight: "500" }}>{a}</Text>
            </Text>
          ))}
        </View>
      ) : null}
      {state === "expired" ? <Text style={{ color: t.mutedFg, fontSize: 12 }}>No longer active.</Text> : null}
    </CardShell>
  )
}

export function ProjectCard({
  envName,
  options,
  chosen,
  onChoose,
}: {
  envName: string
  options: ProjectOption[]
  chosen?: string
  onChoose: (id: string, label: string) => void
}) {
  const t = useTheme()
  return (
    <CardShell>
      <View style={s.row}>
        <Folder size={16} color={t.mutedFg} />
        <Text style={{ color: t.fg, fontWeight: "500" }}>{envName}: which project?</Text>
      </View>
      {chosen ? (
        <Text style={{ color: t.mutedFg, fontSize: 12 }}>
          Project: <Text style={{ color: t.fg, fontWeight: "500" }}>{chosen}</Text>
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {options.map((o) => (
            <Choice key={o.id} label={o.label} description={o.description} onPress={() => onChoose(o.id, o.label)} />
          ))}
          <Choice label="Others" description="Another project, or all repos together" onPress={() => onChoose("others", "Others")} />
        </View>
      )}
    </CardShell>
  )
}
