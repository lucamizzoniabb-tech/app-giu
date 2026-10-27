import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Field, MISURA_STATO, Muted, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { fmtTime, puntiPreview } from "@/src/constants";
import { useFeedback } from "@/src/feedback";

const PuntiTag = ({ sp, cm, gara }: any) => {
  const p = puntiPreview(sp, cm, gara);
  if (!p) return null;
  return <Text style={{ fontSize: 12, fontWeight: "700", color: p.sotto ? colors.errorStrong : colors.successStrong }}>{p.sotto ? `preda tecnica · ${p.p} pt` : `${p.p} pt`}</Text>;
};

function Pending({ c, isc, specie, surf, gara, onChange }: any) {
  const { toast } = useFeedback();
  const [mode, setMode] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [sp, setSp] = useState(c.specie || "");
  const [cm, setCm] = useState(c.cm != null ? String(c.cm) : c.peso != null ? String(c.peso) : "");
  const act = async (azione: string, extra = {}) => {
    try { await api.put(`/catture/${c.id}`, { azione, ...extra }); toast(azione === "rigetta" ? "Misura rigettata" : "Misura approvata"); onChange(); } catch (er) { toast(errMsg(er), "error"); }
  };
  return (
    <Card testID={`pending-${c.id}`} style={{ padding: spacing.md, gap: spacing.md, borderColor: colors.warning }}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
        <View style={s.tag}><Text style={s.tagT}>{c.settore}{isc?.picchetto}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{isc?.nome}</Text>
          <Muted>da {c.inviato_da} · {fmtTime(c.created_at)}</Muted>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.val}>{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}</Text>
          {surf && <PuntiTag gara={gara} sp={specie.find((x: any) => x.name === c.specie)} cm={c.cm} />}
        </View>
      </View>
      {mode === "rigetta" && (
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
          <Field style={{ flex: 1 }} testID="reject-reason-input" autoFocus placeholder="Motivazione" value={motivo} onChangeText={setMotivo} />
          <Btn variant="danger" title="Rigetta" onPress={() => act("rigetta", { motivo })} testID="reject-confirm-btn" />
        </View>
      )}
      {mode === "correggi" && (
        <View style={{ gap: spacing.sm }}>
          {surf && <Select testID="correct-specie-select" value={sp} onChange={setSp} options={specie.map((x: any) => ({ value: x.name, label: x.name }))} />}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Field style={{ flex: 1 }} testID="correct-cm-input" keyboardType="number-pad" placeholder={surf ? "cm" : "peso g"} value={cm} onChangeText={setCm} />
            <Btn title="Salva e approva" onPress={() => act("correggi", surf ? { specie: sp, cm: Number(cm) } : { peso: Number(cm) })} testID="correct-confirm-btn" />
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Btn flex small variant="success" icon="check" title="Approva" onPress={() => act("approva")} testID={`approve-btn-${c.id}`} />
        <Btn flex small variant="dangerOutline" icon="x" title="Rigetta" onPress={() => setMode(mode === "rigetta" ? null : "rigetta")} testID={`reject-btn-${c.id}`} />
        <Btn flex small variant="outline" icon="pencil" title="Correggi" onPress={() => setMode(mode === "correggi" ? null : "correggi")} testID={`correct-btn-${c.id}`} />
      </View>
    </Card>
  );
}

export function Validazione({ catture, individui, specie, surf, gara, locked, onChange }: any) {
  const map = Object.fromEntries((individui || []).map((i: any) => [i.id, i]));
  const fromIsp = (catture || []).filter((c: any) => c.origine === "ISPETTORE");
  const pend = fromIsp.filter((c: any) => c.stato === "IN_ATTESA");
  const done = fromIsp.filter((c: any) => c.stato !== "IN_ATTESA").slice(0, 40);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.md }} testID="pending-list">
        {pend.map((c: any) => <Pending key={c.id} c={c} isc={map[c.iscritto_id]} specie={specie} surf={surf} gara={gara} onChange={onChange} />)}
        {!pend.length && <Empty testID="no-pending" text="Nessuna misura in attesa." />}
      </View>
      {locked && <Muted>Gara conclusa: misure bloccate.</Muted>}
      {done.length > 0 && (
        <Card>
          {done.map((c: any) => (
            <View key={c.id} style={s.row}>
              <Text style={s.pic}>{c.settore}{map[c.iscritto_id]?.picchetto}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{map[c.iscritto_id]?.nome}</Text>
                <Muted>{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}{c.corretta ? " (corr.)" : ""} · {c.inviato_da} · {fmtTime(c.created_at)}</Muted>
                {surf && <PuntiTag gara={gara} sp={specie.find((x: any) => x.name === c.specie)} cm={c.cm} />}
                {!!c.motivo && <Text style={{ fontSize: 12, color: colors.errorStrong }}>{c.motivo}</Text>}
              </View>
              <Chip label={MISURA_STATO[c.stato].t} bg={MISURA_STATO[c.stato].bg} fg={MISURA_STATO[c.stato].fg} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tag: { backgroundColor: colors.onSurface, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tagT: { color: colors.surface, fontWeight: "800", fontSize: 14 },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  val: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  pic: { width: 40, fontWeight: "800", color: colors.brand, fontSize: 14 },
});
