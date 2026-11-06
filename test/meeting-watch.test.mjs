// node test/meeting-watch.test.mjs : which meetings are new, and the words of the notification
import { diffMeetings, notificationFor } from "../src/meeting-watch.ts"
const results = []
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "   " + extra : ""}`) }
const m = (id, over = {}) => ({ id, name: "Meeting " + id, source: "wispr-flow", tasks: [1, 2, 3], ...over })

let r = diffMeetings(null, [m("a"), m("b")])
check("first look on this phone: nothing is new, everything is remembered", r.fresh.length === 0 && r.nextKnown.join() === "a,b")
r = diffMeetings(["a", "b"], [m("a"), m("b"), m("c")])
check("a meeting that was not known is new and is remembered", r.fresh.map((x) => x.id).join() === "c" && r.nextKnown.join() === "a,b,c")
r = diffMeetings(["a", "b", "c"], [m("a"), m("b"), m("c")])
check("nothing changed: nothing is new (no second notification for the same meeting)", r.fresh.length === 0 && r.nextKnown.length === 3)
r = diffMeetings(["a"], [m("a"), m("p", { source: "pasted" }), m("d", { source: "inbox" })])
check("a pasted meeting is not announced, but is remembered; an automatic one is announced", r.fresh.map((x) => x.id).join() === "d" && r.nextKnown.includes("p"))
r = diffMeetings(["a"], [])
check("an empty list keeps what was known", r.fresh.length === 0 && r.nextKnown.join() === "a")
const many = Array.from({ length: 250 }, (_, i) => "k" + i)
check("the memory is cut to the newest 200 ids", diffMeetings(many, [m("z")]).nextKnown.length === 200 && diffMeetings(many, [m("z")]).nextKnown.at(-1) === "z")
check("one meeting: its name and task count; two: a count and both names", notificationFor([m("a", { name: "Weekly sync" })]).body === "Weekly sync: 3 tasks to check" && notificationFor([m("a", { tasks: [1] })]).body.endsWith("1 task to check") && notificationFor([m("a"), m("b")]).title === "2 new meetings" && /Meeting a \(3 tasks\), Meeting b/.test(notificationFor([m("a"), m("b")]).body))
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)
