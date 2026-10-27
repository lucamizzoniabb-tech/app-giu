export const CampoGara = ({ individui, settori }) => {
  if (!individui?.length) return <p className="text-sm text-slate-500">Sorteggio non ancora effettuato.</p>;
  const zone = [...new Set(individui.map((i) => i.zona))].sort();
  const tecnico = new Set((settori || []).filter((s) => s.tecnico).map((s) => s.lettera));
  return (
    <div className="space-y-6" data-testid="campo-gara">
      {zone.map((z) => (
        <div key={z}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Zona {z}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[...new Set(individui.filter((i) => i.zona === z).map((i) => i.settore))].map((s) => (
              <div key={s} className="card overflow-hidden" data-testid={`campo-settore-${s}`}>
                <div className={`px-3 py-2 font-display text-sm font-bold ${tecnico.has(s) ? "bg-yellow-300 text-yellow-950" : "bg-slate-50"}`}>SETTORE {s}{tecnico.has(s) && " TECNICO"}</div>
                <ul className={`divide-y divide-slate-100 ${tecnico.has(s) ? "bg-yellow-50/60" : ""}`}>
                  {individui.filter((i) => i.settore === s).map((i) => (
                    <li key={i.id} className="flex items-center gap-3 px-3 py-2" style={i.colore ? { borderLeft: `5px solid ${i.colore}` } : undefined} data-testid={`campo-pic-${i.picchetto}`}>
                      <span className="num w-9 shrink-0 text-center text-lg font-bold text-[#0f3d56]">{i.picchetto}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{i.nome}</div>
                        <div className="truncate text-xs text-slate-500">{i.societa}{i.gruppo ? ` · ${i.gruppo}` : ""}</div>
                      </div>
                      {i.esterno && <span className="chip border-slate-300 text-slate-500">Esterno</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
