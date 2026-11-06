// Product updates: WAE Bot reads what changed in all connected repos and writes an update for the team (the same as the web page).
import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { call, errorOf } from "../api"
import { tell } from "../confirm"
import { Btn, Chip, s } from "../components/ui"
import { MessageText } from "../components/message-text"
import { radius, useTheme } from "../theme"
import type { usePublish } from "../use-publish"

type Digest = { days: number; text: string; repos: { repo: string; commits: number; note?: string; error?: string }[] }

export function UpdatesScreen({ pub }: { pub: ReturnType<typeof usePublish> }) {
  const t = useTheme()
  const [days, setDays] = useState("7")
  const [generating, setGenerating] = useState(false)
  const [digest, setDigest] = useState<Digest | null>(null)

  const generate = async () => {
    setGenerating(true)
    setDigest(null)
    pub.clearPublished()
    try {
      const res = await call("product-updates", { body: { days: Number(days) } })
      if (!res.ok) throw new Error(await errorOf(res))
      setDigest((await res.json()) as Digest)
    } catch (e: any) {
      tell("Could not write the update", e?.message || "Could not write the update.")
    } finally {
      setGenerating(false)
    }
  }

  const sent = pub.published?.slack
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4 }}>
        <Text style={{ color: t.fg, fontSize: 24, fontWeight: "600", letterSpacing: -0.4 }}>Product updates</Text>
        <Text style={{ color: t.mutedFg, fontSize: 14 }}>WAE Bot reads what changed in all connected repos and writes an update for the team.</Text>
      </View>
      <View style={s.wrap}>
        {[["7", "Last 7 days"], ["14", "Last 14 days"], ["30", "Last 30 days"]].map(([v, label]) => (
          <Chip key={v} label={label} selected={days === v} onPress={() => setDays(v)} />
        ))}
      </View>
      <Btn label={generating ? "Writing…" : "Write update"} onPress={generate} busy={generating} style={{ alignSelf: "flex-start" }} />

      {digest ? (
        <>
          <View style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.card, borderRadius: radius.lg, padding: 16 }}>
            <MessageText text={digest.text} />
          </View>
          <View style={{ gap: 2 }}>
            {digest.repos.map((r) => (
              <Text key={r.repo} style={{ color: r.error ? t.destructive : t.mutedFg, fontSize: 12 }}>
                {r.repo}: {r.error ? `could not read (${r.error})` : `${r.commits} commits`}
                {r.note ? ` · ${r.note}` : ""}
              </Text>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <Btn label={pub.publishing ? "Sending…" : "Post to Slack"} busy={pub.publishing} disabled={!!pub.integrations && !pub.integrations.slack} onPress={() => pub.publish({ kind: "update", text: digest.text, days: digest.days }, "this update to Slack")} style={{ alignSelf: "flex-start" }} />
            <Text style={{ color: t.mutedFg, fontSize: 12 }}>{pub.integrationNote}</Text>
          </View>
          {sent ? (
            <Text style={{ color: sent.status === "error" ? t.destructive : t.mutedFg, fontSize: 13 }}>
              Slack: {sent.status === "sent" ? "sent" : sent.status === "skipped" ? "skipped" : "failed"}
              {sent.message ? ` (${sent.message})` : ""}
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  )
}
