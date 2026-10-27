import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Empty, Icon, Muted, Segmented, Select } from "@/src/ui";
import { fmt, fmtTime, shareCSV } from "@/src/constants";

const Pos = ({ n, first }: { n: number; first?: boolean }) => (
  <View style={[s.pos, first && { backgroundColor: colors.success }]}>
    {first ? <Icon name="crown" size={16} color={colors.onSuccess} /> : <Text style={s.posT}>{n}</Text>}
  </View>
);

export const RankRow = ({ first, n, title, sub, right, rightSub, badge, testID }: any) => (
  <View testID={testID} style={[s.row, first && { backgroundColor: colors.successSoft }]}>
    <Pos n={n} first={first} />
    {badge}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <Text style={s.sub} numberOfLines={2}>{sub}</Text>
    </View>
    <View style={{ alignItems: "flex-end" }}>
      <Text style={s.right}>{right}</Text>
      <Text style={s.sub}>{rightSub}</Text>
    </View>
  </View>
);

const Pic = ({ r, w = 36 }: any) => (
  <Text style={[s.pic, { width: w }, r.colore && { borderBottomWidth: 3, borderBottomColor: r.colore }]}>{r.picchetto}</Text>
);

const SecHead = ({ lettera, tecnico, right }: any) => (
  <View style={[s.secHead, tecnico && { backgroundColor: colors.technicalSoft }]}>
    <Text style={[s.secT, tecnico && { color: colors.onTechnical }]}>SETTORE {lettera}{tecnico ? " TECNICO" : ""}</Text>
    {right ? <Text style={s.sub}>{right}</Text> : null}
  </View>
);

const SettoreList = ({ sx }: any) => (
  <Card testID={`classifica-settore-${sx.lettera}`}>
    <SecHead lettera={sx.lettera} tecnico={sx.tecnico} right={`${sx.rows.length} concorrenti`} />
    {sx.rows.map((r: any) => (
      <RankRow key={r.id} testID={`cls-row-${r.picchetto}`} first={r.pen === 1 && r.tot > 0} n={r.pos} badge={<Pic r={r} />} title={r.nome}
        sub={`${r.societa}${r.gruppo ? ` · ${r.gruppo}` : ""} · ${r.n_pesci} pesci${r.esterno ? " · Esterno" : ""}`} right={fmt(r.tot)} rightSub={`Pen ${r.pen}`} />
    ))}
    {sx.integrati?.length > 0 && (
      <View style={s.integ} testID={`integrati-${sx.lettera}`}>
        <Text style={[s.sub, { fontWeight: "800", color: colors.onTechnical }]}>INTEGRATI A 10 DAL SETTORE {sx.integrati[0].settore}</Text>
        {sx.integrati.map((x: any) => (
          <View key={x.picchetto} style={s.between}><Text style={s.sub}>{x.settore}{x.picchetto} · {x.nome}</Text><Text style={s.sub}>{fmt(x.tot)} · pos {x.pos_tec}</Text></View>
        ))}
      </View>
    )}
  </Card>
);

const List = ({ items, testID }: any) => (
  <Card testID={testID}>{items.map((it: any, i: number) => <RankRow key={i} first={i === 0 && it.ok} n={i + 1} {...it} />)}</Card>
);

