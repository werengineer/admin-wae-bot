// Every call to the bot goes through the admin-only gateway of the web app (/api/wae-bot/*), with the admin's Supabase login token.
// expo/fetch is used because it can stream the body (the chat answer arrives word by word).
import { fetch } from "expo/fetch"
import { GATEWAY_URL } from "./config"
import { supabase } from "./supabase"

export async function call(path: string, init: { method?: "GET" | "POST"; body?: object; signal?: AbortSignal } = {}) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error("You are not signed in. Log in again.")
  return fetch(`${GATEWAY_URL}/api/wae-bot/${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  })
}

export type ApiResponse = Awaited<ReturnType<typeof call>>

export async function errorOf(res: ApiResponse): Promise<string> {
  const body: any = await res.json().catch(() => ({}))
  return String(body?.error || `The server answered ${res.status}.`)
}
