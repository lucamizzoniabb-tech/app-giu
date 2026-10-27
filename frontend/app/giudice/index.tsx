import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { colors, spacing } from "@/src/theme";
import { Btn, Card, Chip, Empty, Header, Loading, Muted, Pad, Screen, StatoChip } from "@/src/ui";
import { Guard } from "@/src/auth";
import { api } from "@/src/api";
import { fmtDate } from "@/src/constants";
import { EMPTY_GARA, GaraForm } from "@/src/components/admin";
import { UserActions } from "@/src/components/UserActions";

function Lista() {
  const router = useRouter();
  const [gare, setGare] = useState<any[] | null>(null);
  const [nuova, setNuova] = useState(false);
  const load = useCallback(() => api.get("/giudice/gare").then(setGare).catch(() => setGare([])), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <Header back title="Le mie gare" right={<UserActions hidePanel />} />
      <Screen onRefresh={load}>
        <Pad style={{ paddingTop: spacing.lg }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Btn flex small variant="outline" icon="users" title="Atleti" onPress={() => router.push("/atleti")} testID="giudice-atleti-btn" />
            <Btn flex small variant="outline" icon="trophy" title="Campionati" onPress={() => router.push("/campionati")} testID="giudice-campionati-btn" />
          </View>
          {!nuova ? <Btn icon="plus" title="Nuova gara" onPress={() => setNuova(true)} testID="giudice-nuova-gara-btn" />
            : <GaraForm initial={EMPTY_GARA} onDone={(ok: boolean) => { setNuova(false); if (ok) load(); }} />}
          {gare === null && <Loading />}
          {gare?.map((g) => (
            <Pressable key={g.id} onPress={() => router.push(`/giudice/${g.id}`)} testID={`giudice-gara-${g.id}`}>
              {({ pressed }) => (
                <Card style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, opacity: pressed ? 0.85 : 1 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", gap: 4 }}><StatoChip stato={g.stato} /><Chip label={g.specialita} /></View>
                    <Text style={{ fontWeight: "800", fontSize: 15, color: colors.onSurface }} numberOfLines={1}>{g.nome}</Text>
                    <Muted>{fmtDate(g.data)} · {g.luogo}</Muted>
                  </View>
                  <Text style={{ fontWeight: "800", color: colors.onSurface }}>{g.n_iscritti}</Text>
                </Card>
              )}
            </Pressable>
          ))}
          {gare && !gare.length && <Empty testID="no-gare" text="Nessuna gara assegnata." />}
        </Pad>
      </Screen>
    </View>
  );
}

export default function GiudiceList() {
  return <Guard roles={["ADMIN", "GIUDICE"]}><Lista /></Guard>;
}
