import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { SPECIALITA, fmtDate } from "@/lib/constants";

const EMPTY = { nome: "", specialita: "Surf Casting", anno: new Date().getFullYear(), scarti: 1, tipo_scarto: "intero", pen_assenza: 11 };

const parseCsv = (txt) => txt.split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.trim())).filter((r) => r[0] && !/^nome/i.test(r[0]))
  .map(([nome, societa = "", settore = "", pen = "0", tot = "0"]) => ({ nome, societa, settore, pen: Number(pen) || 0, tot: Number(String(tot).replace(",", ".")) || 0 }));

const Prove = ({ c, gareConcluse, onChange }) => {
  const [tipo, setTipo] = useState("app");
  const [garaId, setGaraId] = useState("");
  const [m, setM] = useState({ nome: "", data: "", csv: "" });
  const add = async (e) => {
    e.preventDefault();
    const body = tipo === "app" ? { tipo, gara_id: garaId } : { tipo, nome: m.nome, data: m.data, risultati: parseCsv(m.csv) };
    try { await api.post(`/campionati/${c.id}/prove`, body); toast.success("Prova aggiunta"); setM({ nome: "", data: "", csv: "" }); setGaraId(""); onChange(); } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (pid) => { if (window.confirm("Rimuovere la prova?")) { await api.delete(`/campionati/${c.id}/prove/${pid}`); onChange(); } };
  return (
    <div className="space-y-3 border-t border-slate-100 p-3">
      <ul className="space-y-1">
        {c.prove.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 text-sm" data-testid={`prova-${p.id}`}>
            <span className="num w-8 font-bold">P{i + 1}</span><span className="flex-1 truncate">{p.nome}{p.data ? ` · ${fmtDate(p.data)}` : ""}</span>
            <span className="chip border-slate-200 text-slate-500">{p.tipo === "app" ? "gara app" : `manuale · ${p.risultati?.length || 0}`}</span>
            <button data-testid={`del-prova-${p.id}`} onClick={() => del(p.id)} className="text-slate-400 hover:text-red-600" aria-label="Rimuovi"><Trash2 size={14} /></button>
          </li>
        ))}
        {!c.prove.length && <li className="text-sm text-slate-500">Nessuna prova.</li>}
      </ul>
      <form onSubmit={add} className="grid gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-4" data-testid={`add-prova-form-${c.id}`}>
        <select data-testid="prova-tipo" className="fld" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="app">Gara conclusa (app)</option><option value="manuale">Gara già conclusa (manuale)</option>
        </select>
        {tipo === "app" ? (
          <select data-testid="prova-gara" required className="fld sm:col-span-2" value={garaId} onChange={(e) => setGaraId(e.target.value)}>
            <option value="">Seleziona gara conclusa</option>{gareConcluse.map((g) => <option key={g.id} value={g.id}>{g.nome} · {fmtDate(g.data)}</option>)}
          </select>
        ) : (
          <>
            <input data-testid="prova-nome" required className="fld" placeholder="Nome prova" value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} />
            <input data-testid="prova-data" type="date" className="fld" value={m.data} onChange={(e) => setM({ ...m, data: e.target.value })} />
            <textarea data-testid="prova-csv" required rows={4} className="fld font-mono text-xs sm:col-span-3" placeholder={"Nome Cognome;Società;Settore;Penalità;Punti\nMario Rossi;ASD Ceccano;A;1;1250"} value={m.csv} onChange={(e) => setM({ ...m, csv: e.target.value })} />
          </>
        )}
        <button data-testid="prova-add-btn" className="btn btn-primary"><Plus size={15} />Aggiungi prova</button>
      </form>
    </div>
  );
};

