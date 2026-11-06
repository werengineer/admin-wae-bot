// Questions and messages as pop-ups. On a phone these are the native alerts; on web (the preview in a browser) React Native's Alert does
// nothing, so the browser's own dialogs are used there.
import { Alert, Platform } from "react-native"

export function confirm(title: string, message: string, yes: string, onYes: () => void, destructive = false) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onYes()
    return
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: yes, style: destructive ? "destructive" : "default", onPress: onYes },
  ])
}

export function tell(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`)
    return
  }
  Alert.alert(title, message)
}
