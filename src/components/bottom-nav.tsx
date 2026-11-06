// The footer menu of the app: Chat, Meeting notes, Product updates as a floating pill at the bottom of the screen (thumb reach on a phone).
// The open tab is a dark pill with its icon above its name; the others are icon + name in grey. The unread number of new meetings sits on the
// icon of Meeting notes. It hides while the keyboard is open, so the message box keeps the space.
import { ClipboardList, MessageSquare, Newspaper } from "lucide-react-native"
import { useEffect, useState, type ComponentType } from "react"
import { Keyboard, Platform, Pressable, Text, View } from "react-native"
import { useTheme } from "../theme"

export type Tab = "chat" | "meeting" | "updates"

const ITEMS: { key: Tab; label: string; Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
  { key: "chat", label: "Chat", Icon: MessageSquare },
  { key: "meeting", label: "Meeting notes", Icon: ClipboardList },
  { key: "updates", label: "Product updates", Icon: Newspaper },
]

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setOpen(true))
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setOpen(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return open
}

export function BottomNav({ tab, onChange, unread }: { tab: Tab; onChange: (tab: Tab) => void; unread: number }) {
  const t = useTheme()
  const keyboard = useKeyboardOpen()
  if (keyboard) return null
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          backgroundColor: t.secondary,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 8,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        {ITEMS.map(({ key, label, Icon }) => {
          const on = tab === key
          const color = on ? t.onPrimary : t.mutedFg
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(key)}
              style={{ flex: 1, alignItems: "center" }}
            >
              <View style={{ alignItems: "center", gap: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? t.primary : "transparent", minWidth: 84 }}>
                <View>
                  <Icon size={21} color={color} strokeWidth={on ? 2.4 : 2} />
                  {key === "meeting" && !on && unread > 0 ? (
                    <Text
                      style={{ position: "absolute", top: -6, right: -12, backgroundColor: t.destructive, color: "#ffffff", fontSize: 10, fontWeight: "700", minWidth: 16, height: 16, lineHeight: 16, textAlign: "center", borderRadius: 8, overflow: "hidden", paddingHorizontal: 3 }}
                    >
                      {unread}
                    </Text>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ color, fontSize: 11, fontWeight: on ? "600" : "500" }}>
                  {label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