const Settings = ({ c, onChange }) => {
  const [f, setF] = useState(c);
  const save = async () => { try { await api.put(`/campionati/${c.id}`, { ...f, anno: Number(f.anno), scarti: Number(f.scarti), pen_assenza: Number(f.pen_assenza) }); toast.success("Salvato"); onChange(); } catch (er) { toast.error(errMsg(er)); } };
  return (
    <div className="flex flex-wrap items-end gap-2 p-3">
      <div className="w-24"><span className="lbl">Scarti</span><input data-testid="camp-scarti" type="number" min="0" inputMode="numeric" className="fld" value={f.scarti} onChange={(e) => setF({ ...f, scarti: e.target.value })} /></div>
<div className="w-44"><span className="lbl">Tipo scarto</span><select data-testid="camp-tipo-scarto" className="fld" value={f.tipo_scarto || "intero"} onChange={(e) => setF({ ...f, tipo_scarto: e.target.value })}><option value="intero">Scarto prova peggiore</option><option value="mezzo">Mezzo scarto della peggiore</option></select></div>
      <div className="w-32"><span className="lbl">Pen. assenza</span><input data-testid="camp-pen-assenza" type="number" min="0" inputMode="numeric" className="fld" value={f.pen_assenza} onChange={(e) => setF({ ...f, pen_assenza: e.target.value })} /></div>
      <button data-testid="camp-save" onClick={save} className="btn btn-outline">Salva</button>
    </div>
  );
};

export const CampionatiManager = () => {
  const [list, setList] = useState([]);
  const [gare, setGare] = useState([]);
  const [f, setF] = useState(null);
  const [open, setOpen] = useState(null);
  const load = () => get("/campionati").then(setList);
  useEffect(() => { load(); get("/gare").then((g) => setGare(g.filter((x) => x.stato === "Conclusa"))); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/campionati", { ...f, anno: Number(f.anno), scarti: Number(f.scarti), pen_assenza: Number(f.pen_assenza) }); setF(null); load(); } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (c) => { if (window.confirm(`Eliminare ${c.nome}?`)) { try { await api.delete(`/campionati/${c.id}`); load(); } catch (er) { toast.error(errMsg(er)); } } };
  return (
    <div className="space-y-4" data-testid="campionati-manager">
      {!f && <button data-testid="nuovo-campionato-btn" onClick={() => setF(EMPTY)} className="btn btn-primary"><Plus size={16} />Nuovo campionato</button>}
      {f && (
        <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-5" data-testid="campionato-form">
          <div className="sm:col-span-2"><span className="lbl">Nome</span><input data-testid="camp-nome" required className="fld" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><span className="lbl">Specialità</span><select data-testid="camp-specialita" className="fld" value={f.specialita} onChange={(e) => setF({ ...f, specialita: e.target.value })}>{SPECIALITA.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span className="lbl">Anno</span><input data-testid="camp-anno" type="number" inputMode="numeric" className="fld" value={f.anno} onChange={(e) => setF({ ...f, anno: e.target.value })} /></div>
          <div><span className="lbl">Scarti</span><input data-testid="camp-form-scarti" type="number" min="0" inputMode="numeric" className="fld" value={f.scarti} onChange={(e) => setF({ ...f, scarti: e.target.value })} /></div>
<div className="sm:col-span-2"><span className="lbl">Tipo scarto</span><select data-testid="camp-form-tipo-scarto" className="fld" value={f.tipo_scarto || "intero"} onChange={(e) => setF({ ...f, tipo_scarto: e.target.value })}><option value="intero">Scarto prova peggiore</option><option value="mezzo">Mezzo scarto della peggiore</option></select></div>
          <div className="flex gap-2 sm:col-span-5"><button data-testid="camp-create-btn" className="btn btn-primary">Crea</button><button type="button" onClick={() => setF(null)} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      {list.map((c) => (
        <div key={c.id} className="card" data-testid={`campionato-${c.id}`}>
          <div className="flex items-center gap-2 p-3">
            <button onClick={() => setOpen(open === c.id ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" data-testid={`camp-toggle-${c.id}`}>
              <ChevronDown size={16} className={`shrink-0 transition-transform ${open === c.id ? "rotate-180" : ""}`} />
              <div className="min-w-0"><div className="truncate font-bold">{c.nome}</div><div className="text-xs text-slate-500">{c.specialita} · {c.anno} · {c.prove.length} prove · scarti {c.scarti}{c.tipo_scarto === "mezzo" ? " (½)" : ""}</div></div>
            </button>
            <Link to={`/campionato/${c.id}`} target="_blank" className="btn btn-sm btn-ghost" aria-label="Classifica" data-testid={`camp-open-${c.id}`}><ExternalLink size={14} /></Link>
            <button onClick={() => del(c)} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina" data-testid={`camp-del-${c.id}`}><Trash2 size={14} /></button>
          </div>
          {open === c.id && <><Settings c={c} onChange={load} /><Prove c={c} gareConcluse={gare} onChange={load} /></>}
        </div>
      ))}
    </div>
  );
};
