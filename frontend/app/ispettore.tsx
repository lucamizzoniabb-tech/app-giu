import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Header, Loading, MISURA_STATO, Muted, Pad, Screen, Segmented } from "@/src/ui";
import { Guard, useAuth } from "@/src/auth";
import { api, errMsg, usePoll } from "@/src/api";
import { fmtTime, puntiPreview } from "@/src/constants";
import { useFeedback } from "@/src/feedback";
import { GaraTimer } from "@/src/components/GaraTimer";
import { ClassificaView, ListaPrede } from "@/src/components/classifica";
import { PesaCard } from "@/src/components/pesa";
import { Chat } from "@/src/components/Chat";
import { UserActions } from "@/src/components/UserActions";

function LiveCls({ garaId, render }: any) {
  const { data } = usePoll(() => api.get(`/gare/${garaId}/classifica`), 3000, garaId);
  return data ? render(data) : <Loading />;
}

function Inviti({ inviti, onDone }: any) {
  const { toast } = useFeedback();
  if (!inviti?.length) return null;
  const rispondi = async (id: string, azione: string) => {
    try { await api.post(`/inviti/${id}/${azione}`); toast(azione === "accetta" ? "Invito accettato" : "Invito rifiutato"); onDone(); } catch (er) { toast(errMsg(er), "error"); }
  };
  return (
    <View style={{ gap: spacing.sm }} testID="isp-inviti">
      {inviti.map((i: any) => (
        <Card key={i.id} testID={`isp-invito-${i.id}`} style={{ padding: spacing.md, gap: spacing.sm, borderColor: colors.warning }}>
          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: colors.warningStrong }}>INVITO DA {String(i.invitato_da).toUpperCase()}</Text>
          <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }}>{i.gara_nome}</Text>
          <Muted>SETTORE {i.settore}</Muted>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Btn flex variant="success" title="Accetta" onPress={() => rispondi(i.id, "accetta")} testID="isp-accetta-invito" />
            <Btn flex variant="outline" title="Rifiuta" onPress={() => rispondi(i.id, "rifiuta")} testID="isp-rifiuta-invito" />
          </View>
        </Card>
      ))}
    </View>
  );
}

