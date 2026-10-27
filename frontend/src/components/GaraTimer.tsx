import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Icon } from "@/src/ui";
import { api, errMsg } from "@/src/api";
import { useFeedback } from "@/src/feedback";

const pad = (n: number) => String(n).padStart(2, "0");
const hms = (ms: number) => { const x = Math.ceil(ms / 1000); return `${pad(Math.floor(x / 3600))}:${pad(Math.floor((x % 3600) / 60))}:${pad(x % 60)}`; };

export function GaraTimer({ gara, controls, onChange, compact, isAdmin, big }: any) {
  const { toast, confirm } = useFeedback();
  const offset = useRef(0);
  const [, tick] = useState(0);
  useEffect(() => { if (gara?.server_now) offset.current = gara.server_now - Date.now(); }, [gara?.server_now]);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(t); }, []);
  const t = gara.timer || { stato: "FERMO" };
  const durata = t.durata_ms || (gara.durata_min || 180) * 60000;
  const now = Date.now() + offset.current;
  const ref = t.stato === "PAUSA" ? t.paused_at : t.stato === "TERMINATO" ? t.stop_at : now;
  const elapsed = t.start_ms ? Math.max(0, ref - t.start_ms - (t.pausa_ms || 0)) : 0;
  const remaining = Math.max(0, durata - elapsed);
  const scaduto = (t.stato === "IN_CORSO" && remaining === 0) || t.stato === "TERMINATO";
  const label = scaduto ? "TEMPO SCADUTO" : ({ FERMO: "In attesa del via", IN_CORSO: "In corso", PAUSA: "In pausa" } as any)[t.stato];
  const [bg, fg] = scaduto ? [colors.error, colors.onError] : t.stato === "IN_CORSO" ? [colors.success, colors.onSuccess] : t.stato === "PAUSA" ? [colors.warning, colors.onTechnical] : [colors.surfaceTertiary, colors.onSurfaceSecondary];
  const act = async (azione: string) => {
    if (["stop", "reset"].includes(azione) && !(await confirm(azione === "stop" ? "Terminare la gara (fine tempo)?" : "Azzerare il timer?"))) return;
    try { await api.post(`/gare/${gara.id}/timer`, { azione }); onChange?.(); } catch (e) { toast(errMsg(e), "error"); }
  };
  return (
    <View style={[s.wrap, { backgroundColor: bg, paddingVertical: compact ? spacing.sm : spacing.md }]} testID="gara-timer">
      <View style={s.top}>
        <Icon name="timer" size={compact ? 18 : 22} color={fg} />
        <Text style={[s.time, { color: fg, fontSize: big ? 44 : compact ? 24 : 32 }]} testID="timer-display">{hms(t.stato === "FERMO" ? durata : remaining)}</Text>
        <Text style={[s.lbl, { color: fg }]} testID="timer-stato">{label}</Text>
      </View>
      {controls && (
        <View style={s.ctrl}>
          {t.stato === "FERMO" && <Btn small variant="dark" icon="play" title="Via" onPress={() => act("start")} testID="timer-start-btn" />}
          {t.stato === "IN_CORSO" && <Btn small variant="light" icon="pause" title="Pausa" onPress={() => act("pausa")} testID="timer-pause-btn" />}
          {t.stato === "PAUSA" && <Btn small variant="light" icon="play" title="Riprendi" onPress={() => act("riprendi")} testID="timer-resume-btn" />}
          {["IN_CORSO", "PAUSA"].includes(t.stato) && <Btn small variant="light" icon="square" title="Stop" onPress={() => act("stop")} testID="timer-stop-btn" />}
          {isAdmin && t.stato !== "FERMO" && <Btn small variant="light" icon="rotate-ccw" onPress={() => act("reset")} testID="timer-reset-btn" />}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderRadius: radius.md, paddingHorizontal: spacing.lg, gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  time: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  lbl: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 },
  ctrl: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
