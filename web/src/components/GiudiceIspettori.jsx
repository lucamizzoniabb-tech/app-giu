import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";

const STATO = {
  IN_ATTESA: "border-amber-200 bg-amber-50 text-amber-800",
  ACCETTATO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RIFIUTATO: "border-red-200 bg-red-50 text-red-700",
  TERMINATO: "border-slate-200 bg-slate-100 text-slate-500",
};

export const GiudiceIspettori = ({ gara }) => {
  const [ispettori, setIspettori] = useState([]);
  const [inviti, setInviti] = useState([]);
  const [isp, setIsp] = useState("");
  const [settore, setSettore] = useState("");
  const load = () => get(`/gare/${gara.id}/inviti`).then(setInviti);
  useEffect(() => { load(); get("/ispettori").then(setIspettori); }, [gara.id]); // eslint-disable-line
  const letters = (gara.settori || []).map((s) => s.lettera);

  const invita = async (e) => {
    e.preventDefault();
    try { await api.post(`/gare/${gara.id}/inviti`, { ispettore_id: isp, settore }); toast.success("Invito inviato"); setIsp(""); load(); } catch (er) { toast.error(errMsg(er)); }
  };
  const revoca = async (id) => {
    if (!window.confirm("Revocare l'invito? L'ispettore uscirà dalla gara.")) return;
    try { await api.delete(`/inviti/${id}`); load(); } catch (er) { toast.error(errMsg(er)); }
  };

  return (
    <div className="space-y-4">
      {!letters.length && <p className="text-sm text-slate-500">Effettua il sorteggio per assegnare i settori.</p>}
      {letters.length > 0 && (
        <form onSubmit={invita} className="card flex flex-wrap items-end gap-2 p-3" data-testid="invito-form">
          <div className="min-w-[12rem] flex-1"><span className="lbl">Ispettore</span>
            <select data-testid="invito-ispettore-select" required className="fld" value={isp} onChange={(e) => setIsp(e.target.value)}>
              <option value="">Seleziona</option>
              {ispettori.map((u) => <option key={u.id} value={u.id}>{u.username}{u.nome ? ` · ${u.nome}` : ""}</option>)}
            </select></div>
          <div className="w-36"><span className="lbl">Settore</span>
            <select data-testid="invito-settore-select" required className="fld" value={settore} onChange={(e) => setSettore(e.target.value)}>
              <option value="">—</option>{letters.map((l) => <option key={l} value={l}>SETTORE {l}</option>)}
            </select></div>
          <button data-testid="invito-send-btn" className="btn btn-primary"><UserPlus size={16} />Invita</button>
        </form>
      )}
      <ul className="card divide-y divide-slate-100" data-testid="inviti-list">
        {inviti.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`invito-${i.ispettore_username}`}>
            <span className="num grid h-9 w-9 place-items-center rounded-md bg-slate-900 font-bold text-white">{i.settore}</span>
            <div className="min-w-0 flex-1"><div className="font-semibold">{i.ispettore_username}</div><div className="text-xs text-slate-500">{i.ispettore_nome}</div></div>
            <span className={`chip ${STATO[i.stato]}`}>{i.stato.replace("_", " ")}</span>
            {["IN_ATTESA", "ACCETTATO"].includes(i.stato) && <button data-testid={`revoca-${i.ispettore_username}`} onClick={() => revoca(i.id)} className="btn btn-sm btn-ghost text-red-600" aria-label="Revoca"><X size={15} /></button>}
          </li>
        ))}
        {!inviti.length && <li className="p-3 text-sm text-slate-500">Nessun ispettore invitato.</li>}
      </ul>
    </div>
  );
};
