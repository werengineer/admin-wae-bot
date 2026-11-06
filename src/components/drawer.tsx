// The sessions column of the web page (New chat, Recents, "Always allowed") as a menu that slides in from the left, with the account and Log out at the bottom.
import { LogOut, Plus, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { FlatList, Modal, Pressable, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { radius, useTheme } from "../theme"
import type { Bot, SessionRow } from "../use-bot"
import { IconBtn, s } from "./ui"

export function Drawer({ visible, onClose, bot, email, onNewChat, onOpen, onLogout }: { visible: boolean; onClose: () => void; bot: Bot; email: string; onNewChat: () => void; onOpen: (row: SessionRow) => void; onLogout: () => void }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: "84%", maxWidth: 340, backgroundColor: t.sidebar, borderRightWidth: 1, borderColor: t.border, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ padding: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="New chat" onPress={onNewChat} style={[s.row, { gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.sm }]}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
                <Plus size={14} color={t.onPrimary} />
              </View>
              <Text style={{ color: t.fg, fontSize: 14, fontWeight: "500" }}>New chat</Text>
            </Pressable>
          </View>
          <Text style={{ color: t.mutedFg, fontSize: 12, fontWeight: "500", paddingHorizontal: 20, paddingBottom: 4 }}>Recents</Text>
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 12 }}
            data={bot.sessions}
            keyExtractor={(x) => x.id}
            refreshing={false}
            onRefresh={bot.loadSessions}
            ListEmptyComponent={<Text style={{ color: t.mutedFg, fontSize: 12, paddingHorizontal: 12, paddingVertical: 6 }}>{bot.sessionsLoaded || bot.loadError ? "No sessions yet" : "Loading…"}</Text>}
            renderItem={({ item }) => (
              <View style={[s.row, { borderRadius: radius.sm, backgroundColor: item.id === bot.sessionId ? t.muted : "transparent" }]}>
                <Pressable onPress={() => onOpen(item)} style={{ flex: 1, paddingVertical: 8, paddingLeft: 12, paddingRight: 4 }}>
                  <View style={[s.row, { gap: 6 }]}>
                    {item.running ? <View accessibilityLabel="Answering right now" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primary }} /> : null}
                    <Text numberOfLines={1} style={{ color: t.fg, fontSize: 14, flex: 1 }}>{item.title}</Text>
                  </View>
                  {item.projectName ? <Text numberOfLines={1} style={{ color: t.mutedFg, fontSize: 12 }}>{item.projectName}</Text> : null}
                </Pressable>
                <IconBtn label="Delete chat" onPress={() => bot.deleteChat(item)}>
                  <Trash2 size={14} color={t.mutedFg} />
                </IconBtn>
              </View>
            )}
          />
          {bot.rules.length > 0 ? (
            <View style={{ borderTopWidth: 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Pressable onPress={() => setRulesOpen(!rulesOpen)}>
                <Text style={{ color: t.mutedFg, fontSize: 12, fontWeight: "500" }}>{rulesOpen ? "▾" : "▸"} Always allowed ({bot.rules.length})</Text>
              </Pressable>
              {rulesOpen ? (
                <View style={{ marginTop: 8, gap: 4, maxHeight: 160 }}>
                  {bot.rules.map((r) => (
                    <View key={r.id} style={[s.row, { alignItems: "flex-start", gap: 6 }]}>
                      <Text style={{ color: t.mutedFg, fontSize: 12, flex: 1 }}>{r.label.replace(/^Always allow /, "")}</Text>
                      <IconBtn label="Stop always allowing this" onPress={() => bot.removeRule(r)} style={{ padding: 3 }}>
                        <Trash2 size={12} color={t.mutedFg} />
                      </IconBtn>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={{ borderTopWidth: 1, borderColor: t.border, padding: 12, gap: 8 }}>
            <Text numberOfLines={1} style={{ color: t.mutedFg, fontSize: 12 }}>Signed in as {email}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} style={[s.row, { gap: 8, paddingHorizontal: 8, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border }]}>
              <LogOut size={16} color={t.fg} />
              <Text style={{ color: t.fg, fontSize: 14, fontWeight: "500" }}>Log out</Text>
            </Pressable>
          </View>
        </View>
        <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066" }} />
      </View>
    </Modal>
  )
}
