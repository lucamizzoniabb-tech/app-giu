export const SPECIALITA = [
  "Pesca al Colpo", "Fiume", "Feeder", "Feeder Method", "Trota Lago", "Trota Torrente", "Trout Area", "Surf Casting",
  "Canna Riva", "Canna Natante", "Bolentino", "Carp Fishing", "Bass Belly", "Bass Natante", "Kayak", "Predatori Natante",
  "Mosca", "Lancio Tecnico", "Street", "Storione",
];
export const TIPI = ["Individuale", "Squadre 4", "Box 4", "Coppie 2", "Società"];
export const STATI = ["Iscrizioni Aperte", "Sorteggiata", "In Corso Live", "Conclusa"];
export const STATO_CLS = {
  "Iscrizioni Aperte": "border-sky-200 bg-sky-50 text-sky-800",
  Sorteggiata: "border-violet-200 bg-violet-50 text-violet-800",
  "In Corso Live": "border-red-200 bg-red-50 text-red-700",
  Conclusa: "border-slate-200 bg-slate-100 text-slate-600",
};
export const MISURA_STATO = {
  IN_ATTESA: { t: "In attesa", c: "border-amber-200 bg-amber-50 text-amber-800" },
  APPROVATA: { t: "Approvata", c: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  RIGETTATA: { t: "Rigettata", c: "border-red-200 bg-red-50 text-red-700" },
};

const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function settoriLabel(n) {
  if (!n) return "";
  const full = Math.floor(n / 10), r = n % 10;
  const out = [];
  for (let i = 0; i < full; i++) out.push(`${L[i]}10`);
  if (r) out.push(`${L[full]} TECNICO ${r}`);
  return out.join(" ");
}

export function puntiPreview(sp, cm) {
  if (!sp || cm === "" || cm == null) return null;
  const c = Number(cm);
  if (c < sp.min) return { p: 1, sotto: true };
  return { p: Math.round((c - sp.min + 1) * sp.coef + sp.base) + 50, sotto: false };
}

export const docUrl = (d) => (d.storage_path ? `${process.env.REACT_APP_BACKEND_URL}/api/documenti/${d.id}/file` : d.url);

export const fmt = (v) => Number(v || 0).toLocaleString("it-IT", { maximumFractionDigits: 2 });
export const fmtDate = (d) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
export const fmtTime = (d) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export function downloadCSV(name, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
}
