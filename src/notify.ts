// System notifications on the phone (local notifications: the phone itself makes them, nothing is sent from a server).
// Not on web (the browser preview): there these functions do nothing.
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { notificationFor, type MeetingLite } from "./meeting-watch"

const supported = Platform.OS !== "web"
const CHANNEL = "meetings"

// while the app is open, a notification is shown as a banner too (like the browser notification of the web page)
export function setupNotifications() {
  if (!supported) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  })
}

// asks the person once (the phone remembers the answer); true when notifications are allowed
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false
  try {
    // Android 13+ shows the question only after a channel exists
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "New meeting notes", importance: Notifications.AndroidImportance.HIGH })
    const now = await Notifications.getPermissionsAsync()
    if (now.granted) return true
    if (!now.canAskAgain) return false
    return (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } })).granted
  } catch {
    return false
  }
}

export async function showMeetingNotification(fresh: MeetingLite[]): Promise<void> {
  if (!supported || fresh.length === 0) return
  try {
    const { title, body } = notificationFor(fresh)
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { tab: "meeting" } },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null, // null = right now
    })
  } catch {
    // no permission or no channel: the in-app message still tells the person
  }
}

// a tap on a notification (also the one that opened the app from closed): the callback opens the Meeting notes tab
export function onNotificationTap(cb: () => void): () => void {
  if (!supported) return () => {}
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    if (r.notification.request.content.data?.tab === "meeting") cb()
  })
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (r && r.notification.request.content.data?.tab === "meeting") {
        cb()
        Notifications.clearLastNotificationResponseAsync().catch(() => {})
      }
    })
    .catch(() => {})
  return () => sub.remove()
}
