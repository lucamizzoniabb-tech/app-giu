import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Muted, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { useFeedback } from "@/src/feedback";

const STATO: Record<string, [string, string]> = {
  IN_ATTESA: [colors.warningSoft, colors.warningStrong],
  ACCETTATO: [colors.successSoft, colors.successStrong],
  RIFIUTATO: [colors.errorSoft, colors.errorStrong],
  TERMINATO: [colors.surfaceTertiary, colors.muted],
};

export function GiudiceIspettori({ gara }: any) {
  const { toast, confirm } = useFeedback();
  const [ispettori, setIspettori] = useState<any[]>([]);
  const [inviti, setInviti] = useState<any[]>([]);
  const [isp, setIsp] = useState("");
  const [settore, setSettore] = useState("");
  const load = () => api.get(`/gare/${gara.id}/inviti`).then(setInviti).catch(() => {});
  useEffect(() => { load(); api.get("/ispettori").then(setIspettori).catch(() => {}); }, [gara.id]); // eslint-disable-line
  const letters = (gara.settori || []).map((x: any) => x.lettera);
  const invita = async () => {
    if (!isp || !settore) return toast("Scegli ispettore e settore", "error");
    try { await api.post(`/gare/${gara.id}/inviti`, { ispettore_id: isp, settore }); toast("Invito inviato"); setIsp(""); load(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const revoca = async (id: string) => {
    if (!(await confirm("Revocare l'invito? L'ispettore uscirà dalla gara.", "Revoca"))) return;
    try { await api.del(`/inviti/${id}`); load(); } catch (er) { toast(errMsg(er), "error"); }
  };
  return (
    <View style={{ gap: spacing.md }}>
      {!letters.length && <Empty text="Effettua il sorteggio per assegnare i settori." />}
      {letters.length > 0 && (
        <Card style={{ padding: spacing.md, gap: spacing.md }} testID="invito-form">
          <Select label="Ispettore" testID="invito-ispettore-select" value={isp} onChange={setIsp} options={ispettori.map((u) => ({ value: u.id, label: `${u.username}${u.nome ? ` · ${u.nome}` : ""}` }))} />
          <Select label="Settore" testID="invito-settore-select" value={settore} onChange={setSettore} options={letters.map((l: string) => ({ value: l, label: `SETTORE ${l}` }))} />
          <Btn icon="user-plus" title="Invita" onPress={invita} testID="invito-send-btn" />
        </Card>
      )}
      <Card testID="inviti-list">
        {inviti.map((i) => (
          <View key={i.id} testID={`invito-${i.ispettore_username}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.onSurface, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.surface, fontWeight: "800" }}>{i.settore}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: colors.onSurface }}>{i.ispettore_username}</Text><Muted>{i.ispettore_nome}</Muted></View>
            <Chip label={i.stato.replace("_", " ")} bg={STATO[i.stato]?.[0]} fg={STATO[i.stato]?.[1]} />
            {["IN_ATTESA", "ACCETTATO"].includes(i.stato) && <Btn small variant="dangerGhost" icon="x" onPress={() => revoca(i.id)} testID={`revoca-${i.ispettore_username}`} />}
          </View>
        ))}
        {!inviti.length && <View style={{ paddingHorizontal: spacing.md }}><Empty text="Nessun ispettore invitato." /></View>}
      </Card>
    </View>
  );
}
