import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Empty, Header, Label, Loading, Muted, Pad, Screen, Segmented, Select, StatoChip } from "@/src/ui";
import { Guard, useAuth } from "@/src/auth";
import { api, errMsg, usePoll } from "@/src/api";
import { SPECIALITA, TIPI, fmtDate, opts } from "@/src/constants";
import { useFeedback } from "@/src/feedback";
import { GaraTimer } from "@/src/components/GaraTimer";
import { CampoGara, ClassificaView, ListaPrede } from "@/src/components/classifica";
import { PesaLive } from "@/src/components/pesa";
import { Validazione } from "@/src/components/Validazione";
import { Chat } from "@/src/components/Chat";
import { IscrittiPanel } from "@/src/components/iscritti";
import { GiudiceIspettori } from "@/src/components/GiudiceIspettori";
import { LocandinaUpload } from "@/src/components/Locandina";

function NumSet({ label, k, g, patch, locked }: any) {
  const [v, setV] = useState(String(g[k] ?? 0));
  useEffect(() => { setV(String(g[k] ?? 0)); }, [g[k]]); // eslint-disable-line
  const commit = () => { if (Number(v) !== Number(g[k] ?? 0)) patch({ [k]: Number(v) || 0 }); };
  return (
    <View style={{ flexBasis: "30%", flexGrow: 1, gap: spacing.xs }}>
      <Label>{label}</Label>
      <TextInput testID={`set-${k}`} editable={!locked} keyboardType="number-pad" value={v} onChangeText={setV} onBlur={commit} onSubmitEditing={commit}
        style={{ height: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md - 2, paddingHorizontal: spacing.md, fontSize: 15, color: colors.onSurface, backgroundColor: locked ? colors.surfaceTertiary : colors.surface }} />
    </View>
  );
}

function Console() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth() as any;
  const { toast, confirm } = useFeedback();
  const { data, error, reload } = usePoll(() => api.get(`/gare/${id}/live`), 2500, id);
  const [specie, setSpecie] = useState<any[]>([]);
  const [tab, setTab] = useState("iscritti");
  const seen = useRef<Set<string> | null>(null);
  const msgSeen = useRef<string | null>(null);
  useEffect(() => { api.get("/specie").then(setSpecie).catch(() => {}); }, []);
  useEffect(() => {
    if (!data) return;
    const pend = data.catture.filter((c: any) => c.stato === "IN_ATTESA").map((c: any) => c.id);
    if (seen.current) {
      const nuove = pend.filter((p: string) => !seen.current!.has(p)).length;
      if (nuove) toast(`${nuove} nuova misura da validare`, "warning", { label: "Vedi", onPress: () => setTab("validazione") });
    }
    seen.current = new Set(pend);
    const last = data.messaggi[data.messaggi.length - 1];
    if (msgSeen.current && last && last.id !== msgSeen.current && last.da !== user.username) toast(`${last.da_nome}: ${last.testo}`, "info");
    msgSeen.current = last?.id || "none";
  }, [data]); // eslint-disable-line

  if (error && !data) return <View style={{ flex: 1 }}><Header back title="Gara" /><Pad><Empty text={errMsg(error)} /></Pad></View>;
  if (!data) return <View style={{ flex: 1 }}><Header back title="Gara" /><Loading /></View>;
  const { gara: g, classifica, catture, messaggi, ispettori } = data;
  const pending = catture.filter((c: any) => c.stato === "IN_ATTESA").length;
  const locked = g.stato === "Conclusa";
  const setLock = locked || (g.timer?.stato || "FERMO") !== "FERMO";
  const patch = async (body: any) => { try { await api.patch(`/gare/${id}`, body); reload(); } catch (e) { toast(errMsg(e), "error"); } };
  const chiudi = async () => {
    if (!(await confirm("Chiudere la gara? Le misure verranno bloccate e la classifica diventerà definitiva.", "Chiudi gara"))) return;
    try { await api.post(`/gare/${id}/chiudi`); toast("Gara chiusa"); reload(); } catch (e) { toast(errMsg(e), "error"); }
  };
  const TABS: [string, string, number?][] = [["iscritti", "Iscritti"], ["campo", "Campo gara"], ["ispettori", "Ispettori"], ["pesa", "Pesa Live"], ["validazione", "Validazione", pending], ["classifica", "Classifica"], ["prede", "Prede"], ["chat", "Chat"]];
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header back title={g.nome} right={<Btn small variant="outline" icon="monitor" onPress={() => router.push(`/schermo/${id}`)} testID="schermo-btn" />} />
      <Screen sticky={[1]} onRefresh={reload}>
        <Pad style={{ paddingVertical: spacing.lg }}>
          <StatoChip stato={g.stato} testID="giudice-gara-stato" />
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.onSurface }} testID="giudice-gara-nome">{g.nome}</Text>
          <Muted>{fmtDate(g.data)} · {g.luogo}</Muted>
          <LocandinaUpload gara={g} onChange={reload} />
          {!locked && <Btn small variant="outline" icon="lock" title="Chiudi gara" onPress={chiudi} testID="chiudi-gara-btn" style={{ alignSelf: "flex-start" }} />}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Select style={{ flex: 1 }} label="Specialità" testID="specialita-select" disabled={setLock} value={g.specialita} onChange={(v) => patch({ specialita: v })} options={opts(SPECIALITA)} />
            <Select style={{ flex: 1 }} label="Tipo gara" testID="tipo-select" disabled={setLock} value={g.tipo} onChange={(v) => patch({ tipo: v })} options={opts(TIPI)} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <NumSet label="Durata min" k="durata_min" g={g} patch={patch} locked={setLock} />
            {g.specialita === "Surf Casting" && <NumSet label="Bonus pesce" k="bonus_pesce" g={g} patch={patch} locked={setLock} />}
            {g.specialita === "Surf Casting" && <NumSet label="Preda tecnica" k="preda_tecnica" g={g} patch={patch} locked={setLock} />}
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceSecondary, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm }} testID="gara-badge">
            {g.specialita} | {g.tipo} | {g.n_iscritti} iscritti | {g.settori_label || g.settori_preview || "—"}
          </Text>
          <GaraTimer gara={g} controls={!locked} isAdmin={user.role === "ADMIN"} onChange={reload} />
        </Pad>
        <Segmented prefix="giudice-tab" value={tab} onChange={setTab} items={TABS} />
        <Pad style={{ paddingTop: spacing.lg }}>
          {tab === "iscritti" && <IscrittiPanel gara={g} onChange={reload} />}
          {tab === "campo" && <CampoGara individui={classifica.individui} settori={g.settori} />}
          {tab === "ispettori" && <GiudiceIspettori gara={g} />}
          {tab === "pesa" && <PesaLive gara={g} classifica={classifica} specie={specie} onChange={reload} />}
          {tab === "validazione" && <Validazione gara={g} catture={catture} individui={classifica.individui} specie={specie} surf={classifica.surf} locked={locked} onChange={reload} />}
          {tab === "classifica" && <ClassificaView data={classifica} gara={g} exportable />}
          {tab === "prede" && <ListaPrede classifica={classifica} />}
          {tab === "chat" && <Chat garaId={id} messaggi={messaggi} me={user.username} destinatari={ispettori} onSent={reload} />}
        </Pad>
      </Screen>
    </View>
  );
}

export default function Giudice() {
  return <Guard roles={["ADMIN", "GIUDICE"]}><Console /></Guard>;
}
