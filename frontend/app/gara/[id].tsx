import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing } from "@/src/theme";
import { Chip, Empty, Header, Icon, Loading, Muted, Pad, Screen, Segmented, StatoChip } from "@/src/ui";
import { api, usePoll } from "@/src/api";
import { fmtDate } from "@/src/constants";
import { CampoGara, CercaClassifica, ClassificaView, ListaPrede } from "@/src/components/classifica";
import { GaraTimer } from "@/src/components/GaraTimer";
import { UserActions } from "@/src/components/UserActions";

export default function GaraPublic() {
  const { id, tab: t0 } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [tab, setTab] = useState(t0 === "campo" ? "campo" : "classifica");
  const { data, error, reload } = usePoll(() => api.get(`/gare/${id}/classifica`), 3000, id);
  if (error && !data) return <View style={{ flex: 1 }}><Header back title="Gara" /><Pad><Empty text="Gara non trovata." /></Pad></View>;
  if (!data) return <View style={{ flex: 1 }}><Header back title="Gara" /><Loading /></View>;
  const { gara: g, classifica } = data;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header back title={g.nome} right={<UserActions />} />
      <Screen sticky={[1]} onRefresh={reload}>
        <Pad style={{ paddingVertical: spacing.lg }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            <Chip label={g.specialita} bg={colors.brandSoft} fg={colors.brand} />
            <StatoChip stato={g.stato} testID="public-gara-stato" />
            <Chip label={g.tipo} />
            {g.stato === "Conclusa" && <Chip label="Classifica definitiva" bg={colors.successSoft} fg={colors.successStrong} testID="classifica-definitiva" />}
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.5 }} testID="public-gara-nome">{g.nome}</Text>
          <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Icon name="calendar" size={14} color={colors.muted} /><Muted>{fmtDate(g.data)}</Muted></View>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Icon name="map-pin" size={14} color={colors.muted} /><Muted>{g.luogo}</Muted></View>
          </View>
          <Text style={{ fontSize: 12, color: colors.onSurfaceSecondary }}>{g.n_iscritti}/{g.max_iscritti} iscritti{g.settori_preview ? ` => ${g.settori_preview}` : ""}</Text>
          {(g.timer && g.timer.stato !== "FERMO") || g.stato === "In Corso Live" ? <GaraTimer gara={g} /> : null}
        </Pad>
        <Segmented prefix="public-tab" value={tab} onChange={setTab} items={[["classifica", "Classifica Live"], ["prede", "Prede"], ["campo", "Campo gara"]]} />
        <Pad style={{ paddingTop: spacing.lg }}>
          {tab === "classifica" && <><CercaClassifica classifica={classifica} /><ClassificaView data={classifica} gara={g} exportable={g.stato === "Conclusa"} /></>}
          {tab === "prede" && <ListaPrede classifica={classifica} />}
          {tab === "campo" && <CampoGara individui={classifica.individui} settori={g.settori} />}
        </Pad>
      </Screen>
    </View>
  );
}
