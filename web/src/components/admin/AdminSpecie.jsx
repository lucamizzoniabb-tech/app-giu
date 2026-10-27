import { useEffect, useState } from "react";
import { Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { CM_START } from "@/lib/constants";

const Row = ({ s }) => {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(s.punti);
  const save = async () => {
    try { await api.put(`/specie/${encodeURIComponent(s.name)}`, { punti: v.map((x) => Number(x) || 0) }); toast.success(`${s.name} salvata`); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <li data-testid={`specie-row-${s.name}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50" data-testid={`specie-toggle-${s.name}`}>
        <span className="flex-1 font-semibold">{s.name}</span>
        <span className="text-xs text-slate-500">min {s.min} cm · {CM_START + v.length - 1} cm = {v[v.length - 1]} pt</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-11">
            {v.map((p, i) => (
              <label key={i} className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-1">
                <span className="num w-6 text-[10px] text-slate-400">{CM_START + i}</span>
                <input data-testid={`specie-${s.name}-cm-${CM_START + i}`} type="number" inputMode="numeric" className="num w-full min-w-0 bg-transparent text-xs outline-none" value={p} onChange={(e) => setV(v.map((x, j) => (j === i ? e.target.value : x)))} />
              </label>
            ))}
          </div>
          <button data-testid={`specie-save-${s.name}`} onClick={save} className="btn btn-sm btn-primary mt-3"><Save size={14} />Salva</button>
        </div>
      )}
    </li>
  );
};

export const AdminSpecie = () => {
  const [list, setList] = useState([]);
  useEffect(() => { get("/specie").then(setList); }, []);
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Tabella di conversione Surf Casting: punti a pesce per lunghezza (cm {CM_START}–{CM_START + 76}).</p>
      <ul className="card divide-y divide-slate-100" data-testid="admin-specie-list">{list.map((s) => <Row key={s.name} s={s} />)}</ul>
    </div>
  );
};
