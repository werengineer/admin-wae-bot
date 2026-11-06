// Sending reviewed work to the Google Sheet and Slack (only when the admin presses the button and confirms), and the connection note.
import { useEffect, useState } from "react"
import { call, errorOf } from "./api"
import { confirm, tell } from "./confirm"

export type Sent = { status: "sent" | "skipped" | "error"; message?: string }
export type Published = { sheet?: Sent; slack?: Sent }

export function usePublish() {
  const [integrations, setIntegrations] = useState<{ sheet: boolean; slack: boolean } | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishedFor, setPublishedFor] = useState("") // which meeting the "sent" lines under it belong to
  const [published, setPublished] = useState<Published | null>(null)

  useEffect(() => {
    call("integrations")
      .then(async (r) => {
        if (r.ok) setIntegrations((await r.json()) as { sheet: boolean; slack: boolean })
      })
      .catch(() => {})
  }, [])

  const publish = (payload: object, what: string, forId = "") =>
    confirm("Send?", `Send ${what}?`, "Send", async () => {
      setPublishing(true)
      setPublished(null)
      setPublishedFor(forId)
      try {
        const res = await call("publish", { body: payload })
        if (!res.ok) throw new Error(await errorOf(res))
        setPublished((await res.json()) as Published)
      } catch (e: any) {
        tell("Could not send", e?.message || "Could not send.")
      } finally {
        setPublishing(false)
      }
    })

  return {
    integrations,
    noTarget: !!integrations && !integrations.sheet && !integrations.slack,
    integrationNote: integrations ? `Google Sheet: ${integrations.sheet ? "connected" : "not set up"} · Slack: ${integrations.slack ? "connected" : "not set up"}` : "",
    publishing,
    publishedFor,
    published,
    clearPublished: () => setPublished(null),
    publish,
  }
}
