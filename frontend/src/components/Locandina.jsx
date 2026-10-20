import { useRef, useState } from "react";
import { ImagePlus, Trash2, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { api, API, errMsg } from "@/lib/api";

export const fileUrl = (g, kind) => (g[kind] ? `${API}/gare/${g.id}/file/${kind}?v=${g[kind].v}` : null);
export const locandinaUrl = (g) => fileUrl(g, "locandina");

export const uploadGaraFile = async (gid, kind, file) => {
  const fd = new FormData();
  fd.append("file", file);
  await api.post(`/gare/${gid}/file/${kind}`, fd);
};

export const LocandinaThumb = ({ g, className = "" }) => {
  const url = locandinaUrl(g);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" data-testid={`locandina-${g.id}`} className={`block shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${className}`}>
      {g.locandina.type === "application/pdf"
        ? <div className="grid h-full w-full place-items-center text-red-600"><FileText size={24} /></div>
        : <img src={url} alt={`Locandina ${g.nome}`} className="h-full w-full object-cover" loading="lazy" />}
    </a>
  );
};

export const RegolamentoLink = ({ g }) => {
  const url = fileUrl(g, "regolamento");
  if (!url) return null;
  return <a href={url} target="_blank" rel="noreferrer" data-testid={`regolamento-${g.id}`} className="btn btn-sm btn-ghost flex-1 sm:flex-none"><BookOpen size={14} />Regolamento</a>;
};

const Upload = ({ gara, kind, label, accept, onChange }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const up = async (file) => {
    if (!file) return;
    setBusy(true);
    try { await uploadGaraFile(gara.id, kind, file); toast.success(`${label} caricato`); onChange(); } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
    ref.current.value = "";
  };
  const del = async () => { if (window.confirm(`Rimuovere ${label.toLowerCase()}?`)) { await api.delete(`/gare/${gara.id}/file/${kind}`); onChange(); } };
  return (
    <div className="flex items-center gap-1">
      <input ref={ref} type="file" accept={accept} className="hidden" data-testid={`${kind}-file-input`} onChange={(e) => up(e.target.files[0])} />
      <button data-testid={`${kind}-upload-btn`} disabled={busy} onClick={() => ref.current.click()} className="btn btn-outline">
        {kind === "locandina" ? <ImagePlus size={15} /> : <BookOpen size={15} />}{busy ? "…" : gara[kind] ? `Cambia ${label.toLowerCase()}` : label}
      </button>
      {gara[kind] && <button data-testid={`${kind}-del-btn`} onClick={del} className="btn btn-sm btn-ghost text-red-600" aria-label={`Rimuovi ${label}`}><Trash2 size={14} /></button>}
    </div>
  );
};

export const LocandinaUpload = ({ gara, onChange }) => (
  <>
    <Upload gara={gara} kind="locandina" label="Immagine" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onChange} />
    <Upload gara={gara} kind="regolamento" label="Regolamento" accept="application/pdf" onChange={onChange} />
  </>
);

export const FileFields = ({ files, setFiles }) => (
  <>
    <div><span className="lbl">Immagine / locandina</span><input data-testid="crea-gara-immagine" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="fld pt-2 text-sm" onChange={(e) => setFiles({ ...files, locandina: e.target.files[0] || null })} /></div>
    <div><span className="lbl">Regolamento (PDF)</span><input data-testid="crea-gara-regolamento" type="file" accept="application/pdf" className="fld pt-2 text-sm" onChange={(e) => setFiles({ ...files, regolamento: e.target.files[0] || null })} /></div>
  </>
);

export const uploadFiles = async (gid, files) => {
  for (const k of ["locandina", "regolamento"]) if (files[k]) await uploadGaraFile(gid, k, files[k]);
};
