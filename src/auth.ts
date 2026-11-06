// Login and logout of Admin WAE Bot: the "Admin" login of the resources app (same Supabase accounts), and nobody else.
import AsyncStorage from "@react-native-async-storage/async-storage"
import { call } from "./api"
import { stopWatchingMeetings } from "./background"
import { KNOWN_KEY } from "./meeting-check"
import { isResourcesAdminEmail, NOT_ADMIN_MESSAGE } from "./admin-rule"
import { supabase } from "./supabase"

export async function loginAdmin(email: string, password: string): Promise<void> {
  const clean = email.trim().toLowerCase()
  // like the Admin tab of the resources login: an account that is not an admin is turned away before anything is sent
  if (!isResourcesAdminEmail(clean)) throw new Error(NOT_ADMIN_MESSAGE)

  const { error } = await supabase.auth.signInWithPassword({ email: clean, password })
  if (error) throw new Error(error.message.includes("Invalid login credentials") ? "Invalid email or password" : error.message || "Login failed")

  // the gateway is the real gate: if it says this login is not an admin, the login is taken back
  try {
    const res = await call("environments")
    if (res.status === 401 || res.status === 403) {
      const body: any = await res.json().catch(() => ({}))
      await supabase.auth.signOut().catch(() => {})
      throw new Error(res.status === 403 ? NOT_ADMIN_MESSAGE : String(body?.error || "Sign in again."))
    }
  } catch (e: any) {
    if (e?.message === NOT_ADMIN_MESSAGE || /Sign in|expired/i.test(String(e?.message))) throw e
    // the server could not be reached: the login itself worked, the chat screen says that the server is not connected
  }
}

// Log out: the login is removed from this phone (Supabase), and what the app remembered about this admin
export async function logout(): Promise<void> {
  await stopWatchingMeetings() // no more looking at the meetings (and no notifications) for a person who logged out
  await supabase.auth.signOut().catch(() => {})
  await AsyncStorage.multiRemove(["wae-bot-meetings-seen", KNOWN_KEY, "wae-bot-open-chat"]).catch(() => {})
}
