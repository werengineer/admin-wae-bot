// Admin WAE Bot (React Native / Expo): the WAE Bot page of the resources app on the phone: Chat (with background runs), Meeting notes,
// Product updates. Login and Log out are for resources admins only.
import type { Session } from "@supabase/supabase-js"
import { Menu, Plus } from "lucide-react-native"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { isResourcesAdminEmail, NOT_ADMIN_MESSAGE } from "./src/admin-rule"
import { logout } from "./src/auth"
import { startWatchingMeetings } from "./src/background"
import { ensureNotificationPermission, onNotificationTap } from "./src/notify"
import { confirm } from "./src/confirm"
import { Drawer } from "./src/components/drawer"
import { BottomNav, type Tab } from "./src/components/bottom-nav"
import { ToastHost } from "./src/components/toast-host"
import { Banner, IconBtn, s } from "./src/components/ui"
import { ChatScreen } from "./src/screens/ChatScreen"
import { LoginScreen } from "./src/screens/LoginScreen"
import { MeetingsScreen } from "./src/screens/MeetingsScreen"
import { UpdatesScreen } from "./src/screens/UpdatesScreen"
import { supabase } from "./src/supabase"
import { useTheme } from "./src/theme"
import { useBot } from "./src/use-bot"
import { usePublish } from "./src/use-publish"

export default function App() {
  const t = useTheme()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [turnedAway, setTurnedAway] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // a login that is not a resources admin (for example one that was saved on this phone earlier) is taken away
  const email = session?.user.email || ""
  const admin = !!session && isResourcesAdminEmail(email)
  useEffect(() => {
    if (session && !admin) {
      setTurnedAway(NOT_ADMIN_MESSAGE)
      logout()
    }
  }, [session, admin])

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {!ready ? <ActivityIndicator style={{ flex: 1 }} color={t.mutedFg} /> : admin ? <Main email={email} /> : <LoginScreen notice={turnedAway} />}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function Main({ email }: { email: string }) {
  const t = useTheme()
  const bot = useBot()
  const pub = usePublish()
  const [tab, setTab] = useState<Tab>("chat")
  const [menu, setMenu] = useState(false)
  const [unread, setUnread] = useState(0)
  const onUnread = useCallback((n: number) => setUnread(n), [])
  const showMeetings = useCallback(() => setTab("meeting"), [])

  // notifications for new meetings: the phone is asked once, then it looks at the meetings in the background (when the phone allows it);
  // a tap on a notification opens the Meeting notes tab
  useEffect(() => {
    ensureNotificationPermission().then((ok) => {
      if (ok) startWatchingMeetings()
    })
    return onNotificationTap(() => setTab("meeting"))
  }, [])

  const askLogout = () => confirm("Log out", "Log out of Admin WAE Bot on this phone? Runs that are going on the server are not stopped.", "Log out", () => void logout(), true)
  const newChat = () => {
    bot.newChat()
    setTab("chat")
    setMenu(false)
  }
  // "Open chat" on a started meeting task: the chat of that run
  const openChat = (runId: string) => {
    const row = bot.chatOfRun(runId)
    if (!row) return
    bot.openSession(row)
    setTab("chat")
  }

  // a 403 from the gateway means this login is not allowed to use WAE Bot
  const refused = /Admins only|not confirmed|Sign in as an admin|Invalid or expired/i.test(bot.loadError)

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* top bar: menu with Recents and Log out, new chat (the three tabs are the footer menu below) */}
      <View style={{ paddingHorizontal: 8, paddingTop: 6, gap: 6 }}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <IconBtn label="Chats and account" onPress={() => setMenu(true)}><Menu size={20} color={t.fg} /></IconBtn>
          <View style={s.row}>
            <IconBtn label="New chat" onPress={newChat}><Plus size={20} color={t.fg} /></IconBtn>
          </View>
        </View>
      </View>

      {refused ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: t.fg, fontSize: 20, fontWeight: "600" }}>Admins only</Text>
          <Banner tone="error" text={bot.loadError} />
          <Text style={{ color: t.mutedFg, fontSize: 13 }}>Log out and sign in with a resources admin account.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, display: tab === "chat" ? "flex" : "none" }}>
            <ChatScreen bot={bot} />
          </View>
          <View style={{ flex: 1, display: tab === "meeting" ? "flex" : "none" }}>
            <MeetingsScreen bot={bot} pub={pub} active={tab === "meeting"} openChat={openChat} onUnread={onUnread} showTab={showMeetings} />
          </View>
          <View style={{ flex: 1, display: tab === "updates" ? "flex" : "none" }}>
            <UpdatesScreen pub={pub} />
          </View>
        </View>
      )}

      {/* the footer menu: Chat, Meeting notes, Product updates */}
      {!refused ? (
        <BottomNav
          tab={tab}
          unread={unread}
          onChange={(k) => {
            setTab(k)
            pub.clearPublished()
          }}
        />
      ) : null}

      <Drawer
        visible={menu}
        onClose={() => setMenu(false)}
        bot={bot}
        email={email}
        onNewChat={newChat}
        onOpen={(row) => {
          bot.openSession(row)
          setTab("chat")
          setMenu(false)
        }}
        onLogout={() => {
          setMenu(false)
          askLogout()
        }}
      />
      <ToastHost />
    </View>
  )
}
