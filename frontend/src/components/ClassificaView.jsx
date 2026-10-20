import { Crown, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, downloadCSV } from "@/lib/constants";

const Pos = ({ n, first }) => (
  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md num text-sm font-bold ${first ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
    {first ? <Crown size={16} /> : n}
  </div>
);

const Row = ({ first, n, title, sub, right, rightSub, badge, testid }) => (
  <li className={`flex items-center gap-3 px-3 py-2.5 ${first ? "bg-emerald-50" : ""}`} data-testid={testid}>
    <Pos n={n} first={first} />
    {badge}
    <div className="min-w-0 flex-1">
      <div className="truncate font-semibold">{title}</div>
      <div className="truncate text-xs text-slate-500">{sub}</div>
    </div>
    <div className="shrink-0 text-right">
      <div className="num text-base font-bold">{right}</div>
      <div className="text-[11px] text-slate-500">{rightSub}</div>
    </div>
  </li>
);

const Pic = ({ r }) => (
  <span className="num w-9 shrink-0 text-center text-lg font-bold text-[#0f3d56]" style={r.colore ? { borderBottom: `3px solid ${r.colore}` } : undefined}>{r.picchetto}</span>
);

const SettoreList = ({ s }) => (
  <div className="card overflow-hidden" data-testid={`classifica-settore-${s.lettera}`}>
    <div className={`flex items-center justify-between px-3 py-2 ${s.tecnico ? "bg-yellow-300 text-yellow-950" : "bg-slate-50"}`}>
      <span className="font-display text-sm font-bold">SETTORE {s.lettera}{s.tecnico && " TECNICO"}</span>
      <span className="text-xs">{s.rows.length} concorrenti</span>
    </div>
    <ul className="divide-y divide-slate-100">
      {s.rows.map((r) => (
        <Row key={r.id} testid={`cls-row-${r.picchetto}`} first={r.pen === 1 && r.tot > 0} n={r.pos} badge={<Pic r={r} />} title={r.nome}
          sub={`${r.societa}${r.gruppo ? ` · ${r.gruppo}` : ""} · ${r.n_pesci} pesci${r.esterno ? " · Esterno" : ""}`}
          right={fmt(r.tot)} rightSub={`Pen ${r.pen}`} />
      ))}
    </ul>
    {s.integrati?.length > 0 && (
      <div className="border-t border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900" data-testid={`integrati-${s.lettera}`}>
        <div className="mb-1 font-bold uppercase tracking-wide">Integrati a 10 dal settore {s.integrati[0].settore}</div>
        {s.integrati.map((x) => <div key={x.picchetto} className="flex justify-between"><span>{x.settore}{x.picchetto} · {x.nome}</span><span className="num">{fmt(x.tot)} · pos {x.pos_tec}</span></div>)}
      </div>
    )}
  </div>
);

const List = ({ items, testid }) => (
  <ul className="card divide-y divide-slate-100 overflow-hidden" data-testid={testid}>
    {items.map((it, i) => <Row key={i} first={i === 0 && it.ok} n={i + 1} {...it} />)}
  </ul>
);

export const ClassificaView = ({ data, gara, exportable }) => {
  if (!data) return null;
  if (!data.individui.length) return <p className="text-sm text-slate-500" data-testid="classifica-empty">Sorteggio non ancora effettuato.</p>;
  const exportCSV = () => downloadCSV(`classifica_${gara.nome.replace(/\s+/g, "_")}.csv`, [
    ["Pos", "Settore", "Picchetto", "Nome", "Società", "Squadra", "N. Pesci", "Totale", "Penalità", "Esterno"],
    ...data.assoluta.map((r, i) => [i + 1, r.settore, r.picchetto, r.nome, r.societa, r.gruppo, r.n_pesci, r.tot, r.pen, r.esterno ? "SI" : ""]),
  ]);
  return (
    <Tabs defaultValue="settori" className="w-full">
      <div className="flex items-end gap-2">
        <TabsList className="tabs-list !bg-transparent flex-1">
          <TabsTrigger value="settori" className="tab-t data-[state=active]:!bg-transparent" data-testid="cls-tab-settori">Settori</TabsTrigger>
          {data.gruppi.length > 0 && <TabsTrigger value="gruppi" className="tab-t data-[state=active]:!bg-transparent" data-testid="cls-tab-gruppi">Squadre/Box/Coppie</TabsTrigger>}
          <TabsTrigger value="societa" className="tab-t data-[state=active]:!bg-transparent" data-testid="cls-tab-societa">Società</TabsTrigger>
          <TabsTrigger value="assoluta" className="tab-t data-[state=active]:!bg-transparent" data-testid="cls-tab-assoluta">Assoluta</TabsTrigger>
        </TabsList>
        {exportable && <button data-testid="export-classifica-csv" onClick={exportCSV} className="btn btn-sm btn-outline mb-1"><Download size={14} />CSV</button>}
      </div>
      <TabsContent value="settori" className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.settori.map((s) => <SettoreList key={s.lettera} s={s} />)}
      </TabsContent>
      <TabsContent value="gruppi" className="mt-4">
        <List testid="classifica-gruppi" items={data.gruppi.map((g) => ({ ok: g.tot > 0, title: g.gruppo, sub: `${g.societa} · ${g.membri.map((m) => `${m.nome} (${m.settore}${m.picchetto} · pen ${m.pen})`).join(", ")}`, right: `Pen ${g.pen}`, rightSub: fmt(g.tot) }))} />
      </TabsContent>
      <TabsContent value="societa" className="mt-4">
        <List testid="classifica-societa" items={data.societa.map((s) => ({ ok: s.tot > 0, title: s.societa, sub: s.migliori.join(", "), right: `Pen ${s.pen}`, rightSub: fmt(s.tot) }))} />
      </TabsContent>
      <TabsContent value="assoluta" className="mt-4">
        <List testid="classifica-assoluta" items={data.assoluta.map((r) => ({ ok: r.tot > 0, badge: <span className="num w-10 shrink-0 text-center text-sm font-bold text-[#0f3d56]">{r.settore}{r.picchetto}</span>, title: r.nome, sub: `${r.societa} · ${r.n_pesci} pesci`, right: fmt(r.tot), rightSub: `Pen ${r.pen}` }))} />
      </TabsContent>
    </Tabs>
  );
};
