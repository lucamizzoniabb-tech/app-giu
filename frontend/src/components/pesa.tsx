import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Icon, MISURA_STATO, Segmented, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { fmt, puntiPreview } from "@/src/constants";
import { useFeedback } from "@/src/feedback";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "del"];

export function NumPad({ value, onChange, onOk, max = 4, busy, testID }: any) {
  const press = (k: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (k === "del") return onChange(value.slice(0, -1));
    if (k === "C") return onChange("");
    if (value.length >= max) return;
    onChange(value === "0" ? k : value + k);
  };
  return (
    <View style={s.pad} testID={testID}>
      <View style={s.grid}>
        {KEYS.map((k) => (
          <Pressable key={k} testID={`${testID}-${k}`} onPress={() => press(k)} style={({ pressed }) => [s.key, pressed && { transform: [{ scale: 0.95 }], backgroundColor: colors.surfaceTertiary }]}>
            {k === "del" ? <Icon name="delete" size={22} /> : <Text style={[s.keyT, k === "C" && { color: colors.errorStrong }]}>{k}</Text>}
          </Pressable>
        ))}
      </View>
      <Btn variant="success" icon="check" title="Invia" onPress={onOk} busy={busy} testID={`${testID}-ok`} style={{ height: 54 }} />
    </View>
  );
}

function AddForm({ gara, iscritto, specie, surf, onDone }: any) {
  const { toast } = useFeedback();
  const [sp, setSp] = useState("");
  const [val, setVal] = useState("");
  const [pad, setPad] = useState(false);
  const [busy, setBusy] = useState(false);
  const spObj = specie.find((x: any) => x.name === sp);
  const prev = surf ? puntiPreview(spObj, val, gara) : null;
  const pk = iscritto.picchetto;
  const submit = async () => {
    if (surf && !sp) return toast("Seleziona la specie", "error");
    if (!val) return toast(surf ? "Inserisci i cm" : "Inserisci il peso", "error");
    setBusy(true);
    try {
      await api.post(`/gare/${gara.id}/catture`, { iscritto_id: iscritto.id, specie: surf ? sp : "Pesata", cm: surf ? Number(val) : null, peso: surf ? null : Number(val) });
      setVal(""); setPad(false); onDone();
    } catch (er) { toast(errMsg(er), "error"); }
    setBusy(false);
  };
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {surf && <Select style={{ flex: 1 }} testID={`pesa-specie-${pk}`} placeholder="Specie" label="" value={sp} onChange={(v) => { setSp(v); setPad(true); }} options={specie.map((x: any) => ({ value: x.name, label: `${x.name} (${x.min})` }))} />}
        <Pressable testID={`pesa-${surf ? "cm" : "peso"}-${pk}`} onPress={() => setPad(!pad)} style={[s.val, surf ? { width: 96 } : { flex: 1 }, pad && { borderColor: colors.brand, borderWidth: 2 }]}>
          {val ? <Text style={s.valT}>{val}<Text style={s.unit}> {surf ? "cm" : "g"}</Text></Text> : <Text style={s.unit}>{surf ? "cm" : "peso g"}</Text>}
        </Pressable>
      </View>
      {prev && <Text testID={`pesa-preview-${pk}`} style={[s.prev, { color: prev.sotto ? colors.errorStrong : colors.successStrong }]}>{prev.sotto ? `Sotto misura (min ${spObj.min} cm) · preda tecnica ${prev.p} pt` : `${prev.p} punti`}</Text>}
      {pad && <NumPad value={val} onChange={setVal} max={surf ? 3 : 6} onOk={submit} busy={busy} testID={`numpad-${pk}`} />}
    </View>
  );
}

