import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Field, Icon, Muted, Select } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { SPECIALITA, fmtDate, opts } from "@/src/constants";
import { groupBySoc } from "@/src/components/iscritti";
import { useFeedback } from "@/src/feedback";

const EMPTY_A = { nome: "", cognome: "", societa: "", provincia: "", tessera: "" };

export function AtletiManager() {
  const { toast, confirm } = useFeedback();
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState<any>(EMPTY_A);
  const [csv, setCsv] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const load = () => api.get("/atleti").then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const send = async (rows: any[], msg: string) => {
    try { const d = await api.post("/atleti", rows); toast(`${d.added} ${msg}`); load(); return true; } catch (er) { toast(errMsg(er), "error"); return false; }
  };
  const add = async () => {
    if (!f.nome.trim() || !f.cognome.trim() || !f.societa.trim()) return toast("Nome, cognome e società obbligatori", "error");
    if (await send([f], "atleta aggiunto")) setF({ ...EMPTY_A, societa: f.societa, provincia: f.provincia });
  };
  const importCsv = async () => {
    const rows = csv.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome$/i.test(r[0]))
      .map(([nome, cognome = "", societa = "", provincia = "", tessera = ""]) => ({ nome, cognome, societa, provincia, tessera }));
    if (await send(rows, "atleti importati")) setCsv("");
  };
  const del = async (a: any) => { if (await confirm(`Eliminare ${a.nome} ${a.cognome}?`, "Elimina")) { await api.del(`/atleti/${a.id}`); load(); } };
  const filtered = list.filter((a) => !q || `${a.nome} ${a.cognome} ${a.societa}`.toLowerCase().includes(q.toLowerCase()));
  const soc = groupBySoc(filtered);
  const F = (k: string, ph: string) => <Field style={{ flexBasis: "47%", flexGrow: 1 }} testID={`atleta-${k}`} placeholder={ph} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} />;
  return (
    <View style={{ gap: spacing.md }} testID="atleti-manager">
      <Card style={{ padding: spacing.md, gap: spacing.sm, flexDirection: "row", flexWrap: "wrap" }}>
        {F("nome", "Nome")}{F("cognome", "Cognome")}{F("societa", "Società")}{F("provincia", "Prov.")}{F("tessera", "Tessera FIPSAS")}
        <Btn flex icon="plus" title="Aggiungi" onPress={add} testID="atleta-add-btn" />
      </Card>
      <Card style={{ padding: spacing.md, gap: spacing.sm }}>
        <Field multiline testID="atleti-csv" placeholder="Nome;Cognome;Società;Provincia;Tessera" value={csv} onChangeText={setCsv} autoCapitalize="none" />
        <Btn small variant="outline" icon="upload" title="Importa CSV" disabled={!csv.trim()} onPress={importCsv} testID="atleti-csv-import" style={{ alignSelf: "flex-start" }} />
      </Card>
      <Field testID="atleti-search" placeholder={`Cerca tra ${list.length} atleti`} value={q} onChangeText={setQ} />
      {Object.entries(soc).map(([sx, atl]: any) => (
        <Card key={sx} testID={`societa-${sx}`}>
          <Pressable onPress={() => setOpen(open === sx ? null : sx)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md }}>
            <Icon name={open === sx || q ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
            <Text style={{ flex: 1, fontWeight: "800", color: colors.onSurface }}>{sx}</Text><Muted>{atl.length}</Muted>
          </Pressable>
          {(open === sx || !!q) && atl.map((a: any) => (
            <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider }}>
              <Text style={{ flex: 1, color: colors.onSurface, fontWeight: "500" }}>{a.cognome} {a.nome}</Text>
              <Muted>{a.provincia}{a.tessera ? ` · ${a.tessera}` : ""}</Muted>
              <Btn small variant="ghost" icon="trash-2" onPress={() => del(a)} testID={`del-atleta-${a.id}`} />
            </View>
          ))}
        </Card>
      ))}
      {!list.length && <Empty text="Nessun atleta nel database." />}
    </View>
  );
}

