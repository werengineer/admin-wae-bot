// node test/schedule.test.mjs : the run time of a task on the phone
import { parseLocalText, toLocalText, quickTimes } from "../src/schedule.ts"
const results = []
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "   " + extra : ""}`) }

const iso = parseLocalText("2026-11-10 21:00")
check("a typed local time becomes ISO, and shows back as typed", !!iso && toLocalText(iso) === "2026-11-10 21:00" && new Date(iso).getHours() === 21)
check("a date alone is midnight; 'T' and one-digit parts are fine", toLocalText(parseLocalText("2026-11-10")) === "2026-11-10 00:00" && toLocalText(parseLocalText("2026-11-10T09:05")) === "2026-11-10 09:05" && toLocalText(parseLocalText("2026-1-5 7:30")) === "2026-01-05 07:30")
check("an empty box means no run time (empty string, not an error)", parseLocalText("") === "" && parseLocalText("   ") === "")
check("junk and impossible times are refused (null), also 31 February", ["tomorrow", "10/11/2026", "2026-13-01 10:00", "2026-11-31 10:00", "2026-02-31", "2026-11-10 25:00", "2026-11-10 10:75", "x".repeat(50)].every((v) => parseLocalText(v) === null))
check("toLocalText of nothing or a broken value is empty", toLocalText("") === "" && toLocalText(undefined) === "" && toLocalText("not a date") === "")

const morning = new Date(2026, 10, 10, 10, 0, 0)     // 10 Nov 2026, 10:00
let q = quickTimes(morning)
check("quick choices: right away has no time; 1 hour later; tonight 9 pm today; tomorrow 9 am", q[0].iso === "" && Date.parse(q[1].iso) - morning.getTime() === 3600000 && toLocalText(q[2].iso) === "2026-11-10 21:00" && toLocalText(q[3].iso) === "2026-11-11 09:00")
q = quickTimes(new Date(2026, 10, 10, 22, 30, 0))
check("after 9 pm, 'tonight 9 pm' becomes tomorrow 9 pm", toLocalText(q[2].iso) === "2026-11-11 21:00")
q = quickTimes(new Date(2026, 11, 31, 23, 0, 0))
check("tomorrow across the end of the year", toLocalText(q[3].iso) === "2027-01-01 09:00")
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)
