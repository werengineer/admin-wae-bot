// A small markdown reader for Claude's answers, the same rules as components/wae-bot/message-text.tsx of the web page:
// code blocks, lists, headings, **bold** and `code`. It only returns data (blocks), never markup. No imports: tested with plain node.

export type Inline = { text: string; bold?: boolean; code?: boolean }
export type Block =
  | { type: "code"; text: string; lang: string }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] }
  | { type: "heading"; inline: Inline[] }
  | { type: "p"; inline: Inline[] }

export function parseInline(text: string): Inline[] {
  return text
    .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)
    .filter((p) => p !== "")
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return { text: part.slice(1, -1), code: true }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return { text: part.slice(2, -2), bold: true }
      return { text: part }
    })
}

function parseBlock(block: string): Block {
  const lines = block.split("\n")
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) return { type: "ul", items: lines.map((l) => parseInline(l.replace(/^\s*[-*]\s+/, ""))) }
  if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return { type: "ol", items: lines.map((l) => parseInline(l.replace(/^\s*\d+[.)]\s+/, ""))) }
  const heading = /^#{1,4}\s+(.*)$/.exec(block)
  if (lines.length === 1 && heading) return { type: "heading", inline: parseInline(heading[1]) }
  return { type: "p", inline: parseInline(block) }
}

export function parseMarkdown(text: string): Block[] {
  const out: Block[] = []
  // a code block that is still being typed (no closing fence yet) is shown as a code block already
  for (const seg of String(text ?? "").split(/(```[^\n]*\n[\s\S]*?(?:```|$))/g)) {
    const fence = /^```([^\n]*)\n([\s\S]*?)(?:```)?$/.exec(seg)
    if (fence) {
      out.push({ type: "code", lang: fence[1].trim(), text: fence[2].replace(/\n$/, "") })
      continue
    }
    for (const b of seg.split(/\n{2,}/)) if (b.trim()) out.push(parseBlock(b.trim()))
  }
  return out
}
