import { useEffect, useState } from "react";
import { Trash2, Shuffle, Users, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { settoriLabel, downloadCSV } from "@/lib/constants";

const EMPTY = { nome: "", cognome: "", societa: "", provincia: "", gruppo: "", rank: "", esterno_prec: false };

export const IscrittiPanel = ({ gara, onChange }) => {
  const [list, setList] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [pilotato, setPilotato] = useState(true);
  const avviata = (gara.timer?.stato || "FERMO") !== "FERMO";
  const locked = gara.stato === "Conclusa" || avviata;
  const load = () => get(`/gare/${gara.id}/iscritti`).then(setList).catch(() => {});
  useEffect(() => { load(); }, [gara.id]); // eslint-disable-line

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await load(); onChange(); } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  const add = (e) => {
    e.preventDefault();
    run(() => api.post(`/gare/${gara.id}/iscritti`, [{ ...f, rank: f.rank ? Number(f.rank) : null }]), "Iscritto aggiunto").then(() => setF(EMPTY));
  };
  const importCsv = () => {
    const rows = csv.split(/\r?\n/).map((l) => l.split(/[;,]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome$/i.test(r[0]));
    run(() => api.post(`/gare/${gara.id}/iscritti`, rows.map(([nome, cognome = "", societa = "", provincia = "", gruppo = ""]) => ({ nome, cognome, societa, provincia, gruppo }))), `${rows.length} iscritti importati`).then(() => setCsv(""));
  };
  const n = list.length;
  const I = (k, ph, extra = {}) => <input data-testid={`iscritto-${k}-input`} className="fld" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border-2 border-slate-900 bg-slate-900 px-4 py-3 font-display text-sm font-bold text-white sm:text-base" data-testid="settori-banner">
        {n} ISCRITTI {n ? `=> ${gara.settori_label || settoriLabel(n, gara.zone)} - NESSUN POSTO VUOTO` : ""}
      </div>
      {!locked && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={add} className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {I("nome", "Nome", { required: true })}{I("cognome", "Cognome", { required: true })}{I("societa", "Società")}
            {I("provincia", "Prov.")}{I("gruppo", "Squadra/Box/Coppia")}{I("rank", "Rank", { type: "number", inputMode: "numeric" })}
            <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
              <input data-testid="iscritto-esterno-prec-checkbox" type="checkbox" className="h-5 w-5" checked={f.esterno_prec} onChange={(e) => setF({ ...f, esterno_prec: e.target.checked })} /> Esterno precedente
            </label>
            <button data-testid="iscritto-add-btn" disabled={busy} className="btn btn-primary col-span-2">Aggiungi</button>
          </form>
          <div className="card space-y-2 p-3">
            <textarea data-testid="csv-textarea" rows={3} className="fld font-mono text-xs" placeholder="Nome,Cognome,Società,Provincia,Squadra" value={csv} onChange={(e) => setCsv(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button data-testid="csv-import-btn" disabled={busy || !csv.trim()} onClick={importCsv} className="btn btn-sm btn-outline"><Upload size={14} />Importa CSV</button>
              <button data-testid="demo-preset-btn" disabled={busy} onClick={() => window.confirm("Sostituire gli iscritti con il preset demo da 24?") && run(() => api.post(`/gare/${gara.id}/iscritti/demo`), "Preset demo caricato")} className="btn btn-sm btn-outline"><Users size={14} />Preset demo 24</button>
              <button data-testid="delete-all-btn" disabled={busy || !n} onClick={() => window.confirm("Eliminare tutti gli iscritti?") && run(() => api.delete(`/gare/${gara.id}/iscritti`), "Iscritti eliminati")} className="btn btn-sm btn-ghost text-red-600"><Trash2 size={14} />Svuota</button>
            </div>
            <label className="flex items-start gap-2 border-t border-slate-100 pt-3 text-sm" data-testid="pilotato-label">
              <input data-testid="pilotato-checkbox" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={pilotato} onChange={(e) => setPilotato(e.target.checked)} />
              <span><b>Sorteggio pilotato</b><span className="block text-xs text-slate-500">Evita stessa società/squadra nel settore, evita picchetti consecutivi della stessa società, distribuisce le teste di serie</span></span>
            </label>
            <div className="flex items-end gap-2">
              <div className="w-28">
                <span className="lbl">Zone</span>
                <select data-testid="zone-select" className="fld" value={gara.zone || 1} onChange={(e) => run(() => api.patch(`/gare/${gara.id}`, { zone: Number(e.target.value) }))}>
                  {[1, 2, 3, 4].map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <button data-testid="sorteggia-btn" disabled={busy || n < 2} onClick={() => (!gara.settori?.length || window.confirm("Rifare il sorteggio? Le misure verranno azzerate.")) && run(() => api.post(`/gare/${gara.id}/sorteggio`, { pilotato }), pilotato ? "Sorteggio pilotato effettuato" : "Sorteggio casuale effettuato")} className="btn btn-lg btn-primary flex-1"><Shuffle size={18} />Sorteggia</button>
            </div>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Iscritti</span>
          <button data-testid="export-iscritti-csv" onClick={() => downloadCSV(`iscritti_${gara.nome.replace(/\s+/g, "_")}.csv`, [["Nome", "Cognome", "Società", "Provincia", "Squadra", "Settore", "Picchetto"], ...list.map((i) => [i.nome, i.cognome, i.societa, i.provincia, i.gruppo, i.settore, i.picchetto])])} className="btn btn-sm btn-ghost"><Download size={14} />CSV</button>
        </div>
        <table className="tbl" data-testid="iscritti-table">
          <thead><tr><th>#</th><th>Nome</th><th>Società</th><th className="hidden sm:table-cell">Prov</th><th>Gruppo</th><th>Set/Pic</th><th /></tr></thead>
          <tbody>
            {list.map((i, k) => (
              <tr key={i.id}>
                <td className="num text-xs text-slate-400">{k + 1}</td>
                <td className="font-medium">{i.nome} {i.cognome}{i.rank ? <span className="ml-1 chip border-amber-300 text-amber-700">TS{i.rank}</span> : null}{i.esterno_prec ? <span className="ml-1 chip border-slate-300 text-slate-500">EP</span> : null}</td>
                <td>{i.societa}</td><td className="hidden sm:table-cell">{i.provincia}</td><td>{i.gruppo}</td>
                <td className="num">{i.settore ? `${i.settore}${i.picchetto}` : "—"}</td>
                <td>{!locked && <button data-testid={`del-iscritto-${i.id}`} onClick={() => run(() => api.delete(`/gare/${gara.id}/iscritti/${i.id}`))} className="text-slate-400 hover:text-red-600" aria-label="Elimina"><Trash2 size={15} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
