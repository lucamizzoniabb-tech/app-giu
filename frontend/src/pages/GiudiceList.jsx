import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar, StatoChip } from "@/components/TopBar";
import { get } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

export default function GiudiceList() {
  const [gare, setGare] = useState(null);
  useEffect(() => { get("/giudice/gare").then(setGare); }, []);
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-extrabold">Le mie gare</h1>
        <div className="space-y-3">
          {gare?.map((g) => (
            <Link key={g.id} to={`/giudice/${g.id}`} data-testid={`giudice-gara-${g.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-slate-500">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex gap-1.5"><StatoChip stato={g.stato} /><span className="chip border-slate-200 text-slate-500">{g.specialita}</span></div>
                <div className="truncate font-bold">{g.nome}</div>
                <div className="text-sm text-slate-500">{fmtDate(g.data)} · {g.luogo}</div>
              </div>
              <span className="num text-sm">{g.n_iscritti}</span>
            </Link>
          ))}
          {gare && !gare.length && <p className="text-sm text-slate-500" data-testid="no-gare">Nessuna gara assegnata.</p>}
        </div>
      </main>
    </div>
  );
}
