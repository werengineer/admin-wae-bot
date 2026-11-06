// Which meetings are new (so the phone says so with a notification), and the words of that notification.
// No imports on purpose: tested with plain node (test/meeting-watch.test.mjs).

export type MeetingLite = { id: string; name: string; source: string; tasks: unknown[] }

const KEEP = 200 // how many meeting ids are remembered

// known = the ids that were already seen (null = the very first look on this phone: nothing is "new", everything is remembered).
// A meeting that was pasted by hand is not announced (the person who pasted it is looking at it).
export function diffMeetings(known: string[] | null, list: MeetingLite[]): { fresh: MeetingLite[]; nextKnown: string[] } {
  const ids = list.map((m) => m.id)
  if (known === null) return { fresh: [], nextKnown: ids.slice(-KEEP) }
  const seen = new Set(known)
  const fresh = list.filter((m) => !seen.has(m.id) && m.source !== "pasted")
  const nextKnown = [...known, ...ids.filter((id) => !seen.has(id))].slice(-KEEP)
  return { fresh, nextKnown }
}

export function notificationFor(fresh: MeetingLite[]): { title: string; body: string } {
  const count = (m: MeetingLite) => `${m.tasks.length} task${m.tasks.length === 1 ? "" : "s"}`
  if (fresh.length === 1) return { title: "New meeting notes", body: `${fresh[0].name}: ${count(fresh[0])} to check` }
  return { title: `${fresh.length} new meetings`, body: fresh.map((m) => `${m.name} (${count(m)})`).join(", ") }
}