function IspettoreView() {
  const { user } = useAuth() as any;
  const { toast } = useFeedback();
  const { data, reload } = usePoll(() => api.get("/ispettore/live"), 2500);
  const [specie, setSpecie] = useState<any[]>([]);
  const [tab, setTab] = useState("misure");
  const prev = useRef<Record<string, string> | null>(null);
  useEffect(() => { api.get("/specie").then(setSpecie).catch(() => {}); }, []);
  useEffect(() => {
    if (!data?.catture) return;
    const m = Object.fromEntries(data.catture.map((c: any) => [c.id, c.stato]));
    if (prev.current) data.catture.forEach((c: any) => {
      if (prev.current![c.id] === "IN_ATTESA" && c.stato !== "IN_ATTESA") toast(`Misura ${MISURA_STATO[c.stato].t.toLowerCase()}${c.motivo ? `: ${c.motivo}` : ""}`, c.stato === "APPROVATA" ? "success" : "error");
    });
    prev.current = m;
  }, [data]); // eslint-disable-line
  const header = <Header back title="Ispettore" right={<UserActions hidePanel />} />;
  if (!data) return <View style={{ flex: 1 }}>{header}<Loading /></View>;
  if (!data.gara) return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>{header}
      <Screen onRefresh={reload}><Pad style={{ paddingTop: spacing.lg }}>
        <Inviti inviti={data.inviti} onDone={reload} />
        {!data.inviti?.length && <Empty testID="isp-no-gara" text="Nessuna gara: attendi l'invito del giudice." />}
      </Pad></Screen>
    </View>
  );
  const { gara: g, iscritti, catture, messaggi, settore } = data;
  const surf = g.specialita === "Surf Casting";
  const iscMap = Object.fromEntries(iscritti.map((i: any) => [i.id, i]));
  const rows = iscritti.map((i: any) => {
    const cs = catture.filter((c: any) => c.iscritto_id === i.id).map((c: any) => {
      const pv = surf ? puntiPreview(specie.find((x) => x.name === c.specie), c.cm, g) : null;
      return { ...c, punti: surf ? pv?.p ?? 0 : Number(c.peso || 0), dettaglio: pv ? { sotto: pv.sotto, tabella: pv.tab, bonus: pv.bonus } : null };
    });
    const ok = cs.filter((c: any) => c.stato === "APPROVATA");
    return { id: i.id, picchetto: i.picchetto, nome: `${i.nome} ${i.cognome}`, settore: i.settore, societa: i.societa, gruppo: i.gruppo, colore: i.colore, cartellino_chiuso: i.cartellino_chiuso, catture: cs, n_pesci: ok.length, tot: ok.reduce((t: number, c: any) => t + c.punti, 0) };
  });
  const sett = data.settori || [settore];
  const tec = g.settori?.some((x: any) => x.tecnico && sett.includes(x.lettera));
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {header}
      <Screen sticky={[1]} onRefresh={reload}>
        <Pad style={{ paddingVertical: spacing.lg }}>
          <Inviti inviti={data.inviti} onDone={reload} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ minWidth: 56, height: 56, paddingHorizontal: 8, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: tec ? colors.technicalSector : colors.onSurface }} testID="isp-settore">
              <Text style={{ fontSize: 24, fontWeight: "900", color: tec ? colors.onTechnical : colors.surface }}>{sett.join("")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: colors.muted }}>{sett.length > 1 ? "SETTORI" : "SETTORE"} {sett.join(", ")}{tec ? " · TECNICO" : ""}</Text>
              <Text style={{ fontWeight: "800", fontSize: 16, color: colors.onSurface }} numberOfLines={2}>{g.nome}</Text>
            </View>
          </View>
          <GaraTimer gara={g} compact />
          {g.stato === "Conclusa" && <Text style={{ backgroundColor: colors.surfaceTertiary, padding: spacing.sm, borderRadius: radius.sm, color: colors.onSurface }} testID="isp-gara-chiusa">Gara conclusa.</Text>}
        </Pad>
        <Segmented prefix="isp-tab" value={tab} onChange={setTab} items={[["misure", "Misure"], ["storico", `Storico (${catture.length})`], ["classifica", "Classifica"], ["prede", "Prede"], ["chat", "Chat"]]} />
        <Pad style={{ paddingTop: spacing.lg }}>
          {tab === "misure" && rows.map((r: any) => <PesaCard key={r.id} r={r} gara={g} specie={specie} surf={surf} locked={g.stato === "Conclusa"} onChange={reload} isp />)}
          {tab === "storico" && (
            <View style={{ gap: spacing.sm }} testID="isp-storico">
              {catture.map((c: any) => (
                <Card key={c.id} testID={`isp-misura-${c.id}`} style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <Text style={{ width: 32, fontSize: 18, fontWeight: "800", color: colors.onSurface }}>{iscMap[c.iscritto_id]?.picchetto}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.onSurface }}>{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}</Text>
                    <Muted>{iscMap[c.iscritto_id]?.cognome} · {fmtTime(c.created_at)} · {c.inviato_da}</Muted>
                    {!!c.motivo && <Text style={{ fontSize: 12, color: colors.errorStrong }}>{c.motivo}</Text>}
                  </View>
                  <Chip label={MISURA_STATO[c.stato].t} bg={MISURA_STATO[c.stato].bg} fg={MISURA_STATO[c.stato].fg} />
                </Card>
              ))}
              {!catture.length && <Empty text="Nessuna misura." />}
            </View>
          )}
          {tab === "classifica" && <LiveCls garaId={g.id} render={(d: any) => <ClassificaView data={d.classifica} gara={d.gara} />} />}
          {tab === "prede" && <LiveCls garaId={g.id} render={(d: any) => <ListaPrede classifica={d.classifica} />} />}
          {tab === "chat" && <Chat garaId={g.id} messaggi={messaggi} me={user.username} onSent={reload} />}
        </Pad>
      </Screen>
    </View>
  );
}

export default function Ispettore() {
  return <Guard roles={["ISPETTORE"]}><IspettoreView /></Guard>;
}
