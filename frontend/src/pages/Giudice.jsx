import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Lock, Bell } from "lucide-react";
import { toast } from "sonner";
import { TopBar, StatoChip } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IscrittiPanel } from "@/components/IscrittiPanel";
import { CampoGara } from "@/components/CampoGara";
import { PesaLive } from "@/components/PesaLive";
import { Validazione } from "@/components/Validazione";
import { ClassificaView } from "@/components/ClassificaView";
import { Chat } from "@/components/Chat";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, get, usePoll } from "@/lib/api";
import { SPECIALITA, TIPI, fmtDate } from "@/lib/constants";

export default function Giudice() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, reload } = usePoll(() => get(`/gare/${id}/live`), 2500, id);
  const [specie, setSpecie] = useState([]);
  const [tab, setTab] = useState("iscritti");
  const seen = useRef(null);
  const msgSeen = useRef(null);
  useEffect(() => { get("/specie").then(setSpecie); }, []);

  useEffect(() => {
    if (!data) return;
    const pend = data.catture.filter((c) => c.stato === "IN_ATTESA").map((c) => c.id);
    if (seen.current) {
      const nuove = pend.filter((p) => !seen.current.has(p)).length;
      if (nuove) toast.warning(`${nuove} nuova misura da validare`, { action: { label: "Vedi", onClick: () => setTab("validazione") } });
    }
    seen.current = new Set(pend);
    const lastMsg = data.messaggi.at(-1);
    if (msgSeen.current && lastMsg && lastMsg.id !== msgSeen.current && lastMsg.da !== user.username) toast.message(`${lastMsg.da_nome}: ${lastMsg.testo}`);
    msgSeen.current = lastMsg?.id || "none";
  }, [data, user.username]);

  if (error && !data) return <><TopBar /><p className="p-10 text-sm text-red-600">{errMsg(error)}</p></>;
  if (!data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Caricamento…</p></>;
  const { gara: g, classifica, catture, messaggi, ispettori } = data;
  const pending = catture.filter((c) => c.stato === "IN_ATTESA").length;
  const locked = g.stato === "Conclusa";
  const patch = async (body) => { try { await api.patch(`/gare/${id}`, body); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const chiudi = async () => {
    if (!window.confirm("Chiudere la gara? Le misure verranno bloccate e la classifica diventerà definitiva.")) return;
    try { await api.post(`/gare/${id}/chiudi`); toast.success("Gara chiusa"); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link to="/giudice" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" data-testid="back-to-gare"><ArrowLeft size={14} />Gare</Link>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <StatoChip stato={g.stato} testid="giudice-gara-stato" />
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl" data-testid="giudice-gara-nome">{g.nome}</h1>
            <div className="text-sm text-slate-500">{fmtDate(g.data)} · {g.luogo}</div>
          </div>
          {!locked && <button data-testid="chiudi-gara-btn" onClick={chiudi} className="btn btn-outline"><Lock size={15} />Chiudi gara</button>}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div><span className="lbl">Specialità</span>
            <select data-testid="specialita-select" disabled={locked} className="fld w-48" value={g.specialita} onChange={(e) => patch({ specialita: e.target.value })}>{SPECIALITA.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><span className="lbl">Tipo gara</span>
            <select data-testid="tipo-select" disabled={locked} className="fld w-40" value={g.tipo} onChange={(e) => patch({ tipo: e.target.value })}>{TIPI.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="num rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold" data-testid="gara-badge">
            {g.specialita} | {g.tipo} | {g.n_iscritti} iscritti | {g.settori_label || g.settori_preview || "—"}
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="tabs-list">
            {[["iscritti", "Iscritti"], ["campo", "Campo gara"], ["pesa", "Pesa Live"], ["validazione", "Validazione"], ["classifica", "Classifica"], ["chat", "Chat"]].map(([k, t]) => (
              <TabsTrigger key={k} value={k} className="tab-t" data-testid={`giudice-tab-${k}`}>
                {t}{k === "validazione" && pending > 0 && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 text-[11px] text-white" data-testid="pending-count"><Bell size={10} />{pending}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="iscritti" className="mt-5"><IscrittiPanel gara={g} onChange={reload} /></TabsContent>
          <TabsContent value="campo" className="mt-5"><CampoGara individui={classifica.individui} settori={g.settori} /></TabsContent>
          <TabsContent value="pesa" className="mt-5"><PesaLive gara={g} classifica={classifica} specie={specie} onChange={reload} /></TabsContent>
          <TabsContent value="validazione" className="mt-5"><Validazione catture={catture} individui={classifica.individui} specie={specie} surf={classifica.surf} locked={locked} onChange={reload} /></TabsContent>
          <TabsContent value="classifica" className="mt-5"><ClassificaView data={classifica} gara={g} exportable /></TabsContent>
          <TabsContent value="chat" className="mt-5"><Chat garaId={id} messaggi={messaggi} me={user.username} destinatari={ispettori} onSent={reload} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
