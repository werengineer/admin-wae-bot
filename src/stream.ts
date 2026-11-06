// The bot server sends a run as a stream of "data: {json}\n\n" blocks (plus ": ping" comment blocks every 10 s).
// This reads such a stream in pieces: bytes can be cut anywhere, a block is only handled when it is complete.
// No imports on purpose: it is tested with plain node (test/stream-and-chat.test.mjs).

export type SseParser = { push: (chunk: string) => void }

export function createSseParser(onEvent: (ev: any) => void): SseParser {
  let buf = ""
  return {
    push(chunk: string) {
      buf += chunk
      let i: number
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, i)
        buf = buf.slice(i + 2)
        if (!block.startsWith("data: ")) continue // a ping or a comment
        let ev: any
        try {
          ev = JSON.parse(block.slice(6))
        } catch {
          continue // a broken block is skipped, the stream goes on
        }
        onEvent(ev)
      }
    },
  }
}
