import { useRef, useState } from "react";
import { ImagePlus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, API, errMsg } from "@/lib/api";

export const locandinaUrl = (g) => (g.locandina ? `${API}/gare/${g.id}/locandina?v=${g.locandina.v}` : null);

export const LocandinaThumb = ({ g, className = "" }) => {
  const url = locandinaUrl(g);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" data-testid={`locandina-${g.id}`} className={`block shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${className}`}>
      {g.locandina.type === "application/pdf"
        ? <div className="grid h-full w-full place-items-center text-red-600"><FileText size={28} /><span className="text-[10px] font-bold">LOCANDINA</span></div>
        : <img src={url} alt={`Locandina ${g.nome}`} className="h-full w-full object-cover" loading="lazy" />}
    </a>
  );
};

export const LocandinaUpload = ({ gara, onChange }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try { await api.post(`/gare/${gara.id}/locandina`, fd); toast.success("Locandina caricata"); onChange(); } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
    ref.current.value = "";
  };
  const del = async () => { if (window.confirm("Rimuovere la locandina?")) { await api.delete(`/gare/${gara.id}/locandina`); onChange(); } };
  return (
    <div className="flex items-center gap-2" data-testid="locandina-upload">
      <LocandinaThumb g={gara} className="h-12 w-9" />
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" data-testid="locandina-file-input" onChange={(e) => upload(e.target.files[0])} />
      <button data-testid="locandina-upload-btn" disabled={busy} onClick={() => ref.current.click()} className="btn btn-outline"><ImagePlus size={15} />{busy ? "Caricamento…" : gara.locandina ? "Cambia locandina" : "Locandina"}</button>
      {gara.locandina && <button data-testid="locandina-del-btn" onClick={del} className="btn btn-sm btn-ghost text-red-600" aria-label="Rimuovi locandina"><Trash2 size={14} /></button>}
    </div>
  );
};
