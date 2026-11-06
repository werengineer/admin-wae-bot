// The login of Admin WAE Bot: the same Supabase project (same email and password) as the web version.
import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import { AppState } from "react-native"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

// A placeholder keeps the app from crashing at start when the values are missing: the login screen then says what is missing.
export const supabase = createClient(SUPABASE_URL || "http://localhost:54321", SUPABASE_ANON_KEY || "missing-anon-key", {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})

// the token is only refreshed while the app is on the screen
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
