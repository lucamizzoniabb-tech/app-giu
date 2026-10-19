import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { SPECIALITA } from "@/lib/constants";

const EMPTY = { titolo: "", anno: new Date().getFullYear(), specialita: "Surf Casting", url: "" };

export const AdminDocs = () => {
  const [docs, setDocs] = useState([]);
  const [f, setF] = useState(null);
  const load = () => get("/documenti").then(setDocs);
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...f, anno: Number(f.anno) };
      f.id ? await api.put(`/documenti/${f.id}`, body) : await api.post("/documenti", body);
      setF(null); load();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      {!f && <button data-testid="nuovo-doc-btn" onClick={() => setF(EMPTY)} className="btn btn-primary"><Plus size={16} />Nuovo documento</button>}
      {f && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-4" data-testid="doc-form">
          <div className="sm:col-span-2"><span className="lbl">Titolo</span><input data-testid="doc-form-titolo" required className="fld" value={f.titolo} onChange={set("titolo")} /></div>
          <div><span className="lbl">Anno</span><input data-testid="doc-form-anno" type="number" inputMode="numeric" className="fld" value={f.anno} onChange={set("anno")} /></div>
          <div><span className="lbl">Specialità</span><select data-testid="doc-form-specialita" className="fld" value={f.specialita} onChange={set("specialita")}>{["Generale", ...SPECIALITA].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="sm:col-span-3"><span className="lbl">URL PDF</span><input data-testid="doc-form-url" required type="url" className="fld" value={f.url} onChange={set("url")} /></div>
          <div className="flex items-end gap-2"><button data-testid="doc-form-save" className="btn btn-primary flex-1">Salva</button><button type="button" onClick={() => setF(null)} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Titolo</th><th>Anno</th><th>Specialità</th><th /></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><a href={d.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{d.titolo}</a></td><td className="num">{d.anno}</td><td>{d.specialita}</td>
                <td className="whitespace-nowrap text-right">
                  <button data-testid={`edit-doc-${d.id}`} onClick={() => setF(d)} className="btn btn-sm btn-ghost" aria-label="Modifica"><Pencil size={14} /></button>
                  <button data-testid={`del-doc-${d.id}`} onClick={async () => { if (window.confirm("Eliminare?")) { await api.delete(`/documenti/${d.id}`); load(); } }} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
