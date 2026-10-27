import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";
import { Card, Chip, Empty, H2, Header, Icon, Loading, Muted, Pad, Screen } from "@/src/ui";
import { api, usePoll } from "@/src/api";
import { fmt, fmtDate } from "@/src/constants";

export default function Campionato() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = usePoll(() => api.get(`/campionati/${id}`), 10000, id);
  if (error && !data) return <View style={{ flex: 1 }}><Header back title="Campionato" /><Pad><Empty text="Campionato non trovato." /></Pad></View>;
  if (!data) return <View style={{ flex: 1 }}><Header back title="Campionato" /><Loading /></View>;
  const { campionato: c, classifica } = data;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header back title={c.nome} />
      <Screen onRefresh={reload}>
        <Pad style={{ paddingVertical: spacing.lg }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            <Chip label={c.specialita} bg={colors.brandSoft} fg={colors.brand} />
            <Chip label={String(c.anno)} />
            <Chip label={`${c.prove.length} prove · ${c.tipo_scarto === "mezzo" ? "mezzo scarto della peggiore" : "scarto prova peggiore"}`} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.onSurface }} testID="campionato-nome">{c.nome}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {c.prove.map((p: any, i: number) => <Text key={p.id} style={{ fontSize: 12, color: colors.onSurfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontWeight: "800" }}>P{i + 1}</Text> {p.nome}{p.data ? ` · ${fmtDate(p.data)}` : ""}</Text>)}
          </View>
          <H2 style={{ marginTop: spacing.md }}>Classifica generale</H2>
          <Card testID="classifica-generale">
            {classifica.map((a: any, i: number) => (
              <View key={a.nome} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: i === 0 ? colors.successSoft : colors.surface }}>
                <View style={{ width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: i === 0 ? colors.success : colors.surfaceTertiary }}>
                  {i === 0 ? <Icon name="crown" size={16} color={colors.onSuccess} /> : <Text style={{ fontWeight: "800", color: colors.onSurface }}>{a.pos}</Text>}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: "700", color: colors.onSurface }} numberOfLines={1}>{a.nome}</Text>
                  <Muted numberOfLines={1}>{a.societa} · {a.presenze}/{c.prove.length} presenze</Muted>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {a.pen_eff.map((p: any, k: number) => {
                  const sc = a.scartate.includes(k);
                  const bg = sc ? (c.tipo_scarto === "mezzo" ? colors.warningSoft : colors.surfaceTertiary) : a.pen[k] == null ? colors.errorSoft : colors.surfaceTertiary;
                  const fg = sc ? (c.tipo_scarto === "mezzo" ? colors.warningStrong : colors.muted) : a.pen[k] == null ? colors.errorStrong : colors.onSurfaceSecondary;
                  return <Text key={k} style={{ fontSize: 11, backgroundColor: bg, color: fg, paddingHorizontal: 5, borderRadius: 4, textDecorationLine: sc && c.tipo_scarto !== "mezzo" ? "line-through" : "none" }}>P{k + 1}:{p}{sc && c.tipo_scarto === "mezzo" ? " ½" : ""}</Text>;
                })}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 18, fontWeight: "800", color: colors.onSurface }}>{a.tot_pen}</Text><Muted>pen · {fmt(a.tot_punti)} pt</Muted></View>
              </View>
            ))}
            {!classifica.length && <View style={{ paddingHorizontal: spacing.md }}><Empty text="Nessuna prova inserita." /></View>}
          </Card>
        </Pad>
      </Screen>
    </View>
  );
}