export function ClassificaView({ data, gara, exportable }: any) {
  const [tab, setTab] = useState("settori");
  if (!data) return null;
  if (!data.individui.length) return <Empty testID="classifica-empty" text="Sorteggio non ancora effettuato." />;
  const exportCSV = () => shareCSV(`classifica_${gara.nome.replace(/\s+/g, "_")}.csv`, [
    ["Pos", "Settore", "Picchetto", "Nome", "Società", "Squadra", "N. Pesci", "Totale", "Penalità", "Esterno"],
    ...data.assoluta.map((r: any, i: number) => [i + 1, r.settore, r.picchetto, r.nome, r.societa, r.gruppo, r.n_pesci, r.tot, r.pen, r.esterno ? "SI" : ""]),
  ]);
  const items: [string, string][] = [["settori", "Settori"], ...(data.gruppi.length ? [["gruppi", "Squadre/Box/Coppie"] as [string, string]] : []), ["societa", "Società"], ["assoluta", "Assoluta"]];
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ marginHorizontal: -spacing.lg }}><Segmented items={items} value={tab} onChange={setTab} prefix="cls-tab" /></View>
      {exportable && <Btn small variant="outline" icon="download" title="Esporta CSV" onPress={exportCSV} testID="export-classifica-csv" style={{ alignSelf: "flex-start" }} />}
      {tab === "settori" && data.settori.map((x: any) => <SettoreList key={x.lettera} sx={x} />)}
      {tab === "gruppi" && <List testID="classifica-gruppi" items={data.gruppi.map((g: any) => ({ ok: g.tot > 0, title: g.gruppo, sub: `${g.societa} · ${g.membri.map((m: any) => `${m.nome} (${m.settore}${m.picchetto} · pen ${m.pen})`).join(", ")}`, right: `Pen ${g.pen}`, rightSub: fmt(g.tot) }))} />}
      {tab === "societa" && <List testID="classifica-societa" items={data.societa.map((x: any) => ({ ok: x.tot > 0, title: x.societa, sub: x.migliori.join(", "), right: `Pen ${x.pen}`, rightSub: fmt(x.tot) }))} />}
      {tab === "assoluta" && <List testID="classifica-assoluta" items={data.assoluta.map((r: any) => ({ ok: r.tot > 0, badge: <Text style={[s.pic, { width: 44, fontSize: 14 }]}>{r.settore}{r.picchetto}</Text>, title: r.nome, sub: `${r.societa} · ${r.n_pesci} pesci`, right: fmt(r.tot), rightSub: `Pen ${r.pen}` }))} />}
    </View>
  );
}

