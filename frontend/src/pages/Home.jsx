import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, FileText, Radio, ExternalLink, Trophy } from "lucide-react";
import { TopBar, StatoChip } from "@/components/TopBar";
import { get } from "@/lib/api";
import { STATI, fmtDate, docUrl } from "@/lib/constants";
import { LocandinaThumb, locandinaUrl } from "@/components/Locandina";

const GaraRow = ({ g, i }) => (
  <div className="card fade-up flex flex-col gap-3 p-4 transition-colors hover:border-slate-400 sm:flex-row sm:items-center" style={{ animationDelay: `${Math.min(i, 6) * 25}ms` }} data-testid={`gara-card-${g.id}`}>
    <LocandinaThumb g={g} className="hidden h-24 w-[4.5rem] sm:block" />
    <div className="flex-1 min-w-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="chip border-[#0f3d56]/20 bg-[#0f3d56]/5 text-[#0f3d56]">{g.specialita}</span>
        <StatoChip stato={g.stato} />
        <span className="chip border-slate-200 text-slate-500">{g.tipo}</span>
      </div>
      <h3 className="truncate text-lg font-bold">{g.nome}</h3>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        <span className="flex items-center gap-1"><Calendar size={13} />{fmtDate(g.data)}</span>
        <span className="flex items-center gap-1"><MapPin size={13} />{g.luogo}</span>
      </div>
      <div className="num mt-2 text-xs text-slate-700" data-testid={`gara-settori-${g.id}`}>
        {g.n_iscritti}/{g.max_iscritti} iscritti{g.settori_preview ? ` => ${g.settori_preview}` : ""}
      </div>
    </div>
    <div className="flex gap-2">
      <Link to={`/gara/${g.id}?tab=campo`} data-testid={`gara-dettaglio-${g.id}`} className="btn btn-sm btn-outline flex-1 sm:flex-none">Dettaglio</Link>
      <Link to={`/gara/${g.id}`} data-testid={`gara-classifica-${g.id}`} className="btn btn-sm btn-primary flex-1 sm:flex-none"><Radio size={14} />Classifica Live</Link>
    </div>
  </div>
);

const Campionati = () => {
  const [list, setList] = useState([]);
  useEffect(() => { get("/campionati").then(setList); }, []);
  if (!list.length) return null;
  return (
    <section className="mt-16" data-testid="campionati-section">
      <h2 className="mb-4 text-2xl font-bold">Campionati</h2>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {list.map((c) => (
          <Link key={c.id} to={`/campionato/${c.id}`} data-testid={`campionato-link-${c.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
            <Trophy size={18} className="text-amber-500" />
            <div className="flex-1"><div className="font-semibold">{c.nome}</div><div className="text-xs text-slate-500">{c.specialita} · {c.anno} · {c.prove.length} prove</div></div>
            <span className="text-sm font-semibold text-[#0f3d56]">Classifica →</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const Documenti = () => {
  const [docs, setDocs] = useState([]);
  const [sp, setSp] = useState("");
  const [anno, setAnno] = useState("");
  useEffect(() => { get("/documenti").then(setDocs); }, []);
  const specs = [...new Set(docs.map((d) => d.specialita))];
  const anni = [...new Set(docs.map((d) => d.anno))];
  const list = docs.filter((d) => (!sp || d.specialita === sp) && (!anno || String(d.anno) === anno));
  return (
    <section className="mt-16" data-testid="documenti-section">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-2xl font-bold">Circolari e Regolamenti</h2>
        <select data-testid="doc-filter-specialita" className="fld h-10 w-auto" value={sp} onChange={(e) => setSp(e.target.value)}>
          <option value="">Tutte le specialità</option>{specs.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select data-testid="doc-filter-anno" className="fld h-10 w-auto" value={anno} onChange={(e) => setAnno(e.target.value)}>
          <option value="">Tutti gli anni</option>{anni.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {list.map((d) => (
          <a key={d.id} href={docUrl(d)} target="_blank" rel="noreferrer" data-testid={`doc-link-${d.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
            <FileText size={18} className="text-red-600" />
            <div className="flex-1"><div className="font-semibold">{d.titolo}</div><div className="text-xs text-slate-500">{d.specialita} · {d.anno}</div></div>
            <ExternalLink size={15} className="text-slate-400" />
          </a>
        ))}
        {!list.length && <p className="p-4 text-sm text-slate-500">Nessun documento.</p>}
      </div>
    </section>
  );
};

export default function Home() {
  const [gare, setGare] = useState(null);
  const [filtro, setFiltro] = useState("");
  useEffect(() => { get("/gare").then(setGare); }, []);
  const live = (gare || []).filter((g) => g.stato === "In Corso Live");
  const list = (gare || []).filter((g) => !filtro || g.stato === filtro)
    .sort((a, b) => (b.stato === "In Corso Live") - (a.stato === "In Corso Live") || a.data.localeCompare(b.data));
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="py-10 sm:py-14">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Pesca sportiva · Gare & classifiche</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl">Sorteggi, pesa e classifiche <span className="text-[#0f3d56]">in tempo reale.</span></h1>
          {live.map((g) => (
            <Link key={g.id} to={`/gara/${g.id}`} data-testid="live-banner" className="mt-8 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm transition-colors hover:border-red-400">
              <span className="live-dot" /><span className="font-semibold text-red-700">LIVE</span><span className="truncate font-medium">{g.nome}</span><span className="ml-auto font-semibold text-red-700">Classifica →</span>
            </Link>
          ))}
        </section>
        {(gare || []).some((g) => g.locandina) && (
          <section className="mb-10" data-testid="locandine-section">
            <h2 className="mb-3 text-2xl font-bold">Locandine</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {gare.filter((g) => g.locandina).map((g) => (
                <a key={g.id} href={locandinaUrl(g)} target="_blank" rel="noreferrer" data-testid={`locandina-card-${g.id}`} className="w-40 shrink-0 sm:w-48">
                  <LocandinaThumb g={g} className="pointer-events-none aspect-[3/4] w-full" />
                  <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">{g.nome}</div>
                  <div className="text-xs text-slate-500">{fmtDate(g.data)}</div>
                </a>
              ))}
            </div>
          </section>
        )}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {["", ...STATI].map((s) => (
            <button key={s || "all"} data-testid={`filtro-stato-${s || "tutte"}`} onClick={() => setFiltro(s)} className={`btn btn-sm shrink-0 ${filtro === s ? "bg-slate-900 text-white" : "btn-outline"}`}>{s || "Tutte"}</button>
          ))}
        </div>
        <div className="space-y-3" data-testid="gare-list">
          {gare === null && <p className="text-sm text-slate-500">Caricamento…</p>}
          {list.map((g, i) => <GaraRow key={g.id} g={g} i={i} />)}
        </div>
        <Campionati />
        <Documenti />
      </main>
    </div>
  );
}
