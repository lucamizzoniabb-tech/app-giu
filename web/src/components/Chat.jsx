import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { fmtTime } from "@/lib/constants";

export const Chat = ({ garaId, messaggi, me, destinatari, onSent }) => {
  const [testo, setTesto] = useState("");
  const [a, setA] = useState("ALL");
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messaggi?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!testo.trim()) return;
    try {
      await api.post(`/gare/${garaId}/messaggi`, { testo, a });
      setTesto("");
      onSent?.();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const dest = (m) => (m.a === "ALL" ? "Tutti" : m.a === "GIUDICE" ? "Giudice" : m.a);

  return (
    <div className="card flex h-[60vh] min-h-[360px] flex-col" data-testid="chat-panel">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {(messaggi || []).map((m) => {
          const mine = m.da === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-[#0f3d56] text-white" : "bg-slate-100"}`} data-testid="chat-message">
                <div className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-white/60" : "text-slate-500"}`}>
                  {m.da_nome}{m.settore ? ` · ${m.settore}` : ""} → {dest(m)} · {fmtTime(m.created_at)}
                </div>
                {m.testo}
              </div>
            </div>
          );
        })}
        {!messaggi?.length && <p className="text-center text-sm text-slate-400">Nessun messaggio</p>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-2">
        {destinatari && (
          <select data-testid="chat-recipient-select" className="fld w-32 shrink-0" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="ALL">Tutti</option>
            {destinatari.map((d) => <option key={d.username} value={d.username}>{d.username} ({d.settore})</option>)}
          </select>
        )}
        <input data-testid="chat-input" className="fld" placeholder="Messaggio" value={testo} onChange={(e) => setTesto(e.target.value)} />
        <button data-testid="chat-send-btn" className="btn btn-primary shrink-0" aria-label="Invia"><Send size={16} /></button>
      </form>
    </div>
  );
};