export function CampoGara({ individui, settori }: any) {
  if (!individui?.length) return <Empty text="Sorteggio non ancora effettuato." />;
  const zone = [...new Set(individui.map((i: any) => i.zona))].sort() as any[];
  const tecnico = new Set((settori || []).filter((x: any) => x.tecnico).map((x: any) => x.lettera));
  return (
    <View style={{ gap: spacing.lg }} testID="campo-gara">
      {zone.map((z) => (
        <View key={z} style={{ gap: spacing.sm }}>
          <Text style={s.zona}>ZONA {z}</Text>
          {([...new Set(individui.filter((i: any) => i.zona === z).map((i: any) => i.settore))] as string[]).map((sx) => (
            <Card key={sx} testID={`campo-settore-${sx}`}>
              <SecHead lettera={sx} tecnico={tecnico.has(sx)} />
              {individui.filter((i: any) => i.settore === sx).map((i: any) => (
                <View key={i.id} testID={`campo-pic-${i.picchetto}`} style={[s.row, i.colore && { borderLeftWidth: 5, borderLeftColor: i.colore }, tecnico.has(sx) && { backgroundColor: colors.technicalSoft + "80" }]}>
                  <Pic r={{ ...i, colore: null }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={1}>{i.nome}</Text>
                    <Text style={s.sub} numberOfLines={1}>{i.societa}{i.gruppo ? ` · ${i.gruppo}` : ""}</Text>
                  </View>
                  {i.esterno && <Text style={s.ext}>Esterno</Text>}
                </View>
              ))}
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ListaPrede({ classifica }: any) {
  const [settore, setSettore] = useState("ALL");
  if (!classifica?.individui.length) return <Empty text="Sorteggio non ancora effettuato." />;
  const surf = classifica.surf;
  const prede = classifica.individui.flatMap((r: any) => r.catture.map((c: any) => ({ ...c, r })))
    .filter((c: any) => settore === "ALL" || c.r.settore === settore)
    .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  return (
    <View style={{ gap: spacing.md }} testID="lista-prede">
      <View style={[s.between, { gap: spacing.md }]}>
        <Select style={{ flex: 1 }} testID="prede-settore-filter" value={settore} onChange={setSettore}
          options={[{ value: "ALL", label: "Tutti i settori" }, ...classifica.settori.map((x: any) => ({ value: x.lettera, label: `Settore ${x.lettera}` }))]} />
        <Muted testID="prede-count">{prede.length} prede</Muted>
      </View>
      <Card>
        {prede.map((c: any) => (
          <View key={c.id} style={s.row} testID={`preda-${c.id}`}>
            <Text style={[s.pic, { width: 44, fontSize: 14 }]}>{c.r.settore}{c.r.picchetto}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{surf ? `${c.specie} · ${c.cm} cm` : `${fmt(c.peso)} g`}</Text>
              <Text style={s.sub} numberOfLines={1}>{c.r.nome} · {c.r.societa} · {fmtTime(c.created_at)}</Text>
            </View>
            {surf && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.right, c.dettaglio?.sotto && { color: colors.errorStrong }]}>{fmt(c.punti)}</Text>
                <Text style={s.sub}>{c.dettaglio?.sotto ? "preda tecnica" : c.dettaglio?.bonus ? `${c.dettaglio.tabella}+${c.dettaglio.bonus} bonus` : "punti"}</Text>
              </View>
            )}
          </View>
        ))}
        {!prede.length && <View style={{ paddingHorizontal: spacing.md }}><Empty text="Nessuna preda registrata." /></View>}
      </Card>
    </View>
  );
}

export function CercaClassifica({ classifica }: any) {
  const [q, setQ] = useState("");
  if (!classifica?.individui.length) return null;
  const t = q.trim().toLowerCase();
  const res = t ? classifica.assoluta.map((r: any, i: number) => ({ ...r, ass: i + 1 })).filter((r: any) =>
    `${r.nome} ${r.societa} ${r.gruppo} ${r.settore}${r.picchetto}`.toLowerCase().includes(t) || String(r.picchetto) === t) : [];
  return (
    <View style={{ gap: spacing.sm }} testID="cerca-classifica">
      <View style={s.search}>
        <Icon name="search" size={17} color={colors.muted} />
        <TextInput testID="cerca-classifica-input" style={s.searchIn} placeholder="Cerca concorrente, società o picchetto" placeholderTextColor={colors.muted} value={q} onChangeText={setQ} />
        {!!q && <Btn small variant="ghost" icon="x" onPress={() => setQ("")} testID="cerca-clear" />}
      </View>
      {!!t && (
        <Card testID="cerca-risultati">
          {res.map((r: any) => (
            <View key={r.id} style={s.row}>
              <Text style={[s.pic, { width: 44, fontSize: 14 }]}>{r.settore}{r.picchetto}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>{r.nome}</Text>
                <Text style={s.sub} numberOfLines={2}>{r.societa} · {r.n_pesci} pesci · {r.pos}° settore {r.settore} · {r.ass}° assoluto</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}><Text style={s.right}>{fmt(r.tot)}</Text><Text style={s.sub}>Pen {r.pen}</Text></View>
            </View>
          ))}
          {!res.length && <View style={{ paddingHorizontal: spacing.md }}><Empty text="Nessun risultato" /></View>}
        </Card>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pos: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  posT: { fontSize: 13, fontWeight: "800", color: colors.onSurfaceSecondary, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  title: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: 12, color: colors.muted },
  right: { fontSize: 16, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] },
  pic: { fontSize: 17, fontWeight: "800", color: colors.brand, textAlign: "center", fontVariant: ["tabular-nums"] },
  secHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceSecondary },
  secT: { fontSize: 13, fontWeight: "800", color: colors.onSurface, letterSpacing: 0.5 },
  integ: { backgroundColor: colors.technicalSoft, padding: spacing.md, gap: 2 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  zona: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.muted },
  ext: { fontSize: 11, color: colors.muted, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingLeft: spacing.md, backgroundColor: colors.surface },
  searchIn: { flex: 1, fontSize: 15, color: colors.onSurface, height: 46 },
});
