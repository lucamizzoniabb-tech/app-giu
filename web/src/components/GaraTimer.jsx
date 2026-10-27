import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";

const pad = (n) => String(n).padStart(2, "0");
const hms = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const GaraTimer = ({ gara, controls, onChange, compact, isAdmin, big }) => {
  const offset = useRef(0);
  const [, tick] = useState(0);
  useEffect(() => { if (gara?.server_now) offset.current = gara.server_now - Date.now(); }, [gara?.server_now]);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(t); }, []);

  const t = gara.timer || { stato: "FERMO" };
  const durata = t.durata_ms || (gara.durata_min || 180) * 60000;
  const now = Date.now() + offset.current;
  const ref = t.stato === "PAUSA" ? t.paused_at : t.stato === "TERMINATO" ? t.stop_at : now;
  const elapsed = t.start_ms ? Math.max(0, ref - t.start_ms - (t.pausa_ms || 0)) : 0;
  const remaining = Math.max(0, durata - elapsed);
  const scaduto = (t.stato === "IN_CORSO" && remaining === 0) || t.stato === "TERMINATO";
  const label = scaduto ? "TEMPO SCADUTO" : { FERMO: "In attesa del via", IN_CORSO: "In corso", PAUSA: "In pausa" }[t.stato];
  const color = scaduto ? "bg-red-600 text-white" : t.stato === "IN_CORSO" ? "bg-emerald-600 text-white" : t.stato === "PAUSA" ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-700";

  const act = async (azione) => {
    if (["stop", "reset"].includes(azione) && !window.confirm(azione === "stop" ? "Terminare la gara (fine tempo)?" : "Azzerare il timer?")) return;
    try { await api.post(`/gare/${gara.id}/timer`, { azione }); onChange?.(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-lg px-4 ${compact ? "py-2" : "py-3"} ${color}`} data-testid="gara-timer">
      <Timer size={compact ? 18 : 22} />
      <span className={`num font-bold tabular-nums ${big ? "text-6xl" : compact ? "text-2xl" : "text-3xl sm:text-4xl"}`} data-testid="timer-display">{hms(t.stato === "FERMO" ? durata : remaining)}</span>
      <span className="text-xs font-bold uppercase tracking-wider opacity-80" data-testid="timer-stato">{label}</span>
      {controls && (
        <div className="ml-auto flex gap-2">
          {t.stato === "FERMO" && <button data-testid="timer-start-btn" onClick={() => act("start")} className="btn bg-slate-900 text-white hover:bg-black"><Play size={16} />Via</button>}
          {t.stato === "IN_CORSO" && <button data-testid="timer-pause-btn" onClick={() => act("pausa")} className="btn bg-white/90 text-slate-900"><Pause size={16} />Pausa</button>}
          {t.stato === "PAUSA" && <button data-testid="timer-resume-btn" onClick={() => act("riprendi")} className="btn bg-white/90 text-slate-900"><Play size={16} />Riprendi</button>}
          {["IN_CORSO", "PAUSA"].includes(t.stato) && <button data-testid="timer-stop-btn" onClick={() => act("stop")} className="btn bg-white/90 text-red-700"><Square size={15} />Stop</button>}
          {isAdmin && t.stato !== "FERMO" && <button data-testid="timer-reset-btn" onClick={() => act("reset")} className="btn btn-sm bg-white/60 text-slate-900" aria-label="Reset"><RotateCcw size={14} /></button>}
        </div>
      )}
    </div>
  );
};
