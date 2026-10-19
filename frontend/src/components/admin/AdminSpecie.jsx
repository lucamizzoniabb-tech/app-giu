import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";

const Row = ({ s }) => {
  const [v, setV] = useState({ min: s.min, coef: s.coef, base: s.base });
  const save = async () => {
    try { await api.put(`/specie/${encodeURIComponent(s.name)}`, { min: Number(v.min), coef: Number(v.coef), base: Number(v.base) }); toast.success(`${s.name} salvata`); } catch (er) { toast.error(errMsg(er)); }
  };
  const I = (k) => <input data-testid={`specie-${k}-${s.name}`} type="number" step="0.5" inputMode="decimal" className="fld h-9 w-20" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />;
  return (
    <tr><td className="font-medium">{s.name}</td><td>{I("min")}</td><td>{I("coef")}</td><td>{I("base")}</td>
      <td><button data-testid={`specie-save-${s.name}`} onClick={save} className="btn btn-sm btn-ghost" aria-label="Salva"><Save size={14} /></button></td></tr>
  );
};

export const AdminSpecie = () => {
  const [list, setList] = useState([]);
  useEffect(() => { get("/specie").then(setList); }, []);
  return (
    <div className="card overflow-x-auto">
      <table className="tbl" data-testid="admin-specie-table">
        <thead><tr><th>Specie</th><th>Misura min cm</th><th>Coefficiente</th><th>Base</th><th /></tr></thead>
        <tbody>{list.map((s) => <Row key={s.name} s={s} />)}</tbody>
      </table>
    </div>
  );
};