export function PesaCard({ r, gara, specie, surf, locked, onChange, isp }: any) {
  const { toast, confirm } = useFeedback();
  const del = async (id: string) => { try { await api.del(`/catture/${id}`); onChange(); } catch (er) { toast(errMsg(er), "error"); } };
  const cart = async (chiuso: boolean) => {
    if (chiuso && !(await confirm(`Chiudere il cartellino di ${r.nome} (Pic ${r.picchetto})?${isp ? " Non potrai più inserire prede." : ""}`))) return;
    try { await api.post(`/gare/${gara.id}/iscritti/${r.id}/cartellino`, { chiuso }); toast(chiuso ? "Cartellino chiuso" : "Cartellino riaperto"); onChange(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const chiuso = r.cartellino_chiuso;
  return (
    <Card testID={`pesa-card-${r.picchetto}`} style={[{ padding: spacing.md }, r.colore && { borderLeftWidth: 5, borderLeftColor: r.colore }]}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
        <Text style={s.pk}>{r.picchetto}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.name} numberOfLines={1}>{r.nome}</Text>
            {chiuso ? (
              <View style={s.closed} testID={`cartellino-chiuso-${r.picchetto}`}>
                <Icon name="lock" size={11} color={colors.surface} /><Text style={s.closedT}>CHIUSO</Text>
                {!isp && !locked && <Pressable testID={`cartellino-riapri-${r.picchetto}`} onPress={() => cart(false)} hitSlop={10} style={{ marginLeft: 4 }}><Icon name="lock-open" size={12} color={colors.surface} /></Pressable>}
              </View>
            ) : !locked && (
              <Pressable testID={`cartellino-chiudi-${r.picchetto}`} onPress={() => cart(true)} hitSlop={10} style={s.lockBtn} accessibilityLabel="Chiudi cartellino"><Icon name="lock" size={13} color={colors.muted} /></Pressable>
            )}
          </View>
          <Text style={s.sub} numberOfLines={1}>{r.settore} · {r.societa}{r.gruppo ? ` · ${r.gruppo}` : ""}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.tot} testID={`pesa-tot-${r.picchetto}`}>{fmt(r.tot)}</Text>
          <Text style={s.small}>{r.n_pesci} CATTURE</Text>
        </View>
      </View>
      {r.catture.length > 0 && (
        <View style={s.tbl}>
          {r.catture.map((c: any) => (
            <View key={c.id} style={s.tr}>
              <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{surf ? `${c.specie}${c.peso ? ` · ${c.peso}g` : ""}` : "Pesata"}</Text>
              {surf ? (
                <>
                  <Text style={[s.td, { width: 40 }]}>{c.cm} cm</Text>
                  <Text style={[s.td, { width: 70, fontWeight: "800", color: c.dettaglio?.sotto ? colors.errorStrong : colors.onSurface }]}>{fmt(c.punti)} <Text style={s.small}>{c.dettaglio?.sotto ? "p.tec" : c.dettaglio?.bonus ? `${c.dettaglio.tabella}+${c.dettaglio.bonus}` : ""}</Text></Text>
                </>
              ) : <Text style={[s.td, { fontWeight: "800" }]}>{fmt(c.peso)} g</Text>}
              <View style={{ width: 84, alignItems: "flex-end" }}>
                {c.stato && c.stato !== "APPROVATA" ? <Chip label={MISURA_STATO[c.stato].t} bg={MISURA_STATO[c.stato].bg} fg={MISURA_STATO[c.stato].fg} />
                  : !locked && !isp && <Pressable testID={`pesa-del-${c.id}`} onPress={() => del(c.id)} hitSlop={10} accessibilityLabel="Elimina"><Icon name="trash-2" size={16} color={colors.muted} /></Pressable>}
              </View>
            </View>
          ))}
        </View>
      )}
      {!locked && !chiuso && <AddForm gara={gara} iscritto={r} specie={specie} surf={surf} onDone={() => { if (isp) toast(`Misura inviata · Pic ${r.picchetto}`); onChange(); }} />}
    </Card>
  );
}

export function PesaLive({ gara, classifica, specie, onChange }: any) {
  const [vista, setVista] = useState("ind");
  const [settore, setSettore] = useState("ALL");
  if (!classifica?.individui.length) return <Empty text="Sorteggio non ancora effettuato." />;
  const locked = gara.stato === "Conclusa";
  const rows = classifica.individui.filter((r: any) => settore === "ALL" || r.settore === settore);
  return (
    <View style={{ gap: spacing.md }} testID="pesa-live">
      <Select testID="pesa-settore-filter" value={settore} onChange={setSettore} options={[{ value: "ALL", label: "Tutti i settori" }, ...classifica.settori.map((x: any) => ({ value: x.lettera, label: `Settore ${x.lettera}` }))]} />
      {classifica.gruppi.length > 0 && <View style={{ marginHorizontal: -spacing.lg }}><Segmented items={[["ind", "Individuale"], ["grp", "Gruppi"]]} value={vista} onChange={setVista} prefix="pesa-vista" /></View>}
      {vista === "ind" ? rows.map((r: any) => <PesaCard key={r.id} r={r} gara={gara} specie={specie} surf={classifica.surf} locked={locked} onChange={onChange} />)
        : classifica.gruppi.map((g: any) => (
          <Card key={g.gruppo} style={{ padding: spacing.md, gap: 4 }} testID={`pesa-gruppo-${g.gruppo}`}>
            <View style={s.between}><Text style={s.name}>{g.gruppo}</Text><Text style={s.tot}>{fmt(g.tot)}</Text></View>
            <Text style={s.sub}>{g.societa} · Pen {g.pen}</Text>
            {g.membri.map((m: any) => <View key={m.id} style={[s.between, s.tr]}><Text style={s.td}>{m.settore}{m.picchetto} · {m.nome}</Text><Text style={s.td}>{fmt(m.tot)}</Text></View>)}
          </Card>
        ))}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: 6, gap: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  key: { width: "31.8%", flexGrow: 1, height: 56, borderRadius: radius.sm + 2, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  keyT: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  val: { height: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md - 2, paddingHorizontal: spacing.md, justifyContent: "center", alignSelf: "flex-end" },
  valT: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  unit: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  prev: { fontSize: 12, fontWeight: "700" },
  pk: { fontSize: 24, fontWeight: "800", color: colors.onSurface, width: 40, fontVariant: ["tabular-nums"] },
  name: { fontSize: 15, fontWeight: "700", color: colors.onSurface, flexShrink: 1 },
  sub: { fontSize: 12, color: colors.muted },
  small: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  tot: { fontSize: 18, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] },
  closed: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.onSurface, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  closedT: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  lockBtn: { width: 26, height: 26, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  tbl: { marginTop: spacing.sm },
  tr: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider },
  td: { fontSize: 13, color: colors.onSurface },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
