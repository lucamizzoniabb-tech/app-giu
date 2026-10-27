import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Icon, Loading, Segmented } from "@/src/ui";
import { api, usePoll } from "@/src/api";
import { fmt, fmtTime } from "@/src/constants";
import { GaraTimer } from "@/src/components/GaraTimer";

const VISTE: [string, string][] = [["settori", "Settori"], ["assoluta", "Assoluta"], ["societa", "Società"], ["gruppi", "Squadre"]];

const Riga = ({ pos, first, pic, nome, sub, tot, pen }: any) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, backgroundColor: first ? "rgba(16,185,129,0.15)" : "transparent" }}>
    <View style={{ width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: first ? colors.success : "rgba(255,255,255,0.1)" }}>
      {first ? <Icon name="crown" size={16} color={colors.screenText} /> : <Text style={{ color: colors.screenText, fontWeight: "800" }}>{pos}</Text>}
    </View>
    {!!pic && <Text style={{ width: 44, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.screenAccent }}>{pic}</Text>}
    <View style={{ flex: 1 }}><Text style={{ color: colors.screenText, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>{nome}</Text><Text style={{ color: colors.screenMuted, fontSize: 12 }} numberOfLines={1}>{sub}</Text></View>
    <View style={{ alignItems: "flex-end" }}><Text style={{ color: colors.screenText, fontSize: 20, fontWeight: "800" }}>{tot}</Text><Text style={{ color: colors.screenMuted, fontSize: 11 }}>{pen}</Text></View>
  </View>
);
const Box = ({ title, tecnico, children }: any) => (
  <View style={{ borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.screenCard }}>
    <Text style={{ padding: spacing.sm, fontWeight: "800", fontSize: 15, backgroundColor: tecnico ? colors.technicalSector : "rgba(255,255,255,0.08)", color: tecnico ? colors.onTechnical : colors.screenText }}>{title}</Text>
    {children}
  </View>
);

export default function Schermo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data } = usePoll(() => api.get(`/gare/${id}/classifica`), 3000, id);
  const [vista, setVista] = useState("settori");
  const [auto, setAuto] = useState(true);
  const viste = VISTE.filter(([k]) => k !== "gruppi" || data?.classifica.gruppi.length > 0);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setVista((v) => viste[(viste.findIndex(([k]) => k === v) + 1) % viste.length][0]), 20000);
    return () => clearInterval(t);
  }, [auto, viste.length]); // eslint-disable-line
  if (!data) return <Loading />;
  const { gara: g, classifica: c } = data;
  const prede = c.individui.flatMap((r: any) => r.catture.map((x: any) => ({ ...x, r }))).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg, paddingTop: insets.top }} testID="schermo-page">
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Btn small variant="ghost" icon="chevron-left" onPress={() => router.back()} testID="schermo-back-btn" style={{ backgroundColor: colors.screenCard }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.screenMuted, fontSize: 11, fontWeight: "800", letterSpacing: 2 }}>{g.stato.toUpperCase()} · {g.specialita.toUpperCase()}</Text>
            <Text style={{ color: colors.screenText, fontSize: 22, fontWeight: "900" }} numberOfLines={1} testID="schermo-nome">{g.nome}</Text>
          </View>
        </View>
        <GaraTimer gara={g} big />
      </View>
      <Segmented dark prefix="schermo-vista" value={vista} onChange={(k) => { if (k === "auto") setAuto(!auto); else { setVista(k); setAuto(false); } }} items={[...viste, ["auto", `Rotazione ${auto ? "ON" : "OFF"}`]] as any} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {!c.individui.length ? <Text style={{ color: colors.screenMuted }}>Sorteggio non ancora effettuato.</Text> : (
          <>
            {vista === "settori" && c.settori.map((x: any) => (
              <Box key={x.lettera} title={`SETTORE ${x.lettera}${x.tecnico ? " TECNICO" : ""}`} tecnico={x.tecnico}>
                {x.rows.map((r: any) => <Riga key={r.id} pos={r.pos} first={r.pen === 1 && r.tot > 0} pic={r.picchetto} nome={r.nome} sub={`${r.societa} · ${r.n_pesci} pesci`} tot={fmt(r.tot)} pen={`Pen ${r.pen}`} />)}
              </Box>
            ))}
            {vista === "assoluta" && <Box title="CLASSIFICA ASSOLUTA">{c.assoluta.map((r: any, i: number) => <Riga key={r.id} pos={i + 1} first={i === 0 && r.tot > 0} pic={`${r.settore}${r.picchetto}`} nome={r.nome} sub={r.societa} tot={fmt(r.tot)} pen={`Pen ${r.pen}`} />)}</Box>}
            {vista === "societa" && <Box title="CLASSIFICA SOCIETÀ">{c.societa.map((x: any, i: number) => <Riga key={x.societa} pos={i + 1} first={i === 0 && x.tot > 0} nome={x.societa} sub={x.migliori.join(", ")} tot={`Pen ${x.pen}`} pen={fmt(x.tot)} />)}</Box>}
            {vista === "gruppi" && <Box title="SQUADRE / BOX / COPPIE">{c.gruppi.map((x: any, i: number) => <Riga key={x.gruppo} pos={i + 1} first={i === 0 && x.tot > 0} nome={x.gruppo} sub={x.societa} tot={`Pen ${x.pen}`} pen={fmt(x.tot)} />)}</Box>}
            <Box title="ULTIME PREDE">
              {prede.map((p: any) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm }} testID="schermo-preda">
                  <Text style={{ width: 44, textAlign: "center", fontWeight: "800", color: colors.screenAccent }}>{p.r.settore}{p.r.picchetto}</Text>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.screenText, fontWeight: "700" }}>{c.surf ? `${p.specie} ${p.cm} cm` : `${fmt(p.peso)} g`}</Text><Text style={{ color: colors.screenMuted, fontSize: 12 }}>{p.r.nome} · {fmtTime(p.created_at)}</Text></View>
                  {c.surf && <Text style={{ color: colors.screenText, fontSize: 17, fontWeight: "800" }}>{fmt(p.punti)}</Text>}
                </View>
              ))}
              {!prede.length && <Text style={{ color: colors.screenMuted, padding: spacing.md }}>Nessuna preda</Text>}
            </Box>
          </>
        )}
      </ScrollView>
    </View>
  );
}
