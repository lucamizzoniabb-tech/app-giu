export const CampoGara = ({ individui, settori }) => {
  if (!individui?.length) return <p className="text-sm text-slate-500">Sorteggio non ancora effettuato.</p>;
  const zone = [...new Set(individui.map((i) => i.zona))].sort();
  const tecnico = new Set((settori || []).filter((s) => s.tecnico).map((s) => s.lettera));
  return (
    <div className="space-y-6" data-testid="campo-gara">
      {zone.map((z) => (
        <div key={z}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Zona {z}</div>
          {[...new Set(individui.filter((i) => i.zona === z).map((i) => i.settore))].map((s) => (
            <div key={s} className={`mb-3 rounded-lg border p-3 ${tecnico.has(s) ? "border-yellow-300 bg-yellow-50" : "border-slate-200"}`} data-testid={`campo-settore-${s}`}>
              <div className="mb-2 font-display text-sm font-bold">SETTORE {s}{tecnico.has(s) && " TECNICO"}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {individui.filter((i) => i.settore === s).map((i) => (
                  <div key={i.id} className="rounded-md border border-slate-200 bg-white p-2" style={i.colore ? { borderLeft: `5px solid ${i.colore}` } : undefined}>
                    <div className="flex items-baseline justify-between">
                      <span className="num text-xl font-bold">{i.picchetto}</span>
                      {i.esterno && <span className="chip border-slate-300 text-slate-500">Est</span>}
                    </div>
                    <div className="truncate text-sm font-semibold">{i.nome}</div>
                    <div className="truncate text-xs text-slate-500">{i.societa}</div>
                    {i.gruppo && <div className="truncate text-xs text-slate-400">{i.gruppo}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
