# Admin WAE Bot (mobile app)

The React Native (Expo) app of WAE Bot. It is the **WAE Bot page of the resources app** (`../Academy/resources/app/wae-bot`) on the phone: same
look (colours, "What should we work on?", the message box with Environment / Auto-allow / model menu, Recents, the three tabs Chat / Meeting notes /
Product updates), same features. It is a private app, installed over a USB cable (not in an app store), as decided in the meeting.

## Login and Log out
- **Login = the "Admin" login of the resources app**: the same Supabase accounts, only admins. An account that is not an admin (the rule of
  `isSystemAdminEmail` in `resources/lib/auth-service.ts`: the listed admin addresses or any `admin@...`) is turned away on the login screen
  ("This app is only for resources admins"), and the gateway refuses it too.
- **Log out**: "Log out" at the bottom of the menu (the icon at the top left). It removes the login from the phone.
  Runs that are going on the server are not stopped.

## What it does (same as the web page)
- **Chat**: the answer arrives word by word; approval cards (Allow / Always allow / Deny), WAE Bot's questions, "which project?", copy, edit an earlier
  message (the chat goes back to it), Stop, Auto-allow, model and speed. The menu has Recents (with the dot for a chat that is answering, delete) and
  "Always allowed" (take a rule back). A run goes on **on the server** when the app is closed or in the background; when you come back, the app joins it
  again from the last event (this is why a native app: on the iPhone the web page lost the run when the screen changed).
- The Meeting notes list is one card per **day** (newest first); a day holds that day's meetings.
- **Meeting notes**: meetings from Wispr Flow arrive by themselves (a "New" tag and a number on the tab), split into tasks labelled Development / Marketing / Content /
  Other. Edit a task with the pencil (type, project, deadline, priority; the employee is not editable), delete it, Approve / Reject (an approved task runs by itself at its run time), "Send to Sheet &
  Slack", paste notes by hand. Nothing starts by itself.
- **Product updates**: what changed in all connected repos, written for the team, "Post to Slack".

Differences from the web page (only what a phone cannot do the same way): Recents is in the menu (there is no side column on a phone); meetings are
cards, not a table, so the pencil of a task opens one window for its text, type, project, deadline and priority (the page edits them in the cells of
the table and the pencil there is for the text only; the rules are the same: 600 characters, only what changed is saved, priority is `high` /
`medium` / `low`); the tooltips of the page (Auto-allow, Environment, model) show on a long press.
Everything else is meant to be identical: same texts, same toasts (they show at the top, on any tab), same buttons and rules, same values sent to the
server. The page is the reference: when it changes, change this app the same way.

Things this app has that the page does not (kept on purpose): "N tasks, K started" under a meeting, one notification for several meetings with the
right plural, "No longer active." on an expired card, the error banner when the meetings cannot be read, and the guard for a `tool_use` event without an
`input`.

## Notifications for new meetings
When a new meeting arrives (not one you pasted yourself), the phone shows a system notification: "New meeting notes: <name>: N tasks to check". A tap
opens the Meeting notes tab. The phone asks for permission once, after the first login. Logging out stops them.
- **App open (or just left):** the app looks at the meetings every 15 seconds, so the notification comes within seconds.
- **App in the background / closed:** a background task looks about every 15 minutes at best (Android). **On the iPhone the system decides when it runs**
  (often much later, sometimes only overnight), and it does not run after you force-quit the app. So the notification can be late.
- **Instant, always:** that needs a *push* from the server. It is not built, and it has prerequisites: the bot server must send the push when a meeting
  arrives; Android needs a Firebase project; **the iPhone needs a paid Apple Developer account** (a free Apple ID cannot use push). This app is built
  *without* the push entitlement (`enableRemoteNotifications: false` in `app.json`) so that it can still be installed with a free Apple ID.
- It uses the same "already seen" list in the foreground and the background, so one meeting is announced once. The first look after a login only
  remembers the meetings that are there; it does not announce them.
- Not in the browser preview (the notification code does nothing on web).
- Not tested on a real phone: only the rules (`test/meeting-watch.test.mjs`), the type check, the Android / iOS / web bundles and the native config
  (iOS background modes yes, push entitlement none; Android notification permission declared) were checked.

## Set up
```bash
npm install
cp .env.example .env     # fill in the three EXPO_PUBLIC_* values
npx expo start
```
The app talks to the gateway of the resources app (route `/api/wae-bot/*`; source in `../Academy/resources/app/api/wae-bot` and
`../Academy/resources/lib/wae-bot/proxy.ts`). It must be **deployed** with the resources app: `EXPO_PUBLIC_GATEWAY_URL` must be an address the phone can
reach. `http://localhost:3000` only works in the computer's own browser (use the computer's LAN address while testing).
The `EXPO_PUBLIC_*` values end up inside the app, so they must not be secret: the Supabase **anon** key is fine; the WAE Bot server token
(`WAE_BOT_TOKEN`) stays on the gateway's server and is never in the app.

## Install on a phone over USB
- **iPhone: needs a Mac with Xcode.** An iOS app cannot be built on Windows. On the Mac: connect the iPhone, then `npx expo run:ios --device`.
  With a free Apple ID the app stops opening after **7 days** and has to be installed again; a paid Apple Developer account lasts a year.
- **Android (also from Windows):** turn on USB debugging, install Android Studio (SDK), connect the phone, then `npx expo run:android --device`.
- For a quick look at the screens, `npx expo start` and Expo Go (SDK 58) work if the phone and the computer are on the same network.

## Try it without a server
```bash
node test/mock-gateway.mjs      # a fake gateway and fake login on http://localhost:8787 (any password; the email must be an admin one, e.g. admin@test.com)
EXPO_PUBLIC_GATEWAY_URL=http://localhost:8787 EXPO_PUBLIC_SUPABASE_URL=http://localhost:8787 EXPO_PUBLIC_SUPABASE_ANON_KEY=x npx expo start --web
```

## Checks
```bash
npx tsc --noEmit       # types
npm test               # stream reader + chat rules (15), markdown reader (7), admin rule (3): no phone, no server
```

## Files
- `App.tsx`: login state, top bar (menu, tabs, new chat, log out).
- `src/use-bot.ts`: everything about chats (sending, editing, watching a run, joining it again, approvals, rules).
- `src/chat-state.ts`, `src/stream.ts`, `src/markdown.ts`, `src/admin-rule.ts`: pure rules, tested.
- `src/auth.ts`: admin login and log out. `src/api.ts`: the gateway client. `src/theme.ts`: the colours of the web page.
- `src/screens/*`: Chat, Meetings, Updates, Login. `src/components/*`: drawer (menu), cards, message text, buttons.
