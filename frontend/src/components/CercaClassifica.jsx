import { useState } from "react";
import { Search, X } from "lucide-react";
import { fmt } from "@/lib/constants";

export const CercaClassifica = ({ classifica }) => {
  const [q, setQ] = useState("");
  if (!classifica?.individui.length) return null;
  const t = q.trim().toLowerCase();
  const res = t ? classifica.assoluta.map((r, i) => ({ ...r, ass: i + 1 })).filter((r) =>
    `${r.nome} ${r.societa} ${r.gruppo} ${r.settore}${r.picchetto}`.toLowerCase().includes(t) || String(r.picchetto) === t) : [];
  return (
    <div className="mb-5" data-testid="cerca-classifica">
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input data-testid="cerca-classifica-input" className="fld h-12 pl-10 pr-10" placeholder="Cerca concorrente, società o picchetto" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button data-testid="cerca-clear" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Cancella"><X size={17} /></button>}
      </div>
      {t && (
        <ul className="card mt-2 divide-y divide-slate-100" data-testid="cerca-risultati">
          {res.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="num w-12 shrink-0 text-center text-sm font-bold text-[#0f3d56]">{r.settore}{r.picchetto}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.nome}</div>
                <div className="truncate text-xs text-slate-500">{r.societa} · {r.n_pesci} pesci · {r.pos}° settore {r.settore} · {r.ass}° assoluto</div>
              </div>
              <div className="shrink-0 text-right"><div className="num font-bold">{fmt(r.tot)}</div><div className="text-[11px] text-slate-500">Pen {r.pen}</div></div>
            </li>
          ))}
          {!res.length && <li className="p-3 text-sm text-slate-500">Nessun risultato</li>}
        </ul>
      )}
    </div>
  );
};
