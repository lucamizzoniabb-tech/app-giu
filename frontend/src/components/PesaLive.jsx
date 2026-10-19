import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { fmt } from "@/lib/constants";

const AddForm = ({ gara, iscritto, specie, surf, onDone }) => {
  const [sp, setSp] = useState("");
  const [cm, setCm] = useState("");
  const [peso, setPeso] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/gare/${gara.id}/catture`, {
        iscritto_id: iscritto.id, specie: surf ? sp : "Pesata", cm: surf && cm !== "" ? Number(cm) : null, peso: peso !== "" ? Number(peso) : null,
      });
      setCm(""); setPeso("");
      onDone();
    } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap gap-2">
      {surf && (
        <select required data-testid={`pesa-specie-${iscritto.picchetto}`} className="fld h-10 min-w-[8rem] flex-1" value={sp} onChange={(e) => setSp(e.target.value)}>
          <option value="">Specie</option>
          {specie.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.min})</option>)}
        </select>
      )}
      {surf && <input required data-testid={`pesa-cm-${iscritto.picchetto}`} className="fld h-10 w-20" type="number" step="1" min="0" inputMode="numeric" placeholder="cm" value={cm} onChange={(e) => setCm(e.target.value)} />}
      {!surf && <input required data-testid={`pesa-peso-${iscritto.picchetto}`} className="fld h-10 w-24" type="number" step="1" min="0" inputMode="numeric" placeholder="peso g" value={peso} onChange={(e) => setPeso(e.target.value)} />}
      <button data-testid={`pesa-add-${iscritto.picchetto}`} className="btn btn-primary h-10 px-3" aria-label="Aggiungi"><Plus size={16} /></button>
    </form>
  );
};

const Card = ({ r, gara, specie, surf, locked, onChange }) => {
  const del = async (id) => {
    try { await api.delete(`/catture/${id}`); onChange(); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <div className="card p-3" data-testid={`pesa-card-${r.picchetto}`} style={r.colore ? { borderLeft: `5px solid ${r.colore}` } : undefined}>
      <div className="flex items-start gap-3">
        <div className="num w-10 text-2xl font-bold leading-none">{r.picchetto}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{r.nome}</div>
          <div className="truncate text-xs text-slate-500">{r.settore} · {r.societa}{r.gruppo ? ` · ${r.gruppo}` : ""}</div>
        </div>
        <div className="text-right">
          <div className="num text-lg font-bold" data-testid={`pesa-tot-${r.picchetto}`}>{fmt(r.tot)}</div>
          <div className="text-[10px] uppercase text-slate-400">{r.n_pesci} catture</div>
        </div>
      </div>
      {r.catture.length > 0 && (
        <table className="tbl mt-2 text-xs">
          {surf && <thead><tr><th>Specie</th><th>cm</th><th>Punti</th><th /></tr></thead>}
          <tbody>
            {r.catture.map((c) => (
              <tr key={c.id}>
                {surf ? (
                  <>
                    <td>{c.specie}{c.peso ? <span className="text-slate-400"> · {c.peso}g</span> : ""}</td><td className="num">{c.cm}</td>
                    <td className={`num font-bold ${c.dettaglio?.sotto ? "text-red-600" : ""}`}>{fmt(c.punti)}<span className="ml-1 text-[10px] font-normal text-slate-400">{c.dettaglio?.sotto ? "p.tecnica" : c.dettaglio?.bonus ? `${c.dettaglio.tabella}+${c.dettaglio.bonus}` : ""}</span></td>
                  </>
                ) : (
                  <><td>Pesata</td><td className="num font-bold">{fmt(c.peso)} g</td></>
                )}
                <td className="text-right">{!locked && <button data-testid={`pesa-del-${c.id}`} onClick={() => del(c.id)} className="text-slate-400 hover:text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!locked && <AddForm gara={gara} iscritto={r} specie={specie} surf={surf} onDone={onChange} />}
    </div>
  );
};

export const PesaLive = ({ gara, classifica, specie, onChange }) => {
  const [vista, setVista] = useState("ind");
  const [settore, setSettore] = useState("ALL");
  if (!classifica?.individui.length) return <p className="text-sm text-slate-500">Sorteggio non ancora effettuato.</p>;
  const locked = gara.stato === "Conclusa";
  const rows = classifica.individui.filter((r) => settore === "ALL" || r.settore === settore);
  return (
    <div className="space-y-3" data-testid="pesa-live">
      <div className="flex flex-wrap gap-2">
        <select data-testid="pesa-settore-filter" className="fld h-10 w-auto" value={settore} onChange={(e) => setSettore(e.target.value)}>
          <option value="ALL">Tutti i settori</option>
          {classifica.settori.map((s) => <option key={s.lettera} value={s.lettera}>Settore {s.lettera}</option>)}
        </select>
        {classifica.gruppi.length > 0 && (
          <div className="flex rounded-md border border-slate-300 p-0.5">
            {[["ind", "Individuale"], ["grp", "Gruppi"]].map(([k, t]) => (
              <button key={k} data-testid={`pesa-vista-${k}`} onClick={() => setVista(k)} className={`btn btn-sm ${vista === k ? "bg-slate-900 text-white" : ""}`}>{t}</button>
            ))}
          </div>
        )}
      </div>
      {vista === "ind" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => <Card key={r.id} r={r} gara={gara} specie={specie} surf={classifica.surf} locked={locked} onChange={onChange} />)}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {classifica.gruppi.map((g) => (
            <div key={g.gruppo} className="card p-3" data-testid={`pesa-gruppo-${g.gruppo}`}>
              <div className="flex justify-between"><span className="font-display font-bold">{g.gruppo}</span><span className="num text-lg font-bold">{fmt(g.tot)}</span></div>
              <div className="mb-2 text-xs text-slate-500">{g.societa} · Pen {g.pen}</div>
              {g.membri.map((m) => (
                <div key={m.id} className="flex justify-between border-t border-slate-100 py-1 text-sm">
                  <span><span className="num mr-2">{m.settore}{m.picchetto}</span>{m.nome}</span><span className="num">{fmt(m.tot)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
