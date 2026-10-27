import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Crown, Maximize } from "lucide-react";
import { GaraTimer } from "@/components/GaraTimer";
import { get, usePoll } from "@/lib/api";
import { fmt, fmtTime } from "@/lib/constants";

const VISTE = [["settori", "Settori"], ["assoluta", "Assoluta"], ["societa", "Società"], ["gruppi", "Squadre"]];

const Riga = ({ pos, first, pic, nome, sub, tot, pen }) => (
  <li className={`flex items-center gap-3 px-3 py-2 ${first ? "bg-emerald-500/15" : ""}`}>
    <span className={`num grid h-9 w-9 shrink-0 place-items-center rounded font-bold ${first ? "bg-emerald-500 text-white" : "bg-white/10"}`}>{first ? <Crown size={17} /> : pos}</span>
    {pic && <span className="num w-12 shrink-0 text-center text-xl font-bold text-sky-300">{pic}</span>}
    <div className="min-w-0 flex-1"><div className="truncate text-lg font-semibold">{nome}</div><div className="truncate text-sm text-white/50">{sub}</div></div>
    <div className="shrink-0 text-right"><div className="num text-2xl font-bold">{tot}</div><div className="text-xs text-white/50">{pen}</div></div>
  </li>
);

const Box = ({ title, tecnico, children }) => (
  <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
    <div className={`px-3 py-2 font-display text-lg font-bold ${tecnico ? "bg-yellow-300 text-yellow-950" : "bg-white/10"}`}>{title}</div>
    <ul className="divide-y divide-white/5">{children}</ul>
  </div>
);

export default function Schermo() {
  const { id } = useParams();
  const { data } = usePoll(() => get(`/gare/${id}/classifica`), 3000, id);
  const [vista, setVista] = useState("settori");
  const [auto, setAuto] = useState(true);
  const gruppi = data?.classifica.gruppi.length > 0;
  const viste = VISTE.filter(([k]) => k !== "gruppi" || gruppi);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setVista((v) => viste[(viste.findIndex(([k]) => k === v) + 1) % viste.length][0]), 20000);
    return () => clearInterval(t);
  }, [auto, viste.length]); // eslint-disable-line

  if (!data) return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Caricamento…</div>;
  const { gara: g, classifica: c } = data;
  const prede = c.individui.flatMap((r) => r.catture.map((x) => ({ ...x, r }))).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  return (
    <div className="min-h-screen bg-slate-950 p-5 text-white" data-testid="schermo-page">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/50">
            {g.stato === "In Corso Live" && <span className="live-dot" />}{g.stato} · {g.specialita} · {g.tipo}
          </div>
          <h1 className="truncate text-3xl font-extrabold lg:text-4xl" data-testid="schermo-nome">{g.nome}</h1>
        </div>
        <div className="w-full max-w-md"><GaraTimer gara={g} big /></div>
        <button data-testid="schermo-fullscreen" onClick={full} className="btn bg-white/10 hover:bg-white/20" aria-label="Schermo intero"><Maximize size={18} /></button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {viste.map(([k, t]) => (
          <button key={k} data-testid={`schermo-vista-${k}`} onClick={() => { setVista(k); setAuto(false); }} className={`btn btn-sm ${vista === k ? "bg-white text-slate-950" : "bg-white/10 hover:bg-white/20"}`}>{t}</button>
        ))}
        <button data-testid="schermo-auto" onClick={() => setAuto(!auto)} className={`btn btn-sm ${auto ? "bg-emerald-500 text-white" : "bg-white/10"}`}>Rotazione {auto ? "ON" : "OFF"}</button>
      </div>
      {!c.individui.length ? <p className="text-white/60">Sorteggio non ancora effettuato.</p> : (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))]">
            {vista === "settori" && c.settori.map((s) => (
              <Box key={s.lettera} title={`SETTORE ${s.lettera}${s.tecnico ? " TECNICO" : ""}`} tecnico={s.tecnico}>
                {s.rows.map((r) => <Riga key={r.id} pos={r.pos} first={r.pen === 1 && r.tot > 0} pic={r.picchetto} nome={r.nome} sub={`${r.societa} · ${r.n_pesci} pesci`} tot={fmt(r.tot)} pen={`Pen ${r.pen}`} />)}
              </Box>
            ))}
            {vista === "assoluta" && <Box title="CLASSIFICA ASSOLUTA">{c.assoluta.map((r, i) => <Riga key={r.id} pos={i + 1} first={i === 0 && r.tot > 0} pic={`${r.settore}${r.picchetto}`} nome={r.nome} sub={r.societa} tot={fmt(r.tot)} pen={`Pen ${r.pen}`} />)}</Box>}
            {vista === "societa" && <Box title="CLASSIFICA SOCIETÀ">{c.societa.map((s, i) => <Riga key={s.societa} pos={i + 1} first={i === 0 && s.tot > 0} nome={s.societa} sub={s.migliori.join(", ")} tot={`Pen ${s.pen}`} pen={fmt(s.tot)} />)}</Box>}
            {vista === "gruppi" && <Box title="SQUADRE / BOX / COPPIE">{c.gruppi.map((x, i) => <Riga key={x.gruppo} pos={i + 1} first={i === 0 && x.tot > 0} nome={x.gruppo} sub={x.societa} tot={`Pen ${x.pen}`} pen={fmt(x.tot)} />)}</Box>}
          </div>
          <Box title="ULTIME PREDE">
            {prede.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2" data-testid="schermo-preda">
                <span className="num w-12 shrink-0 text-center font-bold text-sky-300">{p.r.settore}{p.r.picchetto}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.surf ? `${p.specie} ${p.cm} cm` : `${fmt(p.peso)} g`}</div><div className="truncate text-xs text-white/50">{p.r.nome} · {fmtTime(p.created_at)}</div></div>
                {c.surf && <span className="num text-lg font-bold">{fmt(p.punti)}</span>}
              </li>
            ))}
            {!prede.length && <li className="px-3 py-3 text-sm text-white/50">Nessuna preda</li>}
          </Box>
        </div>
      )}
    </div>
  );
}
