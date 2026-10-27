import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { fmtTime } from "@/src/constants";
import { useFeedback } from "@/src/feedback";

export function Chat({ garaId, messaggi, me, destinatari, onSent }: any) {
  const { toast } = useFeedback();
  const [testo, setTesto] = useState("");
  const [a, setA] = useState("ALL");
  const ref = useRef<any>(null);
  useEffect(() => { setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50); }, [messaggi?.length]);
  const send = async () => {
    if (!testo.trim()) return;
    try { await api.post(`/gare/${garaId}/messaggi`, { testo, a }); setTesto(""); onSent?.(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const dest = (m: any) => (m.a === "ALL" ? "Tutti" : m.a === "GIUDICE" ? "Giudice" : m.a);
  return (
    <Card testID="chat-panel">
      <ScrollView ref={ref} style={{ height: 380 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }} nestedScrollEnabled>
        {(messaggi || []).map((m: any) => {
          const mine = m.da === me;
          return (
            <View key={m.id} style={[s.bubble, mine ? s.mine : s.other]} testID="chat-message">
              <Text style={[s.meta, mine && { color: "rgba(255,255,255,0.7)" }]}>{m.da_nome}{m.settore ? ` · ${m.settore}` : ""} → {dest(m)} · {fmtTime(m.created_at)}</Text>
              <Text style={[s.txt, mine && { color: colors.onBrandPrimary }]}>{m.testo}</Text>
            </View>
          );
        })}
        {!messaggi?.length && <Text style={s.none}>Nessun messaggio</Text>}
      </ScrollView>
      <View style={s.bar}>
        {destinatari && (
          <Select testID="chat-recipient-select" value={a} onChange={setA} style={{ width: 120 }} label=""
            options={[{ value: "ALL", label: "Tutti" }, ...destinatari.map((d: any) => ({ value: d.username, label: `${d.username} (${d.settore})` }))]} />
        )}
        <TextInput testID="chat-input" style={s.input} placeholder="Messaggio" placeholderTextColor={colors.muted} value={testo} onChangeText={setTesto} onSubmitEditing={send} returnKeyType="send" />
        <Btn icon="send" onPress={send} testID="chat-send-btn" />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: "82%", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brand },
  other: { alignSelf: "flex-start", backgroundColor: colors.surfaceTertiary },
  meta: { fontSize: 10, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 2 },
  txt: { fontSize: 14, color: colors.onSurface },
  none: { textAlign: "center", color: colors.muted, paddingVertical: spacing.xl },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, height: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md - 2, paddingHorizontal: spacing.md, fontSize: 15, color: colors.onSurface },
});
