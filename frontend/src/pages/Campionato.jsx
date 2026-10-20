import { useParams } from "react-router-dom";
import { Crown } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { get, usePoll } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/constants";

export default function Campionato() {
  const { id } = useParams();
  const { data, error } = usePoll(() => get(`/campionati/${id}`), 10000, id);
  if (error && !data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Campionato non trovato.</p></>;
  if (!data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Caricamento…</p></>;
  const { campionato: c, classifica } = data;
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="chip border-[#0f3d56]/20 bg-[#0f3d56]/5 text-[#0f3d56]">{c.specialita}</span>
          <span className="chip border-slate-200 text-slate-500">{c.anno}</span>
          <span className="chip border-slate-200 text-slate-500">{c.prove.length} prove · {c.tipo_scarto === "mezzo" ? "mezzo scarto della peggiore" : "scarto prova peggiore"}</span>
        </div>
        <h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="campionato-nome">{c.nome}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {c.prove.map((p, i) => <span key={p.id} className="rounded border border-slate-200 px-2 py-1"><b>P{i + 1}</b> {p.nome}{p.data ? ` · ${fmtDate(p.data)}` : ""}</span>)}
        </div>
        <h2 className="mb-3 mt-8 text-lg font-bold">Classifica generale</h2>
        <ul className="card divide-y divide-slate-100 overflow-hidden" data-testid="classifica-generale">
          {classifica.map((a, i) => (
            <li key={a.nome} className={`flex items-center gap-3 px-3 py-2.5 ${i === 0 ? "bg-emerald-50" : ""}`}>
              <span className={`num grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold ${i === 0 ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{i === 0 ? <Crown size={16} /> : a.pos}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{a.nome}</div>
                <div className="truncate text-xs text-slate-500">{a.societa} · {a.presenze}/{c.prove.length} presenze</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.pen_eff.map((p, k) => (
                    <span key={k} className={`num rounded px-1.5 text-[11px] ${a.scartate.includes(k) ? (c.tipo_scarto === "mezzo" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400 line-through") : a.pen[k] == null ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-700"}`}>P{k + 1}:{p}{a.scartate.includes(k) && c.tipo_scarto === "mezzo" ? " ½" : ""}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right"><div className="num text-lg font-bold">{a.tot_pen}</div><div className="text-[11px] text-slate-500">pen · {fmt(a.tot_punti)} pt</div></div>
            </li>
          ))}
          {!classifica.length && <li className="p-3 text-sm text-slate-500">Nessuna prova inserita.</li>}
        </ul>
      </main>
    </div>
  );
}
