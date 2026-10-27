import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Icon } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { fileUrl, openUrl } from "@/src/constants";
import { uploadForm, PickedFile } from "@/src/utils/upload";
import { useFeedback } from "@/src/feedback";

export const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function pickFile(types: string[]): Promise<PickedFile | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType };
}

export const uploadGaraFile = (gid: string, kind: string, f: PickedFile) => uploadForm(`/gare/${gid}/file/${kind}`, f);

export function LocandinaThumb({ g, width = 72, height = 96 }: any) {
  const url = fileUrl(g, "locandina");
  const box = { width, height, borderRadius: radius.sm, overflow: "hidden" as const, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center" as const, justifyContent: "center" as const };
  if (!url) return (
    <View testID={`locandina-empty-${g.id}`} style={[box, { borderStyle: "dashed", borderColor: colors.borderStrong }]}>
      <Icon name="fish" size={24} color={colors.borderStrong} />
    </View>
  );
  return (
    <Pressable testID={`locandina-${g.id}`} onPress={() => openUrl(url)} style={box}>
      {g.locandina.type === "application/pdf" ? <Icon name="file-text" size={24} color={colors.error} />
        : <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />}
    </Pressable>
  );
}

export function RegolamentoBtn({ g }: any) {
  const url = fileUrl(g, "regolamento");
  if (!url) return null;
  return <Btn small variant="ghost" icon="book-open" title="Regolamento" onPress={() => openUrl(url)} testID={`regolamento-${g.id}`} />;
}

function Upload({ gara, kind, label, types, onChange }: any) {
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const up = async () => {
    const f = await pickFile(types);
    if (!f) return;
    setBusy(true);
    try { await uploadGaraFile(gara.id, kind, f); toast(`${label} caricato`); onChange(); } catch (e) { toast(errMsg(e), "error"); }
    setBusy(false);
  };
  const del = async () => { if (await confirm(`Rimuovere ${label.toLowerCase()}?`, "Rimuovi")) { await api.del(`/gare/${gara.id}/file/${kind}`); onChange(); } };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Btn small variant="outline" busy={busy} icon={kind === "locandina" ? "image-plus" : "book-open"} title={gara[kind] ? `Cambia ${label.toLowerCase()}` : label} onPress={up} testID={`${kind}-upload-btn`} />
      {gara[kind] && <Btn small variant="dangerGhost" icon="trash-2" onPress={del} testID={`${kind}-del-btn`} />}
    </View>
  );
}

export const LocandinaUpload = ({ gara, onChange }: any) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
    <Upload gara={gara} kind="locandina" label="Immagine" types={IMG_TYPES} onChange={onChange} />
    <Upload gara={gara} kind="regolamento" label="Regolamento" types={["application/pdf"]} onChange={onChange} />
  </View>
);

export function FileFields({ files, setFiles }: any) {
  const pick = async (k: string, types: string[]) => { const f = await pickFile(types); if (f) setFiles({ ...files, [k]: f }); };
  return (
    <View style={{ gap: spacing.sm }}>
      {[["locandina", "Immagine / locandina", IMG_TYPES], ["regolamento", "Regolamento (PDF)", ["application/pdf"]]].map(([k, t, ty]: any) => (
        <Pressable key={k} testID={`crea-gara-${k}`} onPress={() => pick(k, ty)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong, borderRadius: radius.md - 2, padding: spacing.md }}>
          <Icon name={k === "locandina" ? "image-plus" : "book-open"} size={18} color={colors.brand} />
          <Text style={{ flex: 1, color: files[k] ? colors.onSurface : colors.muted }} numberOfLines={1}>{files[k]?.name || t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const uploadFiles = async (gid: string, files: any) => {
  for (const k of ["locandina", "regolamento"]) if (files[k]) await uploadGaraFile(gid, k, files[k]);
};
