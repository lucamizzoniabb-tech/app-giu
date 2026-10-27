import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Check, Chip, Field, Label, Muted, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { settoriLabel, shareCSV } from "@/src/constants";
import { useFeedback } from "@/src/feedback";

const EMPTY = { nome: "", cognome: "", societa: "", provincia: "", gruppo: "", rank: "", esterno_prec: false };
export const groupBySoc = (list: any[]) => list.reduce((m: any, a: any) => ({ ...m, [a.societa]: [...(m[a.societa] || []), a] }), {});

function DaAtleti({ gara, iscritti, onDone }: any) {
  const { toast } = useFeedback();
  const [atleti, setAtleti] = useState<any[]>([]);
  const [soc, setSoc] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { api.get("/atleti").then(setAtleti).catch(() => {}); }, []);
  const gia = new Set(iscritti.map((i: any) => i.atleta_id).filter(Boolean));
  const groups = groupBySoc(atleti);
  const add = async () => {
    try { const d = await api.post(`/gare/${gara.id}/iscritti/da-atleti`, { ids: sel }); toast(`${d.added} iscritti aggiunti`); setSel([]); onDone(); } catch (er) { toast(errMsg(er), "error"); }
  };
  return (
    <Card style={{ padding: spacing.md, gap: spacing.sm }} testID="da-atleti">
      <Label>Iscrivi dal database atleti</Label>
      <Select testID="da-atleti-societa" placeholder="Seleziona società" value={soc} onChange={(v) => { setSoc(v); setSel([]); }} options={Object.entries(groups).map(([x, a]: any) => ({ value: x, label: `${x} (${a.length})` }))} />
      {!!soc && (
        <>
          {groups[soc].map((a: any) => (
            <Check key={a.id} testID={`da-atleti-${a.id}`} disabled={gia.has(a.id)} label={`${a.cognome} ${a.nome}${gia.has(a.id) ? " · già iscritto" : ""}`} value={sel.includes(a.id)} onChange={(v) => setSel(v ? [...sel, a.id] : sel.filter((x) => x !== a.id))} />
          ))}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Btn small variant="ghost" title="Tutti" onPress={() => setSel(groups[soc].filter((a: any) => !gia.has(a.id)).map((a: any) => a.id))} testID="da-atleti-tutti" />
            <Btn small icon="user-plus" title={`Iscrivi ${sel.length || ""}`} disabled={!sel.length} onPress={add} testID="da-atleti-add" />
          </View>
        </>
      )}
    </Card>
  );
}

function SquadreIndividuale({ gara, iscritti, locked, onDone }: any) {
  const { toast } = useFeedback();
  const [soc, setSoc] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const squadre = Object.entries(iscritti.filter((i: any) => i.gruppo).reduce((m: any, i: any) => ({ ...m, [i.gruppo]: [...(m[i.gruppo] || []), i] }), {})) as [string, any[]][];
  const perSoc = (x: string) => new Set(iscritti.filter((i: any) => i.societa === x && i.gruppo).map((i: any) => i.gruppo)).size;
  const liberi = iscritti.filter((i: any) => !i.gruppo && i.societa === soc);
  const socs = ([...new Set(iscritti.map((i: any) => i.societa))] as string[]).filter((x) => iscritti.filter((i: any) => i.societa === x && !i.gruppo).length >= 4 && perSoc(x) < 2);
  const pick = (x: string) => { setSoc(x); setSel([]); setNome(x ? `${x} ${perSoc(x) ? "B" : "A"}` : ""); };
  const crea = async () => { try { await api.post(`/gare/${gara.id}/squadre`, { nome, membri: sel }); toast("Squadra creata"); pick(""); onDone(); } catch (er) { toast(errMsg(er), "error"); } };
  const del = async (n: string) => { try { await api.del(`/gare/${gara.id}/squadre/${encodeURIComponent(n)}`); onDone(); } catch (er) { toast(errMsg(er), "error"); } };
  return (
    <Card style={{ padding: spacing.md, gap: spacing.sm }} testID="squadre-individuale">
      <Label>Squadre da 4 per classifica (max 2 per società)</Label>
      {squadre.map(([n, m]) => (
        <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} testID={`squadra-${n}`}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: colors.onSurface }}>{n}</Text><Muted>{m.map((x: any) => `${x.cognome} ${x.nome}`).join(", ")}</Muted></View>
          {!locked && <Btn small variant="dangerGhost" icon="trash-2" onPress={() => del(n)} testID={`del-squadra-${n}`} />}
        </View>
      ))}
      {!locked && (
        <>
          <Select testID="squadra-societa" placeholder="Nuova squadra: scegli società" value={soc} onChange={pick} options={socs.map((x) => ({ value: x, label: x }))} />
          {!!soc && (
            <>
              <Field testID="squadra-nome" value={nome} onChangeText={setNome} />
              {liberi.map((i: any) => <Check key={i.id} testID={`squadra-membro-${i.id}`} label={`${i.cognome} ${i.nome}`} value={sel.includes(i.id)} disabled={!sel.includes(i.id) && sel.length >= 4} onChange={(v) => setSel(v ? [...sel, i.id] : sel.filter((x) => x !== i.id))} />)}
              <Btn small title={`Crea squadra (${sel.length}/4)`} disabled={sel.length !== 4 || !nome.trim()} onPress={crea} testID="squadra-crea-btn" />
            </>
          )}
        </>
      )}
    </Card>
  );
}

