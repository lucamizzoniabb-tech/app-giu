import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TopBar, StatoChip } from "@/components/TopBar";
import { api, errMsg, get } from "@/lib/api";
import { SPECIALITA, TIPI, fmtDate } from "@/lib/constants";

const EMPTY = { nome: "", data: new Date().toISOString().slice(0, 10), luogo: "", specialita: "Surf Casting", tipo: "Individuale", zone: 1, max_iscritti: 30, stato: "Iscrizioni Aperte", durata_min: 180, bonus_pesce: 0, preda_tecnica: 0 };

const NuovaGara = ({ onDone }) => {
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/gare", { ...f, durata_min: Number(f.durata_min) || 180, bonus_pesce: Number(f.bonus_pesce) || 0, preda_tecnica: Number(f.preda_tecnica) || 0, zone: Number(f.zone), max_iscritti: Number(f.max_iscritti) }); toast.success("Gara creata"); onDone(); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <form onSubmit={save} className="card mb-4 grid gap-3 p-4 sm:grid-cols-3" data-testid="giudice-gara-form">
      <div className="sm:col-span-2"><span className="lbl">Nome</span><input data-testid="ggf-nome" required className="fld" value={f.nome} onChange={set("nome")} /></div>
      <div><span className="lbl">Data</span><input data-testid="ggf-data" type="date" required className="fld" value={f.data} onChange={set("data")} /></div>
      <div><span className="lbl">Luogo</span><input data-testid="ggf-luogo" required className="fld" value={f.luogo} onChange={set("luogo")} /></div>
      <div><span className="lbl">Specialità</span><select data-testid="ggf-specialita" className="fld" value={f.specialita} onChange={set("specialita")}>{SPECIALITA.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div><span className="lbl">Tipo</span><select data-testid="ggf-tipo" className="fld" value={f.tipo} onChange={set("tipo")}>{TIPI.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div><span className="lbl">Max iscritti</span><input data-testid="ggf-max" type="number" inputMode="numeric" className="fld" value={f.max_iscritti} onChange={set("max_iscritti")} /></div>
      {f.specialita === "Surf Casting" && <div><span className="lbl">Bonus pesce</span><input data-testid="ggf-bonus" type="number" min="0" inputMode="numeric" className="fld" value={f.bonus_pesce} onChange={(e) => setF({ ...f, bonus_pesce: e.target.value })} /></div>}
      {f.specialita === "Surf Casting" && <div><span className="lbl">Punteggio preda tecnica</span><input data-testid="ggf-preda" type="number" min="0" inputMode="numeric" className="fld" value={f.preda_tecnica} onChange={(e) => setF({ ...f, preda_tecnica: e.target.value })} /></div>}
      <div><span className="lbl">Durata gara (min)</span><input data-testid="ggf-durata" type="number" min="1" inputMode="numeric" className="fld" value={f.durata_min} onChange={(e) => setF({ ...f, durata_min: e.target.value })} /></div>
      <div className="flex items-end gap-2 sm:col-span-2"><button data-testid="ggf-save" className="btn btn-primary">Crea gara</button><button type="button" onClick={onDone} className="btn btn-outline">Annulla</button></div>
    </form>
  );
};

export default function GiudiceList() {
  const [gare, setGare] = useState(null);
  const [nuova, setNuova] = useState(false);
  const load = () => get("/giudice/gare").then(setGare);
  useEffect(() => { load(); }, []);
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="mr-auto text-3xl font-extrabold">Le mie gare</h1>
          {!nuova && <button data-testid="giudice-nuova-gara-btn" onClick={() => setNuova(true)} className="btn btn-primary"><Plus size={16} />Nuova gara</button>}
        </div>
        {nuova && <NuovaGara onDone={() => { setNuova(false); load(); }} />}
        <div className="space-y-3">
          {gare?.map((g) => (
            <Link key={g.id} to={`/giudice/${g.id}`} data-testid={`giudice-gara-${g.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-slate-500">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex gap-1.5"><StatoChip stato={g.stato} /><span className="chip border-slate-200 text-slate-500">{g.specialita}</span></div>
                <div className="truncate font-bold">{g.nome}</div>
                <div className="text-sm text-slate-500">{fmtDate(g.data)} · {g.luogo}</div>
              </div>
              <span className="num text-sm">{g.n_iscritti}</span>
            </Link>
          ))}
          {gare && !gare.length && <p className="text-sm text-slate-500" data-testid="no-gare">Nessuna gara assegnata.</p>}
        </div>
      </main>
    </div>
  );
}
