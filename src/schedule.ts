// The run time of a task, for the phone: quick choices, reading what a person typed ("2026-11-10 21:00", local time of the phone), and showing a
// stored time back. The server stores ISO (UTC). No imports on purpose: tested with plain node (test/schedule.test.mjs).

const pad = (n: number) => String(n).padStart(2, "0")

// "YYYY-MM-DD HH:MM" in local time ("" when there is no valid time)
export function toLocalText(iso?: string | null): string {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// what the person typed -> ISO (UTC); "" for an empty box (= no run time); null when it is not a date and time
export function parseLocalText(text: string): string | null {
  const v = String(text ?? "").trim()
  if (v === "") return ""
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(v)
  if (!m) return null
  const [y, mo, d, h = 0, mi = 0] = [m[1], m[2], m[3], m[4], m[5]].map((x) => (x === undefined ? 0 : Number(x)))
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  const date = new Date(y, mo - 1, d, h, mi, 0, 0)
  // 31 February is not rolled over into March: it is refused
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date.toISOString()
}

// quick choices: now / in 1 hour / tonight 9 pm (today, or tomorrow when 9 pm has passed) / tomorrow 9 am
export function quickTimes(now = new Date()): { label: string; iso: string }[] {
  const at = (days: number, hour: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0)
    return d.toISOString()
  }
  const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0, 0)
  return [
    { label: "Right away", iso: "" },
    { label: "In 1 hour", iso: new Date(now.getTime() + 3600 * 1000).toISOString() },
    { label: "Tonight 9 pm", iso: tonight.getTime() > now.getTime() ? tonight.toISOString() : at(1, 21) },
    { label: "Tomorrow 9 am", iso: at(1, 9) },
  ]
}
