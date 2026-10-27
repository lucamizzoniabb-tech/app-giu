import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { api } from "@/src/api";

export type PickedFile = { uri: string; name: string; mimeType?: string | null };

export async function uploadForm(path: string, file: PickedFile, fields: Record<string, string | number> = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
  const raw = Platform.OS === "web" ? await (await fetch(file.uri)).blob() : await (await expoFetch(file.uri)).blob();
  let blob: Blob = raw as Blob;
  if (file.mimeType && blob.type !== file.mimeType) {
    try { blob = new Blob([blob], { type: file.mimeType }); } catch { /* keep original */ }
  }
  form.append("file", blob, file.name);
  return api.post(path, form);
}
