// Building blocks in the look of the web page (shadcn style: black primary button, grey secondary, thin borders, rounded cards).
import { ReactNode } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native"
import { radius, useTheme } from "../theme"

export function Btn({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  small,
  style,
  icon,
}: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost"
  disabled?: boolean
  busy?: boolean
  small?: boolean
  style?: ViewStyle
  icon?: ReactNode
}) {
  const t = useTheme()
  const bg = variant === "primary" ? t.primary : variant === "danger" ? t.destructive : variant === "secondary" ? t.secondary : "transparent"
  const fg = variant === "primary" ? t.onPrimary : variant === "danger" ? "#ffffff" : variant === "ghost" ? t.mutedFg : t.fg
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, borderColor: variant === "outline" ? t.border : "transparent", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: small ? 12 : 16, paddingVertical: small ? 7 : 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={{ color: fg, fontWeight: "500", fontSize: small ? 13 : 14 }}>{label}</Text>
    </Pressable>
  )
}

// a round-cornered icon-only button (copy, edit, delete ...)
export function IconBtn({ label, onPress, children, disabled, style }: { label: string; onPress: () => void; children: ReactNode; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ padding: 7, borderRadius: radius.sm, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}>
      {children}
    </Pressable>
  )
}

export function Chip({ label, selected, onPress, color, disabled }: { label: string; selected?: boolean; onPress?: () => void; color?: string; disabled?: boolean }) {
  const t = useTheme()
  const c = color || t.primary
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: selected ? c : t.border, backgroundColor: selected ? c + "22" : "transparent", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ color: selected ? c : t.fg, fontSize: 13, fontWeight: selected ? "600" : "400" }}>{label}</Text>
    </Pressable>
  )
}

export function Field(props: TextInputProps & { label?: string }) {
  const t = useTheme()
  const { label, style, ...rest } = props
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: t.fg, fontSize: 14, fontWeight: "500" }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.mutedFg}
        {...rest}
        style={[{ borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: t.fg, fontSize: 15, backgroundColor: t.bg }, style]}
      />
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme()
  return <View style={[{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 10 }, style]}>{children}</View>
}

export function Banner({ text, onClose, tone = "warn" }: { text: string; onClose?: () => void; tone?: "warn" | "error" }) {
  const t = useTheme()
  if (!text) return null
  return (
    <Pressable onPress={onClose} style={{ backgroundColor: tone === "error" ? t.destructive + "12" : t.warnBg, borderColor: tone === "error" ? t.destructive + "55" : t.warnBorder, borderWidth: 1, padding: 12, borderRadius: radius.md }}>
      <Text style={{ color: tone === "error" ? t.destructive : t.warnText, fontSize: 13 }}>{text}</Text>
    </Pressable>
  )
}

// a bottom sheet for menus (environment, model, speed ...): the phone version of the web page's dropdown menus
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const t = useTheme()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", paddingBottom: 24 }}>
          {title ? <Text style={{ color: t.mutedFg, fontSize: 12, fontWeight: "500", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>{title}</Text> : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function SheetItem({ label, hint, right, selected, onPress }: { label: string; hint?: string; right?: ReactNode; selected?: boolean; onPress: () => void }) {
  const t = useTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: pressed ? t.muted : "transparent" })}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.fg, fontSize: 15 }}>{label}</Text>
        {hint ? <Text style={{ color: t.mutedFg, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      {right}
      {selected ? <Text style={{ color: t.primary, fontSize: 16 }}>✓</Text> : null}
    </Pressable>
  )
}

export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fill: { flex: 1 },
})
