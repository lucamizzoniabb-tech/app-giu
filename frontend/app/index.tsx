import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, H2, Header, Icon, Loading, Muted, Pad, Screen, Segmented, Select, StatoChip } from "@/src/ui";
import { api } from "@/src/api";
import { STATI, docUrl, fmtDate, openUrl } from "@/src/constants";
import { LocandinaThumb, RegolamentoBtn } from "@/src/components/Locandina";
import { UserActions } from "@/src/components/UserActions";

function GaraRow({ g, i }: any) {
  const router = useRouter();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 40)}>
      <Card style={{ padding: spacing.md, gap: spacing.md }} testID={`gara-card-${g.id}`}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <LocandinaThumb g={g} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              <Chip label={g.specialita} bg={colors.brandSoft} fg={colors.brand} />
              <StatoChip stato={g.stato} />
              <Chip label={g.tipo} />
            </View>
            <Text style={s.title} numberOfLines={2}>{g.nome}</Text>
            <View style={s.meta}><Icon name="calendar" size={13} color={colors.muted} /><Muted>{fmtDate(g.data)}</Muted></View>
            <View style={s.meta}><Icon name="map-pin" size={13} color={colors.muted} /><Muted numberOfLines={1} style={{ flex: 1 }}>{g.luogo}</Muted></View>
          </View>
        </View>
        <Text style={s.settori} testID={`gara-settori-${g.id}`}>{g.n_iscritti}/{g.max_iscritti} iscritti{g.settori_preview ? ` => ${g.settori_preview}` : ""}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <RegolamentoBtn g={g} />
          <Btn flex small variant="outline" title="Dettaglio" onPress={() => router.push(`/gara/${g.id}?tab=campo`)} testID={`gara-dettaglio-${g.id}`} />
          <Btn flex small icon="radio" title="Classifica Live" onPress={() => router.push(`/gara/${g.id}`)} testID={`gara-classifica-${g.id}`} />
        </View>
      </Card>
    </Animated.View>
  );
}

function Campionati({ list }: any) {
  const router = useRouter();
  if (!list.length) return null;
  return (
    <View style={{ gap: spacing.md }} testID="campionati-section">
      <H2>Campionati</H2>
      <Card>
        {list.map((c: any) => (
          <Pressable key={c.id} onPress={() => router.push(`/campionato/${c.id}`)} testID={`campionato-link-${c.id}`} style={({ pressed }) => [s.link, pressed && { backgroundColor: colors.surfaceSecondary }]}>
            <Icon name="trophy" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}><Text style={s.linkT}>{c.nome}</Text><Muted>{c.specialita} · {c.anno} · {c.prove.length} prove</Muted></View>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

function Documenti({ docs }: any) {
  const [sp, setSp] = useState("");
  const [anno, setAnno] = useState("");
  const specs = [...new Set(docs.map((d: any) => d.specialita))] as string[];
  const anni = [...new Set(docs.map((d: any) => String(d.anno)))] as string[];
  const list = docs.filter((d: any) => (!sp || d.specialita === sp) && (!anno || String(d.anno) === anno));
  return (
    <View style={{ gap: spacing.md }} testID="documenti-section">
      <H2>Circolari e Regolamenti</H2>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Select style={{ flex: 1 }} testID="doc-filter-specialita" value={sp} onChange={setSp} options={[{ value: "", label: "Tutte le specialità" }, ...specs.map((x) => ({ value: x, label: x }))]} />
        <Select style={{ width: 130 }} testID="doc-filter-anno" value={anno} onChange={setAnno} options={[{ value: "", label: "Tutti gli anni" }, ...anni.map((x) => ({ value: x, label: x }))]} />
      </View>
      <Card>
        {list.map((d: any) => (
          <Pressable key={d.id} onPress={() => openUrl(docUrl(d))} testID={`doc-link-${d.id}`} style={({ pressed }) => [s.link, pressed && { backgroundColor: colors.surfaceSecondary }]}>
            <Icon name="file-text" size={18} color={colors.error} />
            <View style={{ flex: 1 }}><Text style={s.linkT}>{d.titolo}</Text><Muted>{d.specialita} · {d.anno}</Muted></View>
            <Icon name="external-link" size={15} color={colors.muted} />
          </Pressable>
        ))}
        {!list.length && <View style={{ paddingHorizontal: spacing.md }}><Empty text="Nessun documento." /></View>}
      </Card>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [gare, setGare] = useState<any[] | null>(null);
  const [camp, setCamp] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [err, setErr] = useState(false);
  const [filtro, setFiltro] = useState("");
  const load = useCallback(async () => {
    try {
      const [g, c, d] = await Promise.all([api.get("/gare"), api.get("/campionati"), api.get("/documenti")]);
      setGare(g); setCamp(c); setDocs(d); setErr(false);
    } catch { setErr(true); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const live = (gare || []).filter((g) => g.stato === "In Corso Live");
  const list = (gare || []).filter((g) => !filtro || g.stato === filtro)
    .sort((a, b) => Number(b.stato === "In Corso Live") - Number(a.stato === "In Corso Live") || a.data.localeCompare(b.data));
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header brand right={<UserActions />} />
      <Screen onRefresh={load} sticky={[1]}>
        <Pad style={{ paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
          <Text style={s.kicker}>PESCA SPORTIVA · GARE & CLASSIFICHE</Text>
          <Text style={s.hero}>Sorteggi, pesa e classifiche <Text style={{ color: colors.brand }}>in tempo reale.</Text></Text>
          {live.map((g) => (
            <Pressable key={g.id} onPress={() => router.push(`/gara/${g.id}`)} testID="live-banner" style={s.live}>
              <View style={s.dot} /><Text style={s.liveT}>LIVE</Text>
              <Text style={{ flex: 1, fontWeight: "600", color: colors.onSurface }} numberOfLines={1}>{g.nome}</Text>
              <Icon name="chevron-right" size={18} color={colors.errorStrong} />
            </Pressable>
          ))}
        </Pad>
        <Segmented prefix="filtro-stato" value={filtro} onChange={setFiltro} items={[["", "Tutte"], ...STATI.map((x) => [x, x] as [string, string])]} />
        <Pad style={{ paddingTop: spacing.lg, gap: spacing.xxl }}>
          <View style={{ gap: spacing.md }} testID="gare-list">
            {gare === null && !err && <Loading />}
            {err && <View style={{ gap: spacing.sm }}><Empty text="Impossibile caricare le gare." /><Btn small variant="outline" icon="refresh-cw" title="Riprova" onPress={load} testID="retry-btn" style={{ alignSelf: "flex-start" }} /></View>}
            {gare && !list.length && <Empty text="Nessuna gara trovata." />}
            {list.map((g, i) => <GaraRow key={g.id} g={g} i={i} />)}
          </View>
          <Campionati list={camp} />
          <Documenti docs={docs} />
        </Pad>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 2.5, color: colors.muted },
  hero: { fontSize: 32, lineHeight: 36, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.8 },
  live: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.errorSoft, borderWidth: 1, borderColor: colors.errorSoft, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 52 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error },
  liveT: { fontWeight: "800", color: colors.errorStrong },
  title: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  settori: { fontSize: 12, color: colors.onSurfaceSecondary, fontVariant: ["tabular-nums"] },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  linkT: { fontWeight: "700", color: colors.onSurface },
});