const EMPTY_C = { nome: "", specialita: "Surf Casting", anno: String(new Date().getFullYear()), tipo_scarto: "intero", pen_assenza: "11" };
const SCARTO = [{ value: "intero", label: "Scarto prova peggiore" }, { value: "mezzo", label: "Mezzo scarto della peggiore" }];
const parseCsv = (txt: string) => txt.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome/i.test(r[0]))
  .map(([nome, societa = "", settore = "", pen = "0", tot = "0"]) => ({ nome, societa, settore, pen: Number(pen) || 0, tot: Number(String(tot).replace(",", ".")) || 0 }));

function Prove({ c, gareConcluse, onChange }: any) {
  const { toast, confirm } = useFeedback();
  const [tipo, setTipo] = useState("app");
  const [garaId, setGaraId] = useState("");
  const [m, setM] = useState({ nome: "", data: "", csv: "" });
  const add = async () => {
    const body = tipo === "app" ? { tipo, gara_id: garaId } : { tipo, nome: m.nome, data: m.data, risultati: parseCsv(m.csv) };
    try { await api.post(`/campionati/${c.id}/prove`, body); toast("Prova aggiunta"); setM({ nome: "", data: "", csv: "" }); setGaraId(""); onChange(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const del = async (pid: string) => { if (await confirm("Rimuovere la prova?", "Rimuovi")) { await api.del(`/campionati/${c.id}/prove/${pid}`); onChange(); } };
  return (
    <View style={{ padding: spacing.md, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
      {c.prove.map((p: any, i: number) => (
        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} testID={`prova-${p.id}`}>
          <Text style={{ width: 30, fontWeight: "800", color: colors.onSurface }}>P{i + 1}</Text>
          <Text style={{ flex: 1, color: colors.onSurface }} numberOfLines={1}>{p.nome}{p.data ? ` · ${fmtDate(p.data)}` : ""}</Text>
          <Chip label={p.tipo === "app" ? "gara app" : `manuale · ${p.risultati?.length || 0}`} />
          <Btn small variant="ghost" icon="trash-2" onPress={() => del(p.id)} testID={`del-prova-${p.id}`} />
        </View>
      ))}
      {!c.prove.length && <Muted>Nessuna prova.</Muted>}
      <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: spacing.md, gap: spacing.sm }} testID={`add-prova-form-${c.id}`}>
        <Select testID="prova-tipo" value={tipo} onChange={setTipo} options={[{ value: "app", label: "Gara conclusa (app)" }, { value: "manuale", label: "Gara già conclusa (manuale)" }]} />
        {tipo === "app" ? (
          <Select testID="prova-gara" placeholder="Seleziona gara conclusa" value={garaId} onChange={setGaraId} options={gareConcluse.map((g: any) => ({ value: g.id, label: `${g.nome} · ${fmtDate(g.data)}` }))} />
        ) : (
          <>
            <Field testID="prova-nome" placeholder="Nome prova" value={m.nome} onChangeText={(v) => setM({ ...m, nome: v })} />
            <Field testID="prova-data" placeholder="Data AAAA-MM-GG" value={m.data} onChangeText={(v) => setM({ ...m, data: v })} />
            <Field testID="prova-csv" multiline autoCapitalize="none" placeholder={"Nome Cognome;Società;Settore;Penalità;Punti\nMario Rossi;ASD Ceccano;A;1;1250"} value={m.csv} onChangeText={(v) => setM({ ...m, csv: v })} />
          </>
        )}
        <Btn small icon="plus" title="Aggiungi prova" onPress={add} testID="prova-add-btn" />
      </View>
    </View>
  );
}

function Settings({ c, onChange }: any) {
  const { toast } = useFeedback();
  const [f, setF] = useState<any>({ ...c, pen_assenza: String(c.pen_assenza ?? 11) });
  const save = async () => { try { await api.put(`/campionati/${c.id}`, { ...f, anno: Number(f.anno), pen_assenza: Number(f.pen_assenza) }); toast("Salvato"); onChange(); } catch (er) { toast(errMsg(er), "error"); } };
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Select style={{ flex: 1 }} label="Tipo scarto" testID="camp-tipo-scarto" value={f.tipo_scarto || "intero"} onChange={(v) => setF({ ...f, tipo_scarto: v })} options={SCARTO} />
      <Field style={{ width: 84 }} label="Pen. ass." testID="camp-pen-assenza" keyboardType="number-pad" value={f.pen_assenza} onChangeText={(v) => setF({ ...f, pen_assenza: v })} />
      <Btn variant="outline" title="Salva" onPress={save} testID="camp-save" />
    </View>
  );
}

export function CampionatiManager() {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [list, setList] = useState<any[]>([]);
  const [gare, setGare] = useState<any[]>([]);
  const [f, setF] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api.get("/campionati").then(setList).catch(() => {});
  useEffect(() => { load(); api.get("/gare").then((g) => setGare(g.filter((x: any) => x.stato === "Conclusa"))).catch(() => {}); }, []);
  const create = async () => {
    if (!f.nome.trim()) return toast("Nome obbligatorio", "error");
    try { await api.post("/campionati", { ...f, anno: Number(f.anno), pen_assenza: Number(f.pen_assenza) }); setF(null); load(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const del = async (c: any) => { if (await confirm(`Eliminare ${c.nome}?`, "Elimina")) { try { await api.del(`/campionati/${c.id}`); load(); } catch (er) { toast(errMsg(er), "error"); } } };
  return (
    <View style={{ gap: spacing.md }} testID="campionati-manager">
      {!f ? <Btn icon="plus" title="Nuovo campionato" onPress={() => setF(EMPTY_C)} testID="nuovo-campionato-btn" style={{ alignSelf: "flex-start" }} /> : (
        <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="campionato-form">
          <Field label="Nome" testID="camp-nome" value={f.nome} onChangeText={(v) => setF({ ...f, nome: v })} />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Select style={{ flex: 1 }} label="Specialità" testID="camp-specialita" value={f.specialita} onChange={(v) => setF({ ...f, specialita: v })} options={opts(SPECIALITA)} />
            <Field style={{ width: 90 }} label="Anno" testID="camp-anno" keyboardType="number-pad" value={f.anno} onChangeText={(v) => setF({ ...f, anno: v })} />
          </View>
          <Select label="Tipo scarto" testID="camp-form-tipo-scarto" value={f.tipo_scarto} onChange={(v) => setF({ ...f, tipo_scarto: v })} options={SCARTO} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}><Btn flex title="Crea" onPress={create} testID="camp-create-btn" /><Btn variant="outline" title="Annulla" onPress={() => setF(null)} testID="camp-cancel-btn" /></View>
        </Card>
      )}
      {list.map((c) => (
        <Card key={c.id} testID={`campionato-${c.id}`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md }}>
            <Pressable onPress={() => setOpen(open === c.id ? null : c.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }} testID={`camp-toggle-${c.id}`}>
              <Icon name={open === c.id ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              <View style={{ flex: 1 }}><Text style={{ fontWeight: "800", color: colors.onSurface }} numberOfLines={1}>{c.nome}</Text><Muted>{c.specialita} · {c.anno} · {c.prove.length} prove · {c.tipo_scarto === "mezzo" ? "mezzo scarto" : "scarto peggiore"}</Muted></View>
            </Pressable>
            <Btn small variant="ghost" icon="trophy" onPress={() => router.push(`/campionato/${c.id}`)} testID={`camp-open-${c.id}`} />
            <Btn small variant="dangerGhost" icon="trash-2" onPress={() => del(c)} testID={`camp-del-${c.id}`} />
          </View>
          {open === c.id && <><Settings c={c} onChange={load} /><Prove c={c} gareConcluse={gare} onChange={load} /></>}
        </Card>
      ))}
    </View>
  );
}
