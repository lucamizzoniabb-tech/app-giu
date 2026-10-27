import { useState } from "react";
import { fmt, fmtTime } from "@/lib/constants";

export const ListaPrede = ({ classifica }) => {
  const [settore, setSettore] = useState("ALL");
  if (!classifica?.individui.length) return <p className="text-sm text-slate-500">Sorteggio non ancora effettuato.</p>;
  const surf = classifica.surf;
  const prede = classifica.individui
    .flatMap((r) => r.catture.map((c) => ({ ...c, r })))
    .filter((c) => settore === "ALL" || c.r.settore === settore)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="space-y-3" data-testid="lista-prede">
      <div className="flex items-center gap-2">
        <select data-testid="prede-settore-filter" className="fld h-10 w-auto" value={settore} onChange={(e) => setSettore(e.target.value)}>
          <option value="ALL">Tutti i settori</option>
          {classifica.settori.map((s) => <option key={s.lettera} value={s.lettera}>Settore {s.lettera}</option>)}
        </select>
        <span className="text-sm text-slate-500" data-testid="prede-count">{prede.length} prede</span>
      </div>
      <ul className="card divide-y divide-slate-100 overflow-hidden">
        {prede.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`preda-${c.id}`}>
            <span className="num w-12 shrink-0 text-center text-sm font-bold text-[#0f3d56]">{c.r.settore}{c.r.picchetto}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{surf ? `${c.specie} · ${c.cm} cm` : `${fmt(c.peso)} g`}</div>
              <div className="truncate text-xs text-slate-500">{c.r.nome} · {c.r.societa} · {fmtTime(c.created_at)}</div>
            </div>
            {surf && (
              <div className="shrink-0 text-right">
                <div className={`num font-bold ${c.dettaglio?.sotto ? "text-red-600" : ""}`}>{fmt(c.punti)}</div>
                <div className="text-[10px] text-slate-400">{c.dettaglio?.sotto ? "preda tecnica" : c.dettaglio?.bonus ? `${c.dettaglio.tabella}+${c.dettaglio.bonus} bonus` : "punti"}</div>
              </div>
            )}
          </li>
        ))}
        {!prede.length && <li className="p-3 text-sm text-slate-500">Nessuna preda registrata.</li>}
      </ul>
    </div>
  );
};
