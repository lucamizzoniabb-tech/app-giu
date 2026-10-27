import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/src/theme";

type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; text: string; type: ToastType; action?: { label: string; onPress: () => void } };
type Ctx = {
  toast: (text: string, type?: ToastType, action?: Toast["action"]) => void;
  confirm: (message: string, okLabel?: string) => Promise<boolean>;
};
const FCtx = createContext<Ctx>(null as any);

const TONE: Record<ToastType, string> = { success: colors.successStrong, error: colors.errorStrong, warning: colors.warningStrong, info: colors.brand };

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dlg, setDlg] = useState<{ message: string; okLabel: string; res: (v: boolean) => void } | null>(null);
  const toast = useCallback((text: string, type: ToastType = "success", action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, type, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const confirm = useCallback((message: string, okLabel = "Conferma") => new Promise<boolean>((res) => setDlg({ message, okLabel, res })), []);
  const close = (v: boolean) => { dlg?.res(v); setDlg(null); };
  return (
    <FCtx.Provider value={{ toast, confirm }}>
      {children}
      <View pointerEvents="box-none" style={[st.toastWrap, { top: insets.top + spacing.sm }]}>
        {toasts.map((t) => (
          <Animated.View key={t.id} entering={FadeInUp} exiting={FadeOutUp} style={[st.toast, { backgroundColor: TONE[t.type] }]} testID="toast">
            <Text style={st.toastT}>{t.text}</Text>
            {t.action && (
              <Pressable onPress={() => { t.action!.onPress(); setToasts((x) => x.filter((y) => y.id !== t.id)); }} style={st.toastBtn} testID="toast-action">
                <Text style={st.toastBtnT}>{t.action.label}</Text>
              </Pressable>
            )}
          </Animated.View>
        ))}
      </View>
      <Modal visible={!!dlg} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={st.backdrop}>
          <View style={st.dialog} testID="confirm-dialog">
            <Text style={st.dlgT}>{dlg?.message}</Text>
            <View style={st.dlgRow}>
              <Pressable testID="confirm-cancel-btn" onPress={() => close(false)} style={[st.dlgBtn, { borderColor: colors.borderStrong }]}><Text style={st.dlgBtnT}>Annulla</Text></Pressable>
              <Pressable testID="confirm-ok-btn" onPress={() => close(true)} style={[st.dlgBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]}><Text style={[st.dlgBtnT, { color: colors.onBrandPrimary }]}>{dlg?.okLabel}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </FCtx.Provider>
  );
}

export const useFeedback = () => useContext(FCtx);

const st = StyleSheet.create({
  toastWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, gap: spacing.sm, zIndex: 100 },
  toast: { borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  toastT: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 14, flex: 1 },
  toastBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.sm },
  toastBtnT: { color: colors.onBrandPrimary, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: spacing.xl },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xl },
  dlgT: { fontSize: 16, color: colors.onSurface, lineHeight: 22 },
  dlgRow: { flexDirection: "row", gap: spacing.md },
  dlgBtn: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dlgBtnT: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
});
