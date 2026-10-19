import { Crown, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, downloadCSV } from "@/lib/constants";

const SettoreTable = ({ s }) => (
  <div className="card overflow-hidden" data-testid={`classifica-settore-${s.lettera}`}>
    <div className={`flex items-center justify-between px-3 py-2 ${s.tecnico ? "bg-yellow-300 text-yellow-950" : "bg-slate-50"}`}>
      <span className="font-display text-sm font-bold">SETTORE {s.lettera}{s.tecnico && " TECNICO"}</span>
      <span className="text-xs">{s.rows.length} concorrenti</span>
    </div>
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Pos</th><th>Pic</th><th>Nome</th><th className="hidden sm:table-cell">Società</th><th className="hidden md:table-cell">Squadra</th><th>N.</th><th>Tot</th><th>Pen</th><th>Est</th></tr></thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.id} className={r.pen === 1 && r.tot > 0 ? "bg-emerald-50" : ""}>
              <td className="num font-bold">{r.pen === 1 && r.tot > 0 ? <Crown size={16} className="text-emerald-600" /> : r.pos}</td>
              <td className="num">{r.picchetto}</td>
              <td className="font-medium">{r.nome}<div className="text-xs text-slate-500 sm:hidden">{r.societa}</div></td>
              <td className="hidden sm:table-cell text-slate-600">{r.societa}</td>
              <td className="hidden md:table-cell text-slate-600">{r.gruppo || "—"}</td>
              <td className="num">{r.n_pesci}</td>
              <td className="num font-bold">{fmt(r.tot)}</td>
              <td className="num">{r.pen}</td>
              <td>{r.esterno ? <span className="chip border-slate-300 text-slate-600">E</span> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Simple = ({ head, rows, testid }) => (
  <div className="card overflow-x-auto" data-testid={testid}>
    <table className="tbl">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className={i === 0 ? "bg-emerald-50" : ""}>{r.map((c, j) => <td key={j} className={j === 0 ? "num font-bold" : ""}>{i === 0 && j === 0 ? <Crown size={16} className="text-emerald-600" /> : c}</td>)}</tr>)}</tbody>
    </table>
  </div>
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
        <TabsList className="tabs-list flex-1">
          <TabsTrigger value="settori" className="tab-t" data-testid="cls-tab-settori">Settori</TabsTrigger>
          {data.gruppi.length > 0 && <TabsTrigger value="gruppi" className="tab-t" data-testid="cls-tab-gruppi">Squadre/Box/Coppie</TabsTrigger>}
          <TabsTrigger value="societa" className="tab-t" data-testid="cls-tab-societa">Società</TabsTrigger>
          <TabsTrigger value="assoluta" className="tab-t" data-testid="cls-tab-assoluta">Assoluta</TabsTrigger>
        </TabsList>
        {exportable && <button data-testid="export-classifica-csv" onClick={exportCSV} className="btn btn-sm btn-outline mb-1"><Download size={14} />CSV</button>}
      </div>
      <TabsContent value="settori" className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.settori.map((s) => <SettoreTable key={s.lettera} s={s} />)}
      </TabsContent>
      <TabsContent value="gruppi" className="mt-4">
        <Simple testid="classifica-gruppi" head={["Pos", "Gruppo", "Società", "Componenti", "Pen", "Tot"]}
          rows={data.gruppi.map((g, i) => [i + 1, g.gruppo, g.societa, g.membri.map((m) => `${m.nome} (${m.settore}${m.picchetto}·${m.pen})`).join(", "), g.pen, fmt(g.tot)])} />
      </TabsContent>
      <TabsContent value="societa" className="mt-4">
        <Simple testid="classifica-societa" head={["Pos", "Società", "Migliori", "Pen", "Tot"]}
          rows={data.societa.map((s, i) => [i + 1, s.societa, s.migliori.join(", "), s.pen, fmt(s.tot)])} />
      </TabsContent>
      <TabsContent value="assoluta" className="mt-4">
        <Simple testid="classifica-assoluta" head={["Pos", "Set", "Pic", "Nome", "Società", "N.", "Tot", "Pen"]}
          rows={data.assoluta.map((r, i) => [i + 1, r.settore, r.picchetto, r.nome, r.societa, r.n_pesci, fmt(r.tot), r.pen])} />
      </TabsContent>
    </Tabs>
  );
};
