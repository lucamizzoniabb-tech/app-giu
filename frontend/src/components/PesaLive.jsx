import { useState } from "react";
import { Trash2, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { fmt, MISURA_STATO, puntiPreview } from "@/lib/constants";
import { NumPad } from "@/components/NumPad";

const AddForm = ({ gara, iscritto, specie, surf, onDone }) => {
  const [sp, setSp] = useState("");
  const [val, setVal] = useState("");
  const [pad, setPad] = useState(false);
  const [busy, setBusy] = useState(false);
  const spObj = specie.find((s) => s.name === sp);
  const prev = surf ? puntiPreview(spObj, val, gara) : null;
  const pk = iscritto.picchetto;
  const submit = async () => {
    if (surf && !sp) return toast.error("Seleziona la specie");
    if (!val) return toast.error(surf ? "Inserisci i cm" : "Inserisci il peso");
    setBusy(true);
    try {
      await api.post(`/gare/${gara.id}/catture`, { iscritto_id: iscritto.id, specie: surf ? sp : "Pesata", cm: surf ? Number(val) : null, peso: surf ? null : Number(val) });
      setVal(""); setPad(false);
      onDone();
    } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        {surf && (
          <select data-testid={`pesa-specie-${pk}`} className="fld h-11 min-w-0 flex-1" value={sp} onChange={(e) => { setSp(e.target.value); setPad(true); }}>
            <option value="">Specie</option>
            {specie.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.min})</option>)}
          </select>
        )}
        <button type="button" data-testid={`pesa-${surf ? "cm" : "peso"}-${pk}`} onClick={() => setPad(!pad)}
          className={`num h-11 shrink-0 rounded-md border px-3 text-left text-lg font-bold ${surf ? "w-24" : "flex-1"} ${pad ? "border-[#0f3d56] ring-2 ring-[#0f3d56]/15" : "border-slate-300"}`}>
          {val || <span className="text-sm font-normal text-slate-400">{surf ? "cm" : "peso g"}</span>}{val && <span className="ml-1 text-xs font-normal text-slate-400">{surf ? "cm" : "g"}</span>}
        </button>
      </div>
      {prev && <div data-testid={`pesa-preview-${pk}`} className={`text-xs font-semibold ${prev.sotto ? "text-red-600" : "text-emerald-700"}`}>{prev.sotto ? `Sotto misura (min ${spObj.min} cm) · preda tecnica ${prev.p} pt` : `${prev.p} punti`}</div>}
      {pad && <NumPad value={val} onChange={setVal} max={surf ? 3 : 6} onOk={submit} busy={busy} testid={`numpad-${pk}`} />}
    </div>
  );
};

export const Card = ({ r, gara, specie, surf, locked, onChange, isp }) => {
  const del = async (id) => {
    try { await api.delete(`/catture/${id}`); onChange(); } catch (er) { toast.error(errMsg(er)); }
  };
  const cart = async (chiuso) => {
    if (chiuso && !window.confirm(`Chiudere il cartellino di ${r.nome} (Pic ${r.picchetto})?${isp ? " Non potrai più inserire prede." : ""}`)) return;
    try { await api.post(`/gare/${gara.id}/iscritti/${r.id}/cartellino`, { chiuso }); toast.success(chiuso ? "Cartellino chiuso" : "Cartellino riaperto"); onChange(); } catch (er) { toast.error(errMsg(er)); }
  };
  const chiuso = r.cartellino_chiuso;
  return (
    <div className="card p-3" data-testid={`pesa-card-${r.picchetto}`} style={r.colore ? { borderLeft: `5px solid ${r.colore}` } : undefined}>
      <div className="flex items-start gap-3">
        <div className="num w-10 text-2xl font-bold leading-none">{r.picchetto}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{r.nome}</span>
            {chiuso ? (
              <span data-testid={`cartellino-chiuso-${r.picchetto}`} className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"><Lock size={10} />Chiuso
                {!isp && !locked && <button data-testid={`cartellino-riapri-${r.picchetto}`} onClick={() => cart(false)} className="ml-1 rounded bg-white/20 px-1 hover:bg-white/30" aria-label="Riapri cartellino"><LockOpen size={10} /></button>}
              </span>
            ) : !locked && (
              <button data-testid={`cartellino-chiudi-${r.picchetto}`} onClick={() => cart(true)} title="Chiudi cartellino" aria-label="Chiudi cartellino" className="grid h-6 w-6 shrink-0 place-items-center rounded border border-slate-300 text-slate-400 hover:border-slate-900 hover:text-slate-900"><Lock size={11} /></button>
            )}
          </div>
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
                <td className="text-right">{c.stato && c.stato !== "APPROVATA" ? <span title={c.motivo || ""} className={`chip ${MISURA_STATO[c.stato].c}`}>{MISURA_STATO[c.stato].t}</span> : !locked && !isp && <button data-testid={`pesa-del-${c.id}`} onClick={() => del(c.id)} className="text-slate-400 hover:text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!locked && !(isp && chiuso) && <AddForm gara={gara} iscritto={r} specie={specie} surf={surf} onDone={() => { if (isp) toast.success(`Misura inviata · Pic ${r.picchetto}`); onChange(); }} />}
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
