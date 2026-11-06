// Short messages that show for a few seconds on any tab: the phone version of the web page's toasts ("Copied", "Chat deleted",
// "Auto-allow is on from your next message", "Started in the background ...", errors). One message at a time, the newest replaces the old one.
import { useEffect, useState } from "react"

export type ToastItem = { id: number; text: string; tone: "info" | "error"; ms: number; action?: { label: string; run: () => void } }

let current: ToastItem | null = null
let seq = 0
const listeners = new Set<(t: ToastItem | null) => void>()

function emit(t: ToastItem | null) {
  current = t
  listeners.forEach((l) => l(t))
}

function show(text: string, tone: ToastItem["tone"], opts: { ms?: number; action?: ToastItem["action"] } = {}) {
  emit({ id: ++seq, text, tone, ms: opts.ms ?? (tone === "error" ? 6000 : 3500), action: opts.action })
}

export const toast = {
  info: (text: string, opts?: { ms?: number; action?: ToastItem["action"] }) => show(text, "info", opts),
  error: (text: string, opts?: { ms?: number }) => show(text, "error", opts),
  dismiss: () => emit(null),
}

export function useToast(): ToastItem | null {
  const [item, setItem] = useState<ToastItem | null>(current)
  useEffect(() => {
    listeners.add(setItem)
    return () => {
      listeners.delete(setItem)
    }
  }, [])
  // goes away by itself
  useEffect(() => {
    if (!item) return
    const timer = setTimeout(() => {
      if (current && current.id === item.id) emit(null)
    }, item.ms)
    return () => clearTimeout(timer)
  }, [item])
  return item
}
