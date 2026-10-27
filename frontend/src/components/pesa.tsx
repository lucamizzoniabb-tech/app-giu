import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Icon, MISURA_STATO, Segmented, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { fmt, puntiPreview } from "@/src/constants";
import { useFeedback } from "@/src/feedback";

const KEYS = ["1", "2", "3", "del", "4", "5", "6", "C", "7", "8", "9", "0"];

export function NumPad({ value, onChange, max = 4, testID }: any) {
  const press = (k: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (k === "del") return onChange(value.slice(0, -1));
    if (k === "C") return onChange("");
    if (value.length >= max) return;
    onChange(value === "0" ? k : value + k);
  };
  return (
    <View style={s.grid} testID={testID}>
      {KEYS.map((k) => (
        <Pressable key={k} testID={`${testID}-${k}`} onPress={() => press(k)} style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.border }]}>
          {k === "del" ? <Icon name="delete" size={18} /> : <Text style={[s.keyT, k === "C" && { color: colors.errorStrong }]}>{k}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function AddForm({ gara, iscritto, specie, surf, onDone }: any) {
  const { toast } = useFeedback();
  const insets = useSafeAreaInsets();
  const [sp, setSp] = useState("");
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
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
      setVal(""); setOpen(false); onDone();
    } catch (er) { toast(errMsg(er), "error"); }
    setBusy(false);
  };
  return (
    <>
      <Btn small variant="outline" icon="plus" title={surf ? "Inserisci misura" : "Inserisci peso"} onPress={() => setOpen(true)} testID={`pesa-add-${pk}`} style={{ marginTop: spacing.sm }} />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} testID={`pesa-sheet-close-${pk}`} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.sm }]} testID={`pesa-sheet-${pk}`}>
          <View style={s.sheetHead}>
            <Text style={s.sheetPk}>{pk}</Text>
            <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{iscritto.nome}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} testID={`pesa-sheet-x-${pk}`}><Icon name="x" size={20} color={colors.muted} /></Pressable>
          </View>
          {surf && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
              {specie.map((x: any, i: number) => {
                const on = x.name === sp;
                return (
                  <Pressable key={x.name} testID={`pesa-specie-${pk}-${i}`} onPress={() => setSp(x.name)} style={[s.spChip, on && { backgroundColor: colors.onSurface, borderColor: colors.onSurface }]}>
                    <Text style={[s.spT, on && { color: colors.surface }]}>{x.name} <Text style={{ opacity: 0.6 }}>{x.min}</Text></Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={s.display}>
            <Text style={s.valT} testID={`pesa-${surf ? "cm" : "peso"}-${pk}`}>{val || "0"}<Text style={s.unit}> {surf ? "cm" : "g"}</Text></Text>
            {prev ? <Text testID={`pesa-preview-${pk}`} style={[s.prev, { color: prev.sotto ? colors.errorStrong : colors.successStrong }]} numberOfLines={1}>{prev.sotto ? `Sotto misura · ${prev.p} pt` : `${prev.p} punti`}</Text>
              : <Text style={s.prev2} numberOfLines={1}>{surf ? (sp || "Scegli specie") : ""}</Text>}
          </View>
          <NumPad value={val} onChange={setVal} max={surf ? 3 : 6} testID={`numpad-${pk}`} />
          <Btn variant="success" icon="check" title="Invia" onPress={submit} busy={busy} testID={`numpad-${pk}-ok`} />
        </View>
      </Modal>
    </>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  key: { width: "23%", flexGrow: 1, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  keyT: { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sheetPk: { fontSize: 18, fontWeight: "900", color: colors.surface, backgroundColor: colors.onSurface, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  spChip: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: "center", flexShrink: 0 },
  spT: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  display: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, height: 48, paddingHorizontal: spacing.md, borderRadius: radius.md - 2, borderWidth: 2, borderColor: colors.brand },
  valT: { fontSize: 24, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  prev: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  prev2: { fontSize: 13, color: colors.muted, flexShrink: 1 },
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
