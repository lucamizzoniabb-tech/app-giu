import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";
import { SPECIALITA, docUrl } from "@/lib/constants";

const EMPTY = { titolo: "", anno: new Date().getFullYear(), specialita: "Surf Casting", url: "" };

export const AdminDocs = () => {
  const [docs, setDocs] = useState([]);
  const [f, setF] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => get("/documenti").then(setDocs);
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (file && !f.id) {
        const fd = new FormData();
        fd.append("file", file); fd.append("titolo", f.titolo); fd.append("anno", f.anno); fd.append("specialita", f.specialita);
        await api.post("/documenti/upload", fd);
      } else {
        const body = { ...f, anno: Number(f.anno) };
        f.id ? await api.put(`/documenti/${f.id}`, body) : await api.post("/documenti", body);
      }
      toast.success("Documento salvato"); setF(null); setFile(null); load();
    } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
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
          {!f.id && (
            <div className="sm:col-span-2"><span className="lbl">File PDF</span>
              <input data-testid="doc-form-file" type="file" accept="application/pdf,.pdf" className="fld pt-2 text-sm" onChange={(e) => setFile(e.target.files[0] || null)} /></div>
          )}
          {!f.storage_path && (
            <div className={f.id ? "sm:col-span-3" : "sm:col-span-2"}><span className="lbl">oppure link esterno</span>
              <input data-testid="doc-form-url" required={!file} disabled={!!file} type="url" className="fld" value={f.url} onChange={set("url")} /></div>
          )}
          <div className="flex items-end gap-2 sm:col-span-4"><button data-testid="doc-form-save" disabled={busy} className="btn btn-primary"><Upload size={15} />{busy ? "Caricamento…" : "Salva"}</button><button type="button" onClick={() => { setF(null); setFile(null); }} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      <ul className="card divide-y divide-slate-100">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
            <FileText size={18} className={d.storage_path ? "text-red-600" : "text-slate-400"} />
            <a href={docUrl(d)} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <div className="truncate font-semibold hover:underline">{d.titolo}</div>
              <div className="text-xs text-slate-500">{d.specialita} · {d.anno} · {d.storage_path ? "PDF caricato" : "link esterno"}</div>
            </a>
            <button data-testid={`edit-doc-${d.id}`} onClick={() => setF(d)} className="btn btn-sm btn-ghost" aria-label="Modifica"><Pencil size={14} /></button>
            <button data-testid={`del-doc-${d.id}`} onClick={async () => { if (window.confirm("Eliminare?")) { await api.delete(`/documenti/${d.id}`); load(); } }} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
};
