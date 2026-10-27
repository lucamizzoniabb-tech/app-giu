import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Card, Check, Chip, Field, Icon, Label, Muted, Select, StatoChip } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { CM_START, SPECIALITA, STATI, TIPI, docUrl, fmtDate, openUrl, opts, shareCSV } from "@/src/constants";
import { FileFields, pickFile, uploadFiles } from "@/src/components/Locandina";
import { uploadForm } from "@/src/utils/upload";
import { useFeedback } from "@/src/feedback";

export const EMPTY_GARA = { nome: "", data: new Date().toISOString().slice(0, 10), luogo: "", specialita: "Surf Casting", tipo: "Individuale", zone: 1, max_iscritti: 30, stato: "Iscrizioni Aperte", giudice_id: "", durata_min: 180, bonus_pesce: 0, preda_tecnica: 0 };

export function GaraForm({ initial, giudici, admin, onDone }: any) {
  const { toast } = useFeedback();
  const [f, setF] = useState<any>(initial);
  const [files, setFiles] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: any) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.nome.trim() || !f.luogo.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(f.data)) return toast("Compila nome, luogo e data (AAAA-MM-GG)", "error");
    setBusy(true);
    const body = { ...f, durata_min: Number(f.durata_min) || 180, bonus_pesce: Number(f.bonus_pesce) || 0, preda_tecnica: Number(f.preda_tecnica) || 0, zone: Number(f.zone), max_iscritti: Number(f.max_iscritti) || 30, giudice_id: f.giudice_id || null };
    try {
      const d = f.id ? await api.put(`/gare/${f.id}`, body) : await api.post("/gare", body);
      await uploadFiles(f.id || d.id, files);
      toast(f.id ? "Gara salvata" : "Gara creata");
      onDone(true);
    } catch (er) { toast(errMsg(er), "error"); }
    setBusy(false);
  };
  const surf = f.specialita === "Surf Casting";
  const N = (k: string, label: string) => <Field style={{ flexBasis: "47%", flexGrow: 1 }} label={label} testID={`gara-form-${k}`} keyboardType="number-pad" value={String(f[k] ?? "")} onChangeText={set(k)} />;
  return (
    <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="gara-form">
      <Field label="Nome" testID="gara-form-nome" value={f.nome} onChangeText={set("nome")} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Field style={{ flex: 1 }} label="Data (AAAA-MM-GG)" testID="gara-form-data" value={f.data} onChangeText={set("data")} placeholder="2026-07-15" />
        <Field style={{ flex: 1 }} label="Luogo" testID="gara-form-luogo" value={f.luogo} onChangeText={set("luogo")} />
      </View>
      <Select label="Specialità" testID="gara-form-specialita" value={f.specialita} onChange={set("specialita")} options={opts(SPECIALITA)} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Select style={{ flex: 1 }} label="Tipo" testID="gara-form-tipo" value={f.tipo} onChange={set("tipo")} options={opts(TIPI)} />
        <Select style={{ width: 96 }} label="Zone" testID="gara-form-zone" value={f.zone} onChange={set("zone")} options={opts([1, 2, 3, 4])} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
        {N("max_iscritti", "Max iscritti")}{N("durata_min", "Durata (min)")}
        {surf && N("bonus_pesce", "Bonus pesce")}{surf && N("preda_tecnica", "Preda tecnica")}
      </View>
      {admin && <Select label="Stato" testID="gara-form-stato" value={f.stato} onChange={set("stato")} options={opts(STATI)} />}
      {admin && <Select label="Giudice" testID="gara-form-giudice_id" value={f.giudice_id || ""} onChange={set("giudice_id")} options={[{ value: "", label: "— Nessuno —" }, ...giudici.map((u: any) => ({ value: u.id, label: `${u.username} · ${u.nome}` }))]} />}
      <FileFields files={files} setFiles={setFiles} />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Btn flex title={f.id ? "Salva" : "Crea gara"} busy={busy} onPress={save} testID="gara-form-save" />
        <Btn variant="outline" title="Annulla" onPress={() => onDone(false)} testID="gara-form-cancel" />
      </View>
    </Card>
  );
}

