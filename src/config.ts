// Settings that are put into the app when it is built (see .env.example). EXPO_PUBLIC_* values are NOT secret: they are inside the app.
// The secret of the WAE Bot server (WAE_BOT_TOKEN) is never here: it stays on the server of the gateway.
export const GATEWAY_URL = (process.env.EXPO_PUBLIC_GATEWAY_URL || "").trim().replace(/\/+$/, "")
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim()
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim()

export const configured = !!GATEWAY_URL && !!SUPABASE_URL && !!SUPABASE_ANON_KEY
export const missingConfig = [
  !GATEWAY_URL && "EXPO_PUBLIC_GATEWAY_URL",
  !SUPABASE_URL && "EXPO_PUBLIC_SUPABASE_URL",
  !SUPABASE_ANON_KEY && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
].filter(Boolean) as string[]
