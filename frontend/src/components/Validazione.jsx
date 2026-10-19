import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { MISURA_STATO, fmtTime, puntiPreview } from "@/lib/constants";

const PuntiTag = ({ sp, cm, gara }) => {
  const p = puntiPreview(sp, cm, gara);
  if (!p) return null;
  return <span className={`text-xs font-semibold ${p.sotto ? "text-red-600" : "text-emerald-700"}`}>{p.sotto ? `preda tecnica · ${p.p} pt` : `${p.p} pt`}</span>;
};

const Pending = ({ c, isc, specie, surf, gara, onChange }) => {
  const [mode, setMode] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [sp, setSp] = useState(c.specie || "");
  const [cm, setCm] = useState(c.cm ?? "");
  const act = async (azione, extra = {}) => {
    try {
      await api.put(`/catture/${c.id}`, { azione, ...extra });
      toast.success(azione === "rigetta" ? "Misura rigettata" : "Misura approvata");
      onChange();
    } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <div className="card fade-up border-amber-300 p-3" data-testid={`pending-${c.id}`}>
      <div className="flex items-start gap-3">
        <div className="num rounded bg-slate-900 px-2 py-1 text-sm font-bold text-white">{c.settore}{isc?.picchetto}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{isc?.nome}</div>
          <div className="text-xs text-slate-500">da {c.inviato_da} · {fmtTime(c.created_at)}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold">{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}</div>
          {surf && <PuntiTag gara={gara} sp={specie.find((s) => s.name === c.specie)} cm={c.cm} />}
          {surf && c.peso ? <div className="text-xs text-slate-500">{c.peso} g</div> : null}
        </div>
      </div>
      {mode === "rigetta" && (
        <div className="mt-3 flex gap-2">
          <input data-testid="reject-reason-input" autoFocus className="fld" placeholder="Motivazione" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <button data-testid="reject-confirm-btn" onClick={() => act("rigetta", { motivo })} className="btn btn-danger">Rigetta</button>
        </div>
      )}
      {mode === "correggi" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {surf && <select data-testid="correct-specie-select" className="fld flex-1" value={sp} onChange={(e) => setSp(e.target.value)}>{specie.map((s) => <option key={s.name}>{s.name}</option>)}</select>}
          <input data-testid="correct-cm-input" className="fld w-24" type="number" step="1" inputMode="numeric" value={cm} onChange={(e) => setCm(e.target.value)} />
          <button data-testid="correct-confirm-btn" onClick={() => act("correggi", surf ? { specie: sp, cm: Number(cm) } : { peso: Number(cm) })} className="btn btn-primary">Salva e approva</button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button data-testid={`approve-btn-${c.id}`} onClick={() => act("approva")} className="btn btn-success"><Check size={16} />Approva</button>
        <button data-testid={`reject-btn-${c.id}`} onClick={() => setMode(mode === "rigetta" ? null : "rigetta")} className="btn btn-outline text-red-600"><X size={16} />Rigetta</button>
        <button data-testid={`correct-btn-${c.id}`} onClick={() => setMode(mode === "correggi" ? null : "correggi")} className="btn btn-outline"><Pencil size={14} />Correggi</button>
      </div>
    </div>
  );
};

export const Validazione = ({ catture, individui, specie, surf, gara, locked, onChange }) => {
  const map = Object.fromEntries((individui || []).map((i) => [i.id, i]));
  const fromIsp = (catture || []).filter((c) => c.origine === "ISPETTORE");
  const pend = fromIsp.filter((c) => c.stato === "IN_ATTESA");
  const done = fromIsp.filter((c) => c.stato !== "IN_ATTESA").slice(0, 40);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2" data-testid="pending-list">
        {pend.map((c) => <Pending key={c.id} c={c} isc={map[c.iscritto_id]} specie={specie} surf={surf} gara={gara} onChange={onChange} />)}
        {!pend.length && <p className="text-sm text-slate-500" data-testid="no-pending">Nessuna misura in attesa.</p>}
      </div>
      {locked && <p className="text-sm text-slate-500">Gara conclusa: misure bloccate.</p>}
      {done.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Ora</th><th>Pic</th><th>Nome</th><th>Misura</th><th>Da</th><th>Stato</th></tr></thead>
            <tbody>
              {done.map((c) => (
                <tr key={c.id}>
                  <td className="num text-xs">{fmtTime(c.created_at)}</td>
                  <td className="num">{c.settore}{map[c.iscritto_id]?.picchetto}</td>
                  <td>{map[c.iscritto_id]?.nome}</td>
                  <td>{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}{surf && <> · <PuntiTag gara={gara} sp={specie.find((s) => s.name === c.specie)} cm={c.cm} /></>}{c.corretta && <span className="text-xs text-slate-400"> (corr.)</span>}</td>
                  <td className="text-xs">{c.inviato_da}</td>
                  <td><span className={`chip ${MISURA_STATO[c.stato].c}`}>{MISURA_STATO[c.stato].t}</span>{c.motivo && <div className="text-xs text-red-600">{c.motivo}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
