import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";

const EMPTY = { nome: "", cognome: "", societa: "", provincia: "", tessera: "" };

export const groupBySoc = (list) => list.reduce((m, a) => ({ ...m, [a.societa]: [...(m[a.societa] || []), a] }), {});

export const AtletiManager = () => {
  const [list, setList] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [csv, setCsv] = useState("");
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const load = () => get("/atleti").then(setList);
  useEffect(() => { load(); }, []);
  const send = async (rows, msg) => {
    try { const { data } = await api.post("/atleti", rows); toast.success(`${data.added} ${msg}`); load(); return true; } catch (er) { toast.error(errMsg(er)); return false; }
  };
  const add = async (e) => { e.preventDefault(); if (await send([f], "atleta aggiunto")) setF({ ...EMPTY, societa: f.societa, provincia: f.provincia }); };
  const importCsv = async () => {
    const rows = csv.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome$/i.test(r[0]))
      .map(([nome, cognome = "", societa = "", provincia = "", tessera = ""]) => ({ nome, cognome, societa, provincia, tessera }));
    if (await send(rows, "atleti importati")) setCsv("");
  };
  const del = async (a) => { if (window.confirm(`Eliminare ${a.nome} ${a.cognome}?`)) { await api.delete(`/atleti/${a.id}`); load(); } };
  const filtered = list.filter((a) => !q || `${a.nome} ${a.cognome} ${a.societa}`.toLowerCase().includes(q.toLowerCase()));
  const soc = groupBySoc(filtered);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4" data-testid="atleti-manager">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={add} className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
          <input data-testid="atleta-nome" required className="fld" placeholder="Nome" value={f.nome} onChange={set("nome")} />
          <input data-testid="atleta-cognome" required className="fld" placeholder="Cognome" value={f.cognome} onChange={set("cognome")} />
          <input data-testid="atleta-societa" required list="societa-list" className="fld" placeholder="Società" value={f.societa} onChange={set("societa")} />
          <datalist id="societa-list">{Object.keys(groupBySoc(list)).map((s) => <option key={s} value={s} />)}</datalist>
          <input data-testid="atleta-provincia" className="fld" placeholder="Prov." value={f.provincia} onChange={set("provincia")} />
          <input data-testid="atleta-tessera" className="fld" placeholder="Tessera FIPSAS" value={f.tessera} onChange={set("tessera")} />
          <button data-testid="atleta-add-btn" className="btn btn-primary"><Plus size={15} />Aggiungi</button>
        </form>
        <div className="card space-y-2 p-3">
          <textarea data-testid="atleti-csv" rows={3} className="fld font-mono text-xs" placeholder="Nome;Cognome;Società;Provincia;Tessera" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button data-testid="atleti-csv-import" disabled={!csv.trim()} onClick={importCsv} className="btn btn-sm btn-outline"><Upload size={14} />Importa CSV</button>
        </div>
      </div>
      <input data-testid="atleti-search" className="fld" placeholder={`Cerca tra ${list.length} atleti`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-2">
        {Object.entries(soc).map(([s, atl]) => (
          <div key={s} className="card" data-testid={`societa-${s}`}>
            <button onClick={() => setOpen(open === s ? null : s)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
              <ChevronDown size={16} className={`transition-transform ${open === s || q ? "rotate-180" : ""}`} />
              <span className="flex-1 font-bold">{s}</span><span className="num text-sm text-slate-500">{atl.length}</span>
            </button>
            {(open === s || q) && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {atl.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 font-medium">{a.cognome} {a.nome}</span>
                    <span className="text-xs text-slate-500">{a.provincia}{a.tessera ? ` · ${a.tessera}` : ""}</span>
                    <button data-testid={`del-atleta-${a.id}`} onClick={() => del(a)} className="text-slate-400 hover:text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {!list.length && <p className="text-sm text-slate-500">Nessun atleta nel database.</p>}
      </div>
    </div>
  );
};