export function AdminGare() {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [gare, setGare] = useState<any[]>([]);
  const [giudici, setGiudici] = useState<any[]>([]);
  const [f, setF] = useState<any>(null);
  const load = () => api.get("/gare").then(setGare).catch(() => {});
  useEffect(() => { load(); api.get("/users").then((u) => setGiudici(u.filter((x: any) => x.role === "GIUDICE"))).catch(() => {}); }, []);
  const del = async (g: any) => { if (await confirm(`Eliminare "${g.nome}"?`, "Elimina")) { try { await api.del(`/gare/${g.id}`); load(); } catch (e) { toast(errMsg(e), "error"); } } };
  const exportIsc = async (g: any) => {
    const list = await api.get(`/gare/${g.id}/iscritti`);
    shareCSV(`iscritti_${g.nome.replace(/\s+/g, "_")}.csv`, [["Nome", "Cognome", "Società", "Provincia", "Squadra", "Settore", "Picchetto"], ...list.map((i: any) => [i.nome, i.cognome, i.societa, i.provincia, i.gruppo, i.settore, i.picchetto])]);
  };
  if (f) return <GaraForm initial={f} giudici={giudici} admin onDone={(ok: boolean) => { setF(null); if (ok) load(); }} />;
  return (
    <View style={{ gap: spacing.md }}>
      <Btn icon="plus" title="Nuova gara" onPress={() => setF(EMPTY_GARA)} testID="nuova-gara-btn" style={{ alignSelf: "flex-start" }} />
      <Card testID="admin-gare-table">
        {gare.map((g) => (
          <View key={g.id} style={{ padding: spacing.md, gap: 6, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}><StatoChip stato={g.stato} /><Chip label={`${g.n_iscritti}/${g.max_iscritti} iscritti`} /></View>
            <Text style={{ fontWeight: "700", fontSize: 15, color: colors.onSurface }}>{g.nome}</Text>
            <Muted>{fmtDate(g.data)} · {g.specialita} · {g.tipo} · {g.luogo} · Giudice: {giudici.find((u) => u.id === g.giudice_id)?.username || "—"}</Muted>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Btn small variant="outline" icon="external-link" title="Apri" onPress={() => router.push(`/giudice/${g.id}`)} testID={`admin-open-gara-${g.id}`} />
              <Btn small variant="ghost" icon="download" onPress={() => exportIsc(g)} testID={`admin-export-${g.id}`} />
              <Btn small variant="ghost" icon="pencil" onPress={() => setF({ durata_min: 180, bonus_pesce: 0, preda_tecnica: 0, ...g, giudice_id: g.giudice_id || "" })} testID={`admin-edit-gara-${g.id}`} />
              <Btn small variant="dangerGhost" icon="trash-2" onPress={() => del(g)} testID={`admin-del-gara-${g.id}`} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const EMPTY_U = { username: "", password: "", role: "GIUDICE", nome: "" };
export function AdminUtenti() {
  const { toast, confirm } = useFeedback();
  const [users, setUsers] = useState<any[]>([]);
  const [gare, setGare] = useState<any[]>([]);
  const [f, setF] = useState<any>(null);
  const load = () => api.get("/users").then(setUsers).catch(() => {});
  useEffect(() => { load(); api.get("/gare").then(setGare).catch(() => {}); }, []);
  const pending = users.filter((u) => !u.approvato);
  const save = async () => {
    try { if (f.id) await api.put(`/users/${f.id}`, f); else await api.post("/users", f); toast("Utente salvato"); setF(null); load(); } catch (er) { toast(errMsg(er), "error"); }
  };
  const del = async (u: any) => { if (await confirm(`Eliminare ${u.username}?`, "Elimina")) { try { await api.del(`/users/${u.id}`); load(); } catch (er) { toast(errMsg(er), "error"); } } };
  const approva = async (u: any, v: boolean) => { try { await api.post(`/users/${u.id}/approva`, { approvato: v }); toast(v ? `${u.username} approvato` : `${u.username} sospeso`); load(); } catch (er) { toast(errMsg(er), "error"); } };
  const assegn = (u: any) => u.role === "ISPETTORE" ? (u.gara_id ? `${gare.find((g) => g.id === u.gara_id)?.nome || "?"} · SETTORE ${u.settore}` : "nessuna gara")
    : u.role === "GIUDICE" ? gare.filter((g) => g.giudice_id === u.id).map((g) => g.nome).join(", ") || "—" : "tutto";
  const URow = ({ u, children }: any) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: colors.onSurface }}>{u.username}</Text><Muted numberOfLines={2}>{u.nome}{u.approvato ? ` · ${assegn(u)}` : ` · ${u.role}`}</Muted></View>
      {children}
    </View>
  );
  return (
    <View style={{ gap: spacing.md }}>
      {pending.length > 0 && (
        <Card testID="pending-users" style={{ borderColor: colors.warning }}>
          <View style={{ backgroundColor: colors.warningSoft, padding: spacing.md }}><Text style={{ fontWeight: "700", color: colors.warningStrong }}>Account in attesa di approvazione ({pending.length})</Text></View>
          {pending.map((u) => (
            <URow key={u.id} u={u}>
              <Btn small variant="success" icon="check" title="Approva" onPress={() => approva(u, true)} testID={`approva-${u.username}`} />
              <Btn small variant="dangerGhost" icon="trash-2" onPress={() => del(u)} testID={`rifiuta-${u.username}`} />
            </URow>
          ))}
        </Card>
      )}
      {!f ? <Btn icon="plus" title="Nuovo utente" onPress={() => setF(EMPTY_U)} testID="nuovo-utente-btn" style={{ alignSelf: "flex-start" }} /> : (
        <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="utente-form">
          <Field label="Username" testID="utente-form-username" editable={!f.id} autoCapitalize="none" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} />
          <Field label={`Password${f.id ? " (lascia vuoto)" : ""}`} testID="utente-form-password" autoCapitalize="none" value={f.password || ""} onChangeText={(v) => setF({ ...f, password: v })} />
          <Field label="Nome" testID="utente-form-nome" value={f.nome || ""} onChangeText={(v) => setF({ ...f, nome: v })} />
          <Select label="Ruolo" testID="utente-form-role" value={f.role} onChange={(v) => setF({ ...f, role: v })} options={opts(["GIUDICE", "ISPETTORE", "ADMIN"])} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}><Btn flex title="Salva" onPress={save} testID="utente-form-save" /><Btn variant="outline" title="Annulla" onPress={() => setF(null)} testID="utente-form-cancel" /></View>
        </Card>
      )}
      {[["GIUDICE", "Giudici"], ["ISPETTORE", "Ispettori"], ["ADMIN", "Admin"]].map(([role, title]) => (
        <View key={role} style={{ gap: spacing.sm }} testID={`admin-utenti-${role.toLowerCase()}`}>
          <Label>{title}</Label>
          <Card>
            {users.filter((u) => u.approvato && u.role === role).map((u) => (
              <URow key={u.id} u={u}>
                {u.role !== "ADMIN" && <Btn small variant="ghost" icon="ban" onPress={() => approva(u, false)} testID={`sospendi-${u.username}`} />}
                <Btn small variant="ghost" icon="pencil" onPress={() => setF({ ...u, password: "" })} testID={`edit-user-${u.username}`} />
                <Btn small variant="dangerGhost" icon="trash-2" onPress={() => del(u)} testID={`del-user-${u.username}`} />
              </URow>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

const EMPTY_D = { titolo: "", anno: String(new Date().getFullYear()), specialita: "Surf Casting", url: "" };
export function AdminDocs() {
  const { toast, confirm } = useFeedback();
  const [docs, setDocs] = useState<any[]>([]);
  const [f, setF] = useState<any>(null);
  const [file, setFile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/documenti").then(setDocs).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!f.titolo.trim()) return toast("Titolo obbligatorio", "error");
    if (!f.id && !file && !f.url) return toast("Carica un PDF o inserisci un link", "error");
    setBusy(true);
    try {
      if (file && !f.id) await uploadForm("/documenti/upload", file, { titolo: f.titolo, anno: f.anno, specialita: f.specialita });
      else { const body = { ...f, anno: Number(f.anno) }; if (f.id) await api.put(`/documenti/${f.id}`, body); else await api.post("/documenti", body); }
      toast("Documento salvato"); setF(null); setFile(null); load();
    } catch (er) { toast(errMsg(er), "error"); }
    setBusy(false);
  };
  return (
    <View style={{ gap: spacing.md }}>
      {!f ? <Btn icon="plus" title="Nuovo documento" onPress={() => setF(EMPTY_D)} testID="nuovo-doc-btn" style={{ alignSelf: "flex-start" }} /> : (
        <Card style={{ padding: spacing.lg, gap: spacing.md }} testID="doc-form">
          <Field label="Titolo" testID="doc-form-titolo" value={f.titolo} onChangeText={(v) => setF({ ...f, titolo: v })} />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Field style={{ width: 96 }} label="Anno" testID="doc-form-anno" keyboardType="number-pad" value={String(f.anno)} onChangeText={(v) => setF({ ...f, anno: v })} />
            <Select style={{ flex: 1 }} label="Specialità" testID="doc-form-specialita" value={f.specialita} onChange={(v) => setF({ ...f, specialita: v })} options={opts(["Generale", ...SPECIALITA])} />
          </View>
          {!f.id && <Btn variant="outline" icon="file-text" title={file ? file.name : "Scegli file PDF"} onPress={async () => setFile(await pickFile(["application/pdf"]))} testID="doc-form-file" />}
          {!f.storage_path && <Field label="oppure link esterno" testID="doc-form-url" editable={!file} autoCapitalize="none" keyboardType="url" value={f.url} onChangeText={(v) => setF({ ...f, url: v })} />}
          <View style={{ flexDirection: "row", gap: spacing.sm }}><Btn flex icon="upload" title="Salva" busy={busy} onPress={save} testID="doc-form-save" /><Btn variant="outline" title="Annulla" onPress={() => { setF(null); setFile(null); }} testID="doc-form-cancel" /></View>
        </Card>
      )}
      <Card>
        {docs.map((d) => (
          <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <Icon name="file-text" size={18} color={d.storage_path ? colors.error : colors.muted} />
            <Pressable style={{ flex: 1 }} onPress={() => openUrl(docUrl(d))} testID={`open-doc-${d.id}`}>
              <Text style={{ fontWeight: "700", color: colors.onSurface }} numberOfLines={2}>{d.titolo}</Text>
              <Muted>{d.specialita} · {d.anno} · {d.storage_path ? "PDF caricato" : "link esterno"}</Muted>
            </Pressable>
            <Btn small variant="ghost" icon="pencil" onPress={() => setF({ ...d, anno: String(d.anno) })} testID={`edit-doc-${d.id}`} />
            <Btn small variant="dangerGhost" icon="trash-2" onPress={async () => { if (await confirm("Eliminare?", "Elimina")) { await api.del(`/documenti/${d.id}`); load(); } }} testID={`del-doc-${d.id}`} />
          </View>
        ))}
      </Card>
    </View>
  );
}

function SpecieRow({ sp }: any) {
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<any[]>(sp.punti.map(String));
  const save = async () => { try { await api.put(`/specie/${encodeURIComponent(sp.name)}`, { punti: v.map((x) => Number(x) || 0) }); toast(`${sp.name} salvata`); } catch (er) { toast(errMsg(er), "error"); } };
  return (
    <View testID={`specie-row-${sp.name}`} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md }} testID={`specie-toggle-${sp.name}`}>
        <Text style={{ flex: 1, fontWeight: "700", color: colors.onSurface }}>{sp.name}</Text>
        <Muted>min {sp.min} cm · {CM_START + v.length - 1} cm = {v[v.length - 1]} pt</Muted>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={{ backgroundColor: colors.surfaceSecondary, padding: spacing.md, gap: spacing.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {v.map((p, i) => (
              <View key={i} style={{ width: "23%", flexDirection: "row", alignItems: "center", gap: 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 10, color: colors.muted, width: 18 }}>{CM_START + i}</Text>
                <TextInput testID={`specie-${sp.name}-cm-${CM_START + i}`} keyboardType="number-pad" style={{ flex: 1, height: 34, fontSize: 13, color: colors.onSurface }} value={p} onChangeText={(t) => setV(v.map((x, j) => (j === i ? t : x)))} />
              </View>
            ))}
          </View>
          <Btn small icon="save" title="Salva" onPress={save} testID={`specie-save-${sp.name}`} style={{ alignSelf: "flex-start" }} />
        </View>
      )}
    </View>
  );
}

export function AdminSpecie() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.get("/specie").then(setList).catch(() => {}); }, []);
  return (
    <View style={{ gap: spacing.md }}>
      <Muted>Tabella di conversione Surf Casting: punti a pesce per lunghezza (cm {CM_START}–{CM_START + 76}).</Muted>
      <Card testID="admin-specie-list">{list.map((x) => <SpecieRow key={x.name} sp={x} />)}</Card>
    </View>
  );
}

export { Check };