export function IscrittiPanel({ gara, onChange }: any) {
  const { toast, confirm } = useFeedback();
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState<any>(EMPTY);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [o, setO] = useState({ societa: true, consecutivi: true, teste: true });
  const avviata = (gara.timer?.stato || "FERMO") !== "FERMO";
  const locked = gara.stato === "Conclusa" || avviata;
  const load = () => api.get(`/gare/${gara.id}/iscritti`).then(setList).catch(() => {});
  useEffect(() => { load(); }, [gara.id]); // eslint-disable-line
  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true);
    let res = false;
    try { await fn(); if (ok) toast(ok); await load(); onChange(); res = true; } catch (er) { toast(errMsg(er), "error"); }
    setBusy(false);
    return res;
  };
  const add = async () => {
    if (!f.nome.trim() || !f.cognome.trim()) return toast("Nome e cognome obbligatori", "error");
    if (await run(() => api.post(`/gare/${gara.id}/iscritti`, [{ ...f, rank: f.rank ? Number(f.rank) : null }]), "Iscritto aggiunto")) setF(EMPTY);
  };
  const importCsv = async () => {
    const rows = csv.split(/\r?\n/).map((l) => l.split(/[;,]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome$/i.test(r[0]));
    if (await run(() => api.post(`/gare/${gara.id}/iscritti`, rows.map(([nome, cognome = "", societa = "", provincia = "", gruppo = ""]) => ({ nome, cognome, societa, provincia, gruppo }))), `${rows.length} iscritti importati`)) setCsv("");
  };
  const n = list.length;
  const I = (k: string, ph: string, extra: any = {}) => <Field style={{ flexBasis: "47%", flexGrow: 1 }} testID={`iscritto-${k}-input`} placeholder={ph} value={String(f[k])} onChangeText={(v) => setF({ ...f, [k]: v })} {...extra} />;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ backgroundColor: colors.onSurface, borderRadius: radius.md, padding: spacing.md }} testID="settori-banner">
        <Text style={{ color: colors.surface, fontWeight: "800", fontSize: 14 }}>{n} ISCRITTI {n ? `=> ${gara.settori_label || settoriLabel(n, gara.zone)} - NESSUN POSTO VUOTO` : ""}</Text>
      </View>
      {!locked && (
        <Card style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <Btn small variant="outline" icon="users" title="Preset demo 24" disabled={busy} testID="demo-preset-btn" onPress={async () => { if (await confirm("Sostituire gli iscritti con il preset demo da 24?")) run(() => api.post(`/gare/${gara.id}/iscritti/demo`), "Preset demo caricato"); }} />
            <Btn small variant="dangerGhost" icon="trash-2" title="Svuota" disabled={busy || !n} testID="delete-all-btn" onPress={async () => { if (await confirm("Eliminare tutti gli iscritti?", "Elimina")) run(() => api.del(`/gare/${gara.id}/iscritti`), "Iscritti eliminati"); }} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm }} testID="sorteggio-opzioni">
            <Label>Sorteggio pilotato</Label>
            {([["societa", "Evita stessa società/squadra nello stesso settore"], ["consecutivi", "Evita picchetti consecutivi della stessa società"], ["teste", "Teste di serie distribuite (una per settore)"]] as [keyof typeof o, string][]).map(([k, t]) => (
              <Check key={k} testID={`opt-${k}-checkbox`} label={t} value={o[k]} onChange={(v) => setO({ ...o, [k]: v })} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
            <Select style={{ width: 96 }} label="Zone" testID="zone-select" value={gara.zone || 1} onChange={(v) => run(() => api.patch(`/gare/${gara.id}`, { zone: Number(v) }))} options={[1, 2, 3, 4].map((z) => ({ value: z, label: String(z) }))} />
            <Btn flex icon="shuffle" title="Sorteggia" disabled={busy || n < 2} testID="sorteggia-btn" onPress={async () => { if (!gara.settori?.length || (await confirm("Rifare il sorteggio? Le misure verranno azzerate.", "Rifai"))) run(() => api.post(`/gare/${gara.id}/sorteggio`, o), "Sorteggio effettuato"); }} />
          </View>
        </Card>
      )}
      {!locked && <DaAtleti gara={gara} iscritti={list} onDone={() => { load(); onChange(); }} />}
      {["Individuale", "Società"].includes(gara.tipo) && <SquadreIndividuale gara={gara} iscritti={list} locked={locked} onDone={() => { load(); onChange(); }} />}
      <Card testID="iscritti-table">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
          <Text style={{ fontWeight: "700", color: colors.onSurface }}>Iscritti</Text>
          <Btn small variant="ghost" icon="download" title="CSV" testID="export-iscritti-csv" onPress={() => shareCSV(`iscritti_${gara.nome.replace(/\s+/g, "_")}.csv`, [["Nome", "Cognome", "Società", "Provincia", "Squadra", "Settore", "Picchetto"], ...list.map((i) => [i.nome, i.cognome, i.societa, i.provincia, i.gruppo, i.settore, i.picchetto])])} />
        </View>
        {list.map((i, k) => (
          <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <Text style={{ width: 24, color: colors.muted, fontSize: 12 }}>{k + 1}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Text style={{ fontWeight: "600", color: colors.onSurface }}>{i.nome} {i.cognome}</Text>
                {!!i.rank && <Chip label={`TS${i.rank}`} bg={colors.warningSoft} fg={colors.warningStrong} />}
                {!!i.esterno_prec && <Chip label="EP" />}
              </View>
              <Muted numberOfLines={1}>{i.societa}{i.provincia ? ` · ${i.provincia}` : ""}{i.gruppo ? ` · ${i.gruppo}` : ""}</Muted>
            </View>
            <Text style={{ fontWeight: "800", color: colors.brand }}>{i.settore ? `${i.settore}${i.picchetto}` : "—"}</Text>
            {!locked && <Btn small variant="ghost" icon="trash-2" testID={`del-iscritto-${i.id}`} onPress={() => run(() => api.del(`/gare/${gara.id}/iscritti/${i.id}`))} />}
          </View>
        ))}
      </Card>
      {!locked && (
        <View style={{ gap: spacing.sm }} testID="aggiungi-concorrente">
          <Label>Aggiungi concorrente (salvato anche nel database atleti)</Label>
          <Card style={{ padding: spacing.md, gap: spacing.sm, flexDirection: "row", flexWrap: "wrap" }}>
            {I("nome", "Nome")}{I("cognome", "Cognome")}{I("societa", "Società")}{I("provincia", "Prov.")}{I("gruppo", "Squadra/Box/Coppia")}{I("rank", "Rank", { keyboardType: "number-pad" })}
            <Check testID="iscritto-esterno-prec-checkbox" label="Esterno precedente" value={f.esterno_prec} onChange={(v) => setF({ ...f, esterno_prec: v })} />
            <Btn flex title="Aggiungi" busy={busy} onPress={add} testID="iscritto-add-btn" />
          </Card>
          <Card style={{ padding: spacing.md, gap: spacing.sm }}>
            <Field multiline testID="csv-textarea" placeholder="Nome,Cognome,Società,Provincia,Squadra" value={csv} onChangeText={setCsv} autoCapitalize="none" />
            <Btn small variant="outline" icon="upload" title="Importa CSV" disabled={busy || !csv.trim()} onPress={importCsv} testID="csv-import-btn" style={{ alignSelf: "flex-start" }} />
          </Card>
        </View>
      )}
    </View>
  );
}
