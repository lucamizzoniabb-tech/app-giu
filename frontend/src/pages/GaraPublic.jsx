import { useParams, useSearchParams } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { TopBar, StatoChip } from "@/components/TopBar";
import { ClassificaView } from "@/components/ClassificaView";
import { CampoGara } from "@/components/CampoGara";
import { GaraTimer } from "@/components/GaraTimer";
import { ListaPrede } from "@/components/ListaPrede";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { get, usePoll } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

export default function GaraPublic() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { data, error } = usePoll(() => get(`/gare/${id}/classifica`), 3000, id);
  if (error && !data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Gara non trovata.</p></>;
  if (!data) return <><TopBar /><p className="p-10 text-sm text-slate-500">Caricamento…</p></>;
  const { gara: g, classifica } = data;
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="chip border-[#0f3d56]/20 bg-[#0f3d56]/5 text-[#0f3d56]">{g.specialita}</span>
          <StatoChip stato={g.stato} testid="public-gara-stato" />
          <span className="chip border-slate-200 text-slate-500">{g.tipo}</span>
          {g.stato === "Conclusa" && <span className="chip border-emerald-300 bg-emerald-50 text-emerald-800" data-testid="classifica-definitiva">Classifica definitiva</span>}
        </div>
        <h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="public-gara-nome">{g.nome}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={14} />{fmtDate(g.data)}</span>
          <span className="flex items-center gap-1"><MapPin size={14} />{g.luogo}</span>
          <span className="num text-slate-700">{g.n_iscritti}/{g.max_iscritti} iscritti{g.settori_preview ? ` => ${g.settori_preview}` : ""}</span>
        </div>
        {(g.timer && g.timer.stato !== "FERMO") || g.stato === "In Corso Live" ? <div className="mt-6"><GaraTimer gara={g} /></div> : null}
        <Tabs defaultValue={sp.get("tab") === "campo" ? "campo" : "classifica"} className="mt-8">
          <TabsList className="tabs-list !bg-transparent">
            <TabsTrigger value="classifica" className="tab-t data-[state=active]:!bg-transparent" data-testid="public-tab-classifica">Classifica Live</TabsTrigger>
            <TabsTrigger value="prede" className="tab-t data-[state=active]:!bg-transparent" data-testid="public-tab-prede">Prede</TabsTrigger>
            <TabsTrigger value="campo" className="tab-t data-[state=active]:!bg-transparent" data-testid="public-tab-campo">Campo gara</TabsTrigger>
          </TabsList>
          <TabsContent value="classifica" className="mt-5"><ClassificaView data={classifica} gara={g} exportable={g.stato === "Conclusa"} /></TabsContent>
          <TabsContent value="prede" className="mt-5"><ListaPrede classifica={classifica} /></TabsContent>
          <TabsContent value="campo" className="mt-5"><CampoGara individui={classifica.individui} settori={g.settori} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
