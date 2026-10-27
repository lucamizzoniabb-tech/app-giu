import { useEffect, useState } from "react";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { groupBySoc } from "@/components/AtletiManager";

export const DaAtleti = ({ gara, iscritti, onDone }) => {
  const [atleti, setAtleti] = useState([]);
  const [soc, setSoc] = useState("");
  const [sel, setSel] = useState([]);
  useEffect(() => { get("/atleti").then(setAtleti); }, []);
  const gia = new Set(iscritti.map((i) => i.atleta_id).filter(Boolean));
  const groups = groupBySoc(atleti);
  const add = async () => {
    try { const { data } = await api.post(`/gare/${gara.id}/iscritti/da-atleti`, { ids: sel }); toast.success(`${data.added} iscritti aggiunti`); setSel([]); onDone(); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <div className="card space-y-2 p-3" data-testid="da-atleti">
      <span className="lbl">Iscrivi dal database atleti</span>
      <select data-testid="da-atleti-societa" className="fld" value={soc} onChange={(e) => { setSoc(e.target.value); setSel([]); }}>
        <option value="">Seleziona società</option>
        {Object.entries(groups).map(([s, a]) => <option key={s} value={s}>{s} ({a.length})</option>)}
      </select>
      {soc && (
        <>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {groups[soc].map((a) => (
              <label key={a.id} className={`flex items-center gap-2 text-sm ${gia.has(a.id) ? "text-slate-400" : ""}`}>
                <input type="checkbox" className="h-5 w-5" disabled={gia.has(a.id)} data-testid={`da-atleti-${a.id}`} checked={sel.includes(a.id)}
                  onChange={(e) => setSel(e.target.checked ? [...sel, a.id] : sel.filter((x) => x !== a.id))} />
                {a.cognome} {a.nome}{gia.has(a.id) && " · già iscritto"}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSel(groups[soc].filter((a) => !gia.has(a.id)).map((a) => a.id))}>Tutti</button>
            <button data-testid="da-atleti-add" disabled={!sel.length} onClick={add} className="btn btn-sm btn-primary"><UserPlus size={14} />Iscrivi {sel.length || ""}</button>
          </div>
        </>
      )}
    </div>
  );
};

export const SquadreIndividuale = ({ gara, iscritti, locked, onDone }) => {
  const [soc, setSoc] = useState("");
  const [sel, setSel] = useState([]);
  const [nome, setNome] = useState("");
  const squadre = Object.entries(iscritti.filter((i) => i.gruppo).reduce((m, i) => ({ ...m, [i.gruppo]: [...(m[i.gruppo] || []), i] }), {}));
  const perSoc = (s) => new Set(iscritti.filter((i) => i.societa === s && i.gruppo).map((i) => i.gruppo)).size;
  const liberi = iscritti.filter((i) => !i.gruppo && i.societa === soc);
  const socs = [...new Set(iscritti.map((i) => i.societa))].filter((s) => iscritti.filter((i) => i.societa === s && !i.gruppo).length >= 4 && perSoc(s) < 2);
  const pick = (s) => { setSoc(s); setSel([]); setNome(s ? `${s} ${perSoc(s) ? "B" : "A"}` : ""); };
  const crea = async () => {
    try { await api.post(`/gare/${gara.id}/squadre`, { nome, membri: sel }); toast.success("Squadra creata"); pick(""); onDone(); } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (n) => { try { await api.delete(`/gare/${gara.id}/squadre/${encodeURIComponent(n)}`); onDone(); } catch (er) { toast.error(errMsg(er)); } };
  return (
    <div className="card space-y-3 p-3" data-testid="squadre-individuale">
      <span className="lbl">Squadre da 4 per classifica (max 2 per società)</span>
      {squadre.map(([n, m]) => (
        <div key={n} className="flex items-start gap-2 text-sm" data-testid={`squadra-${n}`}>
          <Users size={15} className="mt-0.5 text-[#0f3d56]" />
          <div className="flex-1"><b>{n}</b><div className="text-xs text-slate-500">{m.map((x) => `${x.cognome} ${x.nome}`).join(", ")}</div></div>
          {!locked && <button data-testid={`del-squadra-${n}`} onClick={() => del(n)} className="text-slate-400 hover:text-red-600" aria-label="Elimina squadra"><Trash2 size={14} /></button>}
        </div>
      ))}
      {!locked && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <select data-testid="squadra-societa" className="fld" value={soc} onChange={(e) => pick(e.target.value)}>
            <option value="">Nuova squadra: scegli società</option>{socs.map((s) => <option key={s}>{s}</option>)}
          </select>
          {soc && (
            <>
              <input data-testid="squadra-nome" className="fld" value={nome} onChange={(e) => setNome(e.target.value)} />
              <div className="grid grid-cols-2 gap-1">
                {liberi.map((i) => (
                  <label key={i.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5" data-testid={`squadra-membro-${i.id}`} checked={sel.includes(i.id)} disabled={!sel.includes(i.id) && sel.length >= 4}
                      onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} />{i.cognome} {i.nome}
                  </label>
                ))}
              </div>
              <button data-testid="squadra-crea-btn" disabled={sel.length !== 4 || !nome.trim()} onClick={crea} className="btn btn-sm btn-primary">Crea squadra ({sel.length}/4)</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
