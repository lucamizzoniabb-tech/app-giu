import { TopBar } from "@/components/TopBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminGare } from "@/components/admin/AdminGare";
import { AdminUtenti } from "@/components/admin/AdminUtenti";
import { AdminDocs } from "@/components/admin/AdminDocs";
import { AdminSpecie } from "@/components/admin/AdminSpecie";
import { CampionatiManager } from "@/components/CampionatiManager";

export default function Admin() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">Pannello Admin</h1>
        <Tabs defaultValue="gare" className="mt-6">
          <TabsList className="tabs-list !bg-transparent">
            {[["gare", "Gare"], ["campionati", "Campionati"], ["utenti", "Utenti"], ["documenti", "Documenti"], ["specie", "Specie"]].map(([k, t]) => (
              <TabsTrigger key={k} value={k} className="tab-t data-[state=active]:!bg-transparent" data-testid={`admin-tab-${k}`}>{t}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="gare" className="mt-5"><AdminGare /></TabsContent>
          <TabsContent value="campionati" className="mt-5"><CampionatiManager /></TabsContent>
          <TabsContent value="utenti" className="mt-5"><AdminUtenti /></TabsContent>
          <TabsContent value="documenti" className="mt-5"><AdminDocs /></TabsContent>
          <TabsContent value="specie" className="mt-5"><AdminSpecie /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
