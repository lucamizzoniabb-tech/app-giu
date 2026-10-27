import React, { useState } from "react";
import { View } from "react-native";
import { colors, spacing } from "@/src/theme";
import { Header, Pad, Screen, Segmented } from "@/src/ui";
import { Guard } from "@/src/auth";
import { AdminDocs, AdminGare, AdminSpecie, AdminUtenti } from "@/src/components/admin";
import { AtletiManager, CampionatiManager } from "@/src/components/managers";
import { UserActions } from "@/src/components/UserActions";

const TABS: [string, string][] = [["gare", "Gare"], ["atleti", "Atleti"], ["campionati", "Campionati"], ["utenti", "Utenti"], ["documenti", "Documenti"], ["specie", "Specie"]];

export default function Admin() {
  const [tab, setTab] = useState("gare");
  return (
    <Guard roles={["ADMIN"]}>
      <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
        <Header back title="Pannello Admin" right={<UserActions hidePanel />} />
        <Segmented prefix="admin-tab" value={tab} onChange={setTab} items={TABS} />
        <Screen>
          <Pad style={{ paddingTop: spacing.lg }}>
            {tab === "gare" && <AdminGare />}
            {tab === "atleti" && <AtletiManager />}
            {tab === "campionati" && <CampionatiManager />}
            {tab === "utenti" && <AdminUtenti />}
            {tab === "documenti" && <AdminDocs />}
            {tab === "specie" && <AdminSpecie />}
          </Pad>
        </Screen>
      </View>
    </Guard>
  );
}
