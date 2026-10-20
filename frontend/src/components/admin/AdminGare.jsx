import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Download, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { StatoChip } from "@/components/TopBar";
import { FileFields, uploadFiles } from "@/components/Locandina";
import { api, errMsg, get } from "@/lib/api";
import { SPECIALITA, TIPI, STATI, fmtDate, downloadCSV } from "@/lib/constants";

const EMPTY = { nome: "", data: new Date().toISOString().slice(0, 10), luogo: "", specialita: "Surf Casting", tipo: "Individuale", zone: 1, max_iscritti: 30, stato: "Iscrizioni Aperte", giudice_id: "", durata_min: 180, bonus_pesce: 0, preda_tecnica: 0 };

export const AdminGare = () => {
  const [gare, setGare] = useState([]);
  const [giudici, setGiudici] = useState([]);
  const [f, setF] = useState(null);
  const [files, setFiles] = useState({});
  const load = () => get("/gare").then(setGare);
  useEffect(() => { load(); get("/users").then((u) => setGiudici(u.filter((x) => x.role === "GIUDICE"))); }, []);

  const save = async (e) => {
    e.preventDefault();
    const body = { ...f, durata_min: Number(f.durata_min) || 180, bonus_pesce: Number(f.bonus_pesce) || 0, preda_tecnica: Number(f.preda_tecnica) || 0, zone: Number(f.zone), max_iscritti: Number(f.max_iscritti), giudice_id: f.giudice_id || null };
    try {
      const { data } = f.id ? await api.put(`/gare/${f.id}`, body) : await api.post("/gare", body);
      await uploadFiles(f.id || data.id, files);
      setFiles({});
      toast.success("Gara salvata"); setF(null); load();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (g) => {
    if (!window.confirm(`Eliminare "${g.nome}"?`)) return;
    await api.delete(`/gare/${g.id}`); load();
  };
  const exportIsc = async (g) => {
    const list = await get(`/gare/${g.id}/iscritti`);
    downloadCSV(`iscritti_${g.nome.replace(/\s+/g, "_")}.csv`, [["Nome", "Cognome", "Società", "Provincia", "Squadra", "Settore", "Picchetto"], ...list.map((i) => [i.nome, i.cognome, i.societa, i.provincia, i.gruppo, i.settore, i.picchetto])]);
  };
  const S = (k, opts) => <select data-testid={`gara-form-${k}`} className="fld" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{opts}</select>;
  const I = (k, extra = {}) => <input data-testid={`gara-form-${k}`} className="fld" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />;

  return (
    <div className="space-y-4">
      {!f && <button data-testid="nuova-gara-btn" onClick={() => setF(EMPTY)} className="btn btn-primary"><Plus size={16} />Nuova gara</button>}
      {f && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-3" data-testid="gara-form">
          <div className="sm:col-span-2"><span className="lbl">Nome</span>{I("nome", { required: true })}</div>
          <div><span className="lbl">Data</span>{I("data", { type: "date", required: true })}</div>
          <div><span className="lbl">Luogo</span>{I("luogo", { required: true })}</div>
          <div><span className="lbl">Specialità</span>{S("specialita", SPECIALITA.map((s) => <option key={s}>{s}</option>))}</div>
          <div><span className="lbl">Tipo</span>{S("tipo", TIPI.map((s) => <option key={s}>{s}</option>))}</div>
          <div><span className="lbl">Zone</span>{S("zone", [1, 2, 3, 4].map((s) => <option key={s} value={s}>{s}</option>))}</div>
          <div><span className="lbl">Max iscritti</span>{I("max_iscritti", { type: "number", inputMode: "numeric" })}</div>
          {f.specialita === "Surf Casting" && <div><span className="lbl">Bonus pesce</span><input data-testid="gara-form-bonus" type="number" min="0" inputMode="numeric" className="fld" value={f.bonus_pesce} onChange={(e) => setF({ ...f, bonus_pesce: e.target.value })} /></div>}
          {f.specialita === "Surf Casting" && <div><span className="lbl">Punteggio preda tecnica</span><input data-testid="gara-form-preda" type="number" min="0" inputMode="numeric" className="fld" value={f.preda_tecnica} onChange={(e) => setF({ ...f, preda_tecnica: e.target.value })} /></div>}
          <div><span className="lbl">Durata gara (min)</span><input data-testid="gara-form-durata" type="number" min="1" inputMode="numeric" className="fld" value={f.durata_min} onChange={(e) => setF({ ...f, durata_min: e.target.value })} /></div>
          <div><span className="lbl">Stato</span>{S("stato", STATI.map((s) => <option key={s}>{s}</option>))}</div>
          <div className="sm:col-span-2"><span className="lbl">Giudice</span>{S("giudice_id", [<option key="" value="">— Nessuno —</option>, ...giudici.map((u) => <option key={u.id} value={u.id}>{u.username} · {u.nome}</option>)])}</div>
          <FileFields files={files} setFiles={setFiles} />
          <div className="flex items-end gap-2"><button data-testid="gara-form-save" className="btn btn-primary flex-1">Salva</button><button type="button" onClick={() => setF(null)} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="tbl" data-testid="admin-gare-table">
          <thead><tr><th>Gara</th><th>Data</th><th>Stato</th><th>Iscritti</th><th>Giudice</th><th /></tr></thead>
          <tbody>
            {gare.map((g) => (
              <tr key={g.id}>
                <td><div className="font-semibold">{g.nome}</div><div className="text-xs text-slate-500">{g.specialita} · {g.tipo} · {g.luogo}</div></td>
                <td className="whitespace-nowrap text-xs">{fmtDate(g.data)}</td>
                <td><StatoChip stato={g.stato} /></td>
                <td className="num">{g.n_iscritti}/{g.max_iscritti}</td>
                <td className="text-xs">{giudici.find((u) => u.id === g.giudice_id)?.username || "—"}</td>
                <td className="whitespace-nowrap text-right">
                  <Link to={`/giudice/${g.id}`} data-testid={`admin-open-gara-${g.id}`} className="btn btn-sm btn-ghost" aria-label="Apri"><ExternalLink size={14} /></Link>
                  <button data-testid={`admin-export-${g.id}`} onClick={() => exportIsc(g)} className="btn btn-sm btn-ghost" aria-label="CSV"><Download size={14} /></button>
                  <button data-testid={`admin-edit-gara-${g.id}`} onClick={() => setF({ durata_min: 180, bonus_pesce: 0, preda_tecnica: 0, ...g, giudice_id: g.giudice_id || "" })} className="btn btn-sm btn-ghost" aria-label="Modifica"><Pencil size={14} /></button>
                  <button data-testid={`admin-del-gara-${g.id}`} onClick={() => del(g)} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
