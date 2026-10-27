import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { API } from "@/src/api";

export const SPECIALITA = [
  "Pesca al Colpo", "Fiume", "Feeder", "Feeder Method", "Trota Lago", "Trota Torrente", "Trout Area", "Surf Casting",
  "Canna Riva", "Canna Natante", "Bolentino", "Carp Fishing", "Bass Belly", "Bass Natante", "Kayak", "Predatori Natante",
  "Mosca", "Lancio Tecnico", "Street", "Storione",
];
export const TIPI = ["Individuale", "Squadre 4", "Box 4", "Coppie 2", "Società"];
export const STATI = ["Iscrizioni Aperte", "Sorteggiata", "In Corso Live", "Conclusa"];
export const opts = (list: (string | number)[]) => list.map((v) => ({ value: v, label: String(v) }));

export function settoriLabel(n: number, zone = 1) {
  if (!n) return "";
  const nz = Math.max(1, Math.min(Number(zone) || 1, n));
  const parts: string[] = [];
  for (let z = 0; z < nz; z++) {
    const m = Math.floor(n / nz) + (z < n % nz ? 1 : 0);
    const full = Math.floor(m / 10), r = m % 10;
    const t = [full ? `${full} da 10` : "", r ? `TECNICO ${r}` : ""].filter(Boolean).join(" + ");
    parts.push(nz > 1 ? `Z${z + 1}: ${t}` : t);
  }
  return parts.join(" | ");
}

export const CM_START = 7;
export function puntiPreview(sp: any, cm: any, gara: any = {}) {
  if (!sp?.punti || cm === "" || cm == null) return null;
  const i = Math.floor(Number(cm)) - CM_START;
  const tab = i < 0 ? 0 : sp.punti[Math.min(i, sp.punti.length - 1)];
  if (tab === 0) return { p: Number(gara.preda_tecnica || 0), sotto: true, tab: 0, bonus: 0 };
  return { p: tab + Number(gara.bonus_pesce || 0), tab, bonus: Number(gara.bonus_pesce || 0), sotto: false };
}

export const docUrl = (d: any) => (d.storage_path ? `${API}/documenti/${d.id}/file` : d.url);
export const fileUrl = (g: any, kind: string) => (g?.[kind] ? `${API}/gare/${g.id}/file/${kind}?v=${g[kind].v}` : null);

export const fmt = (v: any) => {
  const n = Math.round(Number(v || 0) * 100) / 100;
  const [i, d] = String(n).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? `,${d}` : "");
};
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (d: string) => {
  const x = new Date(d);
  return isNaN(x.getTime()) ? d : `${pad(x.getDate())} ${MESI[x.getMonth()]} ${x.getFullYear()}`;
};
export const fmtTime = (d: string) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };

export async function openUrl(url?: string | null) {
  if (!url) return;
  if (Platform.OS === "android" && /\.pdf|\/file/.test(url)) return Linking.openURL(url);
  return WebBrowser.openBrowserAsync(url);
}

export async function shareCSV(name: string, rows: any[][]) {
  const esc = (v: any) => { const s = v == null ? "" : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\n");
  if (Platform.OS === "web") {
    const doc: any = (globalThis as any).document;
    const a = doc.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    a.click();
    return;
  }
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(csv);
  await Sharing.shareAsync(f.uri, { mimeType: "text/csv", dialogTitle: name });
}
