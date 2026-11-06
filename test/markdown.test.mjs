// node test/markdown.test.mjs : the markdown reader (same rules as the web page's message-text.tsx)
import { parseMarkdown, parseInline } from "../src/markdown.ts"
const results = []
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "   " + extra : ""}`) }

check("inline: **bold** and `code` are found, plain text stays", JSON.stringify(parseInline("a **b** `c` d")) === JSON.stringify([{ text: "a " }, { text: "b", bold: true }, { text: " " }, { text: "c", code: true }, { text: " d" }]))
check("inline: a lone ** or ` is plain text", parseInline("2 ** 3 and a ` tick").every((p) => !p.bold && !p.code))
let b = parseMarkdown("Hello\n\n- one\n- two\n\n1. first\n2) second\n\n## Title\n\n```ts\nconst a = 1\n```\n\nEnd")
check("blocks: paragraph, bullet list, numbered list, heading, code block, paragraph in order", b.map((x) => x.type).join() === "p,ul,ol,heading,code,p", b.map((x) => x.type).join())
check("blocks: list items and code text are right", b[1].items.length === 2 && b[2].items.length === 2 && b[4].text === "const a = 1" && b[4].lang === "ts")
b = parseMarkdown("Look:\n\n```\nnpm test\nstill typing")
check("a code block without its closing fence is already a code block", b.length === 2 && b[1].type === "code" && b[1].text === "npm test\nstill typing")
check("a line that is half a list is a paragraph, empty text gives nothing", parseMarkdown("- a\nnot a list")[0].type === "p" && parseMarkdown("").length === 0 && parseMarkdown(undefined).length === 0)
check("html in an answer stays plain text (nothing is interpreted)", parseMarkdown("<script>alert(1)</script>")[0].inline[0].text === "<script>alert(1)</script>")
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)
