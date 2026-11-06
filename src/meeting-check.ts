// Looks at the meeting list, remembers which meetings were seen on this phone, and sends a notification for the new ones.
// Used by the Meeting notes screen (every 15 s while the app is open) and by the background task (when the phone allows it).
import AsyncStorage from "@react-native-async-storage/async-storage"
import { call } from "./api"
import { diffMeetings, type MeetingLite } from "./meeting-watch"
import { showMeetingNotification } from "./notify"

export const KNOWN_KEY = "wae-bot-known-meetings"

async function readKnown(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KNOWN_KEY)
    if (raw === null) return null
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(String) : null
  } catch {
    return null
  }
}

// returns the new meetings (after the notification was made)
export async function processMeetings(list: MeetingLite[], notify = true): Promise<MeetingLite[]> {
  const { fresh, nextKnown } = diffMeetings(await readKnown(), list)
  await AsyncStorage.setItem(KNOWN_KEY, JSON.stringify(nextKnown)).catch(() => {})
  if (notify && fresh.length) await showMeetingNotification(fresh)
  return fresh
}

// one look at the server (the background task): true when the server answered
export async function checkMeetingsOnce(): Promise<boolean> {
  const res = await call("meetings")
  if (!res.ok) return false
  const body: any = await res.json()
  await processMeetings(Array.isArray(body.meetings) ? body.meetings : [])
  return true
}
