// The login, laid out like the resources login page (logo, "Welcome Back", email, password with an eye, Sign In), but only the Admin type.
import { Eye, EyeOff, LogIn } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { loginAdmin } from "../auth"
import { missingConfig } from "../config"
import { Banner, Btn, Chip, s } from "../components/ui"
import { radius, useTheme } from "../theme"

export function LoginScreen({ notice = "" }: { notice?: string }) {
  const t = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(notice)

  const submit = async () => {
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError("")
    try {
      await loginAdmin(email, password)
    } catch (e: any) {
      setError(e?.message || "Login failed")
      setBusy(false)
    }
  }

  const input = { borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 11, color: t.fg, fontSize: 15, backgroundColor: t.bg } as const

  return (
    <LinearGradient colors={t.bg === "#ffffff" ? ["#eff6ff", "#e0e7ff"] : ["#0a0a0a", "#0a0a0a"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: 24, gap: 16, width: "100%", maxWidth: 448, alignSelf: "center" }}>
            <View style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 64, height: 64, borderRadius: radius.sm, backgroundColor: "#ffffff", padding: 4, marginBottom: 10 }}>
                <Image source={require("../../assets/company-logo.jpeg")} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityLabel="WAE Logo" />
              </View>
              <Text style={{ color: t.fg, fontSize: 24, fontWeight: "700" }}>Welcome Back</Text>
              <Text style={{ color: t.mutedFg, fontSize: 14, textAlign: "center" }}>Sign in with your resources admin account to use WAE Bot</Text>
            </View>

            <View style={[s.row, { justifyContent: "center" }]}>
              <Chip label="Admin" selected />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: t.fg, fontSize: 14, fontWeight: "500" }}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor={t.mutedFg} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="username" editable={!busy} style={input} />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: t.fg, fontSize: 14, fontWeight: "500" }}>Password</Text>
              <View>
                <TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={t.mutedFg} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="password" textContentType="password" editable={!busy} onSubmitEditing={submit} style={[input, { paddingRight: 44 }]} />
                <Pressable accessibilityLabel={show ? "Hide password" : "Show password"} onPress={() => setShow(!show)} hitSlop={8} style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>
                  {show ? <EyeOff size={18} color={t.mutedFg} /> : <Eye size={18} color={t.mutedFg} />}
                </Pressable>
              </View>
            </View>

            {missingConfig.length ? <Banner tone="error" text={`The app was built without: ${missingConfig.join(", ")}. See .env.example.`} /> : null}
            <Banner tone="error" text={error} />
            <Btn label={busy ? "Signing in..." : "Sign In"} onPress={submit} busy={busy} disabled={!email.trim() || !password || missingConfig.length > 0} icon={busy ? undefined : <LogIn size={16} color={t.onPrimary} />} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
