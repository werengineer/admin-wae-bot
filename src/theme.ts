// The colours and shapes of the WAE Bot page of the resources app (app/globals.css there: black primary, light grey muted, 0.5 rem radius),
// in its light and its dark version.
import { useColorScheme } from "react-native"

const light = {
  bg: "#ffffff", fg: "#0a0a0a", card: "#ffffff", muted: "#f5f5f5", mutedFg: "#737373", border: "#e5e5e5",
  primary: "#000000", onPrimary: "#ffffff", secondary: "#f5f5f5", destructive: "#ef4444", ok: "#16a34a", sidebar: "#fafafa",
  warnBg: "#fffbeb", warnBorder: "#fcd34d", warnText: "#92400e",
  blue: "#1d4ed8", blueBg: "#eff6ff", blueBorder: "#93c5fd", orange: "#c2410c", orangeBg: "#fff7ed", orangeBorder: "#fdba74",
}
const dark: typeof light = {
  bg: "#0a0a0a", fg: "#fafafa", card: "#0a0a0a", muted: "#262626", mutedFg: "#a3a3a3", border: "#262626",
  primary: "#fafafa", onPrimary: "#171717", secondary: "#262626", destructive: "#f87171", ok: "#4ade80", sidebar: "#171717",
  warnBg: "#422006", warnBorder: "#854d0e", warnText: "#fde68a",
  blue: "#93c5fd", blueBg: "#172554", blueBorder: "#1e40af", orange: "#fdba74", orangeBg: "#431407", orangeBorder: "#9a3412",
}

export type Theme = typeof light
export const radius = { sm: 8, md: 12, lg: 16 }
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light
}
