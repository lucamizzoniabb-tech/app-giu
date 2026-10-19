import { useEffect, useRef, useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chat } from "@/components/Chat";
import { GaraTimer } from "@/components/GaraTimer";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, get, usePoll } from "@/lib/api";
import { MISURA_STATO, puntiPreview, fmt, fmtTime } from "@/lib/constants";

const MisuraForm = ({ gara, isc, specie, surf, onSent }) => {
  const [sp, setSp] = useState("");
  const [cm, setCm] = useState("");
  const [peso, setPeso] = useState("");
  const [busy, setBusy] = useState(false);
  const spObj = specie.find((s) => s.name === sp);
  const prev = surf ? puntiPreview(spObj, cm, gara) : null;
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/gare/${gara.id}/catture`, { iscritto_id: isc.id, specie: surf ? sp : "Pesata", cm: surf ? Number(cm) : null, peso: peso !== "" ? Number(peso) : null });
      toast.success(`Misura inviata · Pic ${isc.picchetto}`);
      setCm(""); setPeso("");
      onSent();
    } catch (er) { toast.error(errMsg(er)); }
    setBusy(false);
  };
  return (
    <form onSubmit={send} className="card fade-up space-y-3 p-4" data-testid="misura-form">
      <div className="flex items-baseline gap-3"><span className="num text-4xl font-bold">{isc.picchetto}</span><span className="text-lg font-semibold">{isc.nome} {isc.cognome}</span></div>
      {surf && (
        <div><span className="lbl">Specie</span>
          <select data-testid="isp-specie-select" required className="fld h-14 text-base" value={sp} onChange={(e) => setSp(e.target.value)}>
            <option value="">Seleziona specie</option>
            {specie.map((s) => <option key={s.name} value={s.name}>{s.name} — min {s.min} cm</option>)}
          </select></div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {surf && <div><span className="lbl">Misura cm</span><input data-testid="isp-cm-input" required type="number" step="1" min="0" inputMode="numeric" className="fld num h-14 text-2xl" value={cm} onChange={(e) => setCm(e.target.value)} /></div>}
        <div className={surf ? "" : "col-span-2"}><span className="lbl">Peso g {surf && "(facolt., non conta)"}</span><input data-testid="isp-peso-input" required={!surf} type="number" step="1" min="0" inputMode="numeric" className="fld num h-14 text-2xl" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
      </div>
      {prev && (
        <div data-testid="isp-preview" className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${prev.sotto ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {prev.sotto && <AlertTriangle size={16} />}{prev.sotto ? `Sotto misura (min ${spObj.min} cm) · preda tecnica ${prev.p} punti` : `${fmt(prev.p)} punti`}
        </div>
      )}
      <button data-testid="isp-send-btn" disabled={busy || gara.stato === "Conclusa"} className="btn btn-lg btn-primary w-full"><Send size={18} />Invia misura</button>
    </form>
  );
};

const Inviti = ({ inviti, onDone }) => {
  if (!inviti?.length) return null;
  const rispondi = async (id, azione) => {
    try { await api.post(`/inviti/${id}/${azione}`); toast.success(azione === "accetta" ? "Invito accettato" : "Invito rifiutato"); onDone(); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <div className="mb-5 space-y-2" data-testid="isp-inviti">
      {inviti.map((i) => (
        <div key={i.id} className="card fade-up border-amber-300 p-4" data-testid={`isp-invito-${i.id}`}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Invito da {i.invitato_da}</div>
          <div className="mt-1 font-bold">{i.gara_nome}</div>
          <div className="text-sm text-slate-600">SETTORE {i.settore}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button data-testid="isp-accetta-invito" onClick={() => rispondi(i.id, "accetta")} className="btn btn-success">Accetta</button>
            <button data-testid="isp-rifiuta-invito" onClick={() => rispondi(i.id, "rifiuta")} className="btn btn-outline">Rifiuta</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function Ispettore() {
  const { user } = useAuth();
  const { data, reload } = usePoll(() => get("/ispettore/live"), 2500);
  const [specie, setSpecie] = useState([]);
  const [sel, setSel] = useState(null);
  const prevStati = useRef(null);
  useEffect(() => { get("/specie").then(setSpecie); }, []);
  useEffect(() => {
    if (!data?.catture) return;
    const m = Object.fromEntries(data.catture.map((c) => [c.id, c.stato]));
    if (prevStati.current) data.catture.forEach((c) => {
      if (prevStati.current[c.id] === "IN_ATTESA" && c.stato !== "IN_ATTESA") (c.stato === "APPROVATA" ? toast.success : toast.error)(`Misura ${MISURA_STATO[c.stato].t.toLowerCase()}${c.motivo ? `: ${c.motivo}` : ""}`);
    });
    prevStati.current = m;
  }, [data]);

  if (!data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Caricamento…</p></>;
  if (!data.gara) return (
    <><TopBar /><main className="mx-auto max-w-2xl px-4 py-6"><Inviti inviti={data.inviti} onDone={reload} />
      {!data.inviti?.length && <p className="text-sm text-slate-500" data-testid="isp-no-gara">Nessuna gara: attendi l'invito del giudice.</p>}</main></>
  );
  const { gara: g, iscritti, catture, messaggi, settore } = data;
  const surf = g.specialita === "Surf Casting";
  const iscMap = Object.fromEntries(iscritti.map((i) => [i.id, i]));
  const selIsc = iscritti.find((i) => i.id === sel);
  const tec = g.settori?.find((s) => s.lettera === settore)?.tecnico;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-5">
        <Inviti inviti={data.inviti} onDone={reload} />
        <div className="mb-4 flex items-center gap-3">
          <div className={`num grid h-14 w-14 place-items-center rounded-lg text-2xl font-bold ${tec ? "bg-yellow-300" : "bg-slate-900 text-white"}`} data-testid="isp-settore">{settore}</div>
          <div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Settore {settore}{tec && " tecnico"}</div><div className="truncate font-bold">{g.nome}</div></div>
        </div>
        <div className="mb-4"><GaraTimer gara={g} compact /></div>
        {g.stato === "Conclusa" && <p className="mb-3 rounded-md bg-slate-100 px-3 py-2 text-sm" data-testid="isp-gara-chiusa">Gara conclusa.</p>}
        <Tabs defaultValue="misure">
          <TabsList className="tabs-list !bg-transparent">
            <TabsTrigger value="misure" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-misure">Misure</TabsTrigger>
            <TabsTrigger value="storico" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-storico">Storico ({catture.length})</TabsTrigger>
            <TabsTrigger value="chat" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="misure" className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {iscritti.map((i) => (
                <button key={i.id} data-testid={`isp-pic-${i.picchetto}`} onClick={() => setSel(i.id)} className={`rounded-lg border p-2 text-left transition-colors ${sel === i.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:border-slate-500"}`}>
                  <div className="num text-xl font-bold">{i.picchetto}</div><div className="truncate text-[11px]">{i.cognome}</div>
                </button>
              ))}
            </div>
            {selIsc && <MisuraForm key={selIsc.id} gara={g} isc={selIsc} specie={specie} surf={surf} onSent={reload} />}
          </TabsContent>
          <TabsContent value="storico" className="mt-4 space-y-2" data-testid="isp-storico">
            {catture.map((c) => (
              <div key={c.id} className="card flex items-center gap-3 p-3" data-testid={`isp-misura-${c.id}`}>
                <span className="num w-8 text-lg font-bold">{iscMap[c.iscritto_id]?.picchetto}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{surf ? `${c.specie} ${c.cm} cm` : `${c.peso} g`}</div>
                  <div className="text-xs text-slate-500">{iscMap[c.iscritto_id]?.cognome} · {fmtTime(c.created_at)} · {c.inviato_da}</div>
                  {c.motivo && <div className="text-xs text-red-600">{c.motivo}</div>}
                </div>
                <span className={`chip ${MISURA_STATO[c.stato].c}`}>{MISURA_STATO[c.stato].t}</span>
              </div>
            ))}
            {!catture.length && <p className="text-sm text-slate-500">Nessuna misura.</p>}
          </TabsContent>
          <TabsContent value="chat" className="mt-4"><Chat garaId={g.id} messaggi={messaggi} me={user.username} onSent={reload} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
