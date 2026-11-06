// Claude's answer as text on the phone: paragraphs, lists, headings, code blocks, **bold** and `code` (see markdown.ts).
import { memo } from "react"
import { ScrollView, Text, View } from "react-native"
import { parseMarkdown, type Inline } from "../markdown"
import { radius, useTheme } from "../theme"

const MONO = { fontFamily: "monospace" as const }

function Inlines({ parts }: { parts: Inline[] }) {
  const t = useTheme()
  return (
    <>
      {parts.map((p, i) =>
        p.code ? (
          <Text key={i} style={[MONO, { backgroundColor: t.muted, fontSize: 13 }]}>{` ${p.text} `}</Text>
        ) : p.bold ? (
          <Text key={i} style={{ fontWeight: "700" }}>{p.text}</Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </>
  )
}

export const MessageText = memo(function MessageText({ text }: { text: string }) {
  const t = useTheme()
  const blocks = parseMarkdown(text)
  const base = { color: t.fg, fontSize: 15, lineHeight: 24 }
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((b, i) => {
        if (b.type === "code")
          return (
            <ScrollView key={i} horizontal style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.muted, borderRadius: radius.md }} contentContainerStyle={{ padding: 12 }}>
              <Text selectable style={[MONO, { color: t.fg, fontSize: 13, lineHeight: 19 }]}>{b.text}</Text>
            </ScrollView>
          )
        if (b.type === "ul" || b.type === "ol")
          return (
            <View key={i} style={{ gap: 4, paddingLeft: 4 }}>
              {b.items.map((item, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={[base, { width: 20 }]}>{b.type === "ul" ? "•" : `${j + 1}.`}</Text>
                  <Text selectable style={[base, { flex: 1 }]}><Inlines parts={item} /></Text>
                </View>
              ))}
            </View>
          )
        if (b.type === "heading")
          return (
            <Text key={i} selectable style={[base, { fontWeight: "600" }]}><Inlines parts={b.inline} /></Text>
          )
        return (
          <Text key={i} selectable style={base}><Inlines parts={b.inline} /></Text>
        )
      })}
    </View>
  )
})
