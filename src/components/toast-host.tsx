// Shows the current toast (see ../toast.ts) at the top of the screen, over every tab. A tap closes it.
import { Pressable, Text, View } from "react-native"
import { radius, useTheme } from "../theme"
import { toast, useToast } from "../toast"

export function ToastHost() {
  const t = useTheme()
  const item = useToast()
  if (!item) return null
  const error = item.tone === "error"
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 8, left: 12, right: 12, zIndex: 100, elevation: 6 }}>
      <Pressable
        accessibilityRole="alert"
        onPress={toast.dismiss}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: error ? t.destructive : t.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}
      >
        <Text style={{ flex: 1, color: error ? "#ffffff" : t.onPrimary, fontSize: 13 }}>{item.text}</Text>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              toast.dismiss()
              item.action!.run()
            }}
            hitSlop={8}
          >
            <Text style={{ color: error ? "#ffffff" : t.onPrimary, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>{item.action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  )
}
