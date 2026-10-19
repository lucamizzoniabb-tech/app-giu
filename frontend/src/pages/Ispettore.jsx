import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chat } from "@/components/Chat";
import { GaraTimer } from "@/components/GaraTimer";
import { ListaPrede } from "@/components/ListaPrede";
import { ClassificaView } from "@/components/ClassificaView";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, get, usePoll } from "@/lib/api";
import { MISURA_STATO, puntiPreview, fmtTime } from "@/lib/constants";
import { Card } from "@/components/PesaLive";

const LiveCls = ({ garaId, render }) => {
  const { data } = usePoll(() => get(`/gare/${garaId}/classifica`), 3000, garaId);
  return data ? render(data) : <p className="text-sm text-slate-500">Caricamento…</p>;
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
  const rows = iscritti.map((i) => {
    const cs = catture.filter((c) => c.iscritto_id === i.id).map((c) => {
      const pv = surf ? puntiPreview(specie.find((x) => x.name === c.specie), c.cm, g) : null;
      return { ...c, punti: surf ? pv?.p ?? 0 : Number(c.peso || 0), dettaglio: pv ? { sotto: pv.sotto, tabella: pv.tab, bonus: pv.bonus } : null };
    });
    const ok = cs.filter((c) => c.stato === "APPROVATA");
    return { id: i.id, picchetto: i.picchetto, nome: `${i.nome} ${i.cognome}`, settore: i.settore, societa: i.societa, gruppo: i.gruppo, colore: i.colore,
      catture: cs, n_pesci: ok.length, tot: ok.reduce((t, c) => t + c.punti, 0) };
  });
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
            <TabsTrigger value="classifica" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-classifica">Classifica</TabsTrigger>
            <TabsTrigger value="prede" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-prede">Prede</TabsTrigger>
            <TabsTrigger value="chat" className="tab-t data-[state=active]:!bg-transparent" data-testid="isp-tab-chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="misure" className="mt-4 grid gap-3">
            {rows.map((r) => <Card key={r.id} r={r} gara={g} specie={specie} surf={surf} locked={g.stato === "Conclusa"} onChange={reload} isp />)}
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
          <TabsContent value="classifica" className="mt-4"><LiveCls garaId={g.id} render={(d) => <ClassificaView data={d.classifica} gara={d.gara} />} /></TabsContent>
          <TabsContent value="prede" className="mt-4"><LiveCls garaId={g.id} render={(d) => <ListaPrede classifica={d.classifica} />} /></TabsContent>
          <TabsContent value="chat" className="mt-4"><Chat garaId={g.id} messaggi={messaggi} me={user.username} onSent={reload} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
