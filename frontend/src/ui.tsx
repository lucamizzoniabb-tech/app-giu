import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import Lucide from "@react-native-vector-icons/lucide";
import { colors, radius, spacing } from "@/src/theme";

export const Icon = ({ name, size = 18, color = colors.onSurface }: { name: string; size?: number; color?: string }) => (
  <Lucide name={name as any} size={size} color={color} />
);

const VAR: Record<string, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, fg: colors.onBrandPrimary, border: colors.brand },
  outline: { bg: colors.surface, fg: colors.onSurface, border: colors.borderStrong },
  ghost: { bg: "transparent", fg: colors.onSurfaceSecondary, border: "transparent" },
  danger: { bg: colors.error, fg: colors.onError, border: colors.error },
  dangerGhost: { bg: "transparent", fg: colors.errorStrong, border: "transparent" },
  dangerOutline: { bg: colors.surface, fg: colors.errorStrong, border: colors.borderStrong },
  success: { bg: colors.success, fg: colors.onSuccess, border: colors.success },
  dark: { bg: colors.onSurface, fg: colors.surface, border: colors.onSurface },
  light: { bg: "rgba(255,255,255,0.9)", fg: colors.onSurface, border: "transparent" },
};

type BtnProps = { title?: string; onPress?: () => void; variant?: keyof typeof VAR | string; icon?: string; small?: boolean; disabled?: boolean; testID?: string; style?: ViewStyle; flex?: boolean; busy?: boolean };
export function Btn({ title, onPress, variant = "primary", icon, small, disabled, testID, style, flex, busy }: BtnProps) {
  const v = VAR[variant] || VAR.primary;
  return (
    <Pressable
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title || icon}
      style={({ pressed }) => [st.btn, small && st.btnSm, !title && (small ? st.iconSm : st.iconOnly), { backgroundColor: v.bg, borderColor: v.border }, flex && { flex: 1 }, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }, (disabled || busy) && { opacity: 0.45 }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={small ? 15 : 17} color={v.fg} /> : null}
      {!!title && <Text style={[st.btnT, small && st.btnTSm, { color: v.fg }]} numberOfLines={1}>{title}</Text>}
    </Pressable>
  );
}

export const Label = ({ children }: { children: React.ReactNode }) => <Text style={st.lbl}>{children}</Text>;

export function Field({ label, style, ...p }: TextInputProps & { label?: string; style?: ViewStyle }) {
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      {!!label && <Label>{label}</Label>}
      <TextInput placeholderTextColor={colors.muted} {...p} style={[st.input, p.multiline && { height: 96, textAlignVertical: "top", paddingTop: spacing.sm }, p.editable === false && { backgroundColor: colors.surfaceTertiary }]} />
    </View>
  );
}

type Opt = { value: any; label: string };
export function Select({ label, value, options, onChange, testID, placeholder = "Seleziona", disabled, style }: { label?: string; value: any; options: Opt[]; onChange: (v: any) => void; testID?: string; placeholder?: string; disabled?: boolean; style?: ViewStyle }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const cur = options.find((o) => String(o.value) === String(value));
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      {!!label && <Label>{label}</Label>}
      <Pressable testID={testID} disabled={disabled} onPress={() => setOpen(true)} style={[st.input, st.select, disabled && { backgroundColor: colors.surfaceTertiary, opacity: 0.7 }]}>
        <Text style={[st.selectT, !cur && { color: colors.muted }]} numberOfLines={1}>{cur?.label ?? placeholder}</Text>
        <Icon name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.sheetBackdrop} onPress={() => setOpen(false)} testID={testID ? `${testID}-backdrop` : undefined} />
        <View style={[st.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={st.grabber} />
          {!!label && <Text style={st.sheetTitle}>{label}</Text>}
          <ScrollView style={{ maxHeight: 420 }}>
            {options.map((o, i) => {
              const sel = String(o.value) === String(value);
              return (
                <Pressable key={`${o.value}-${i}`} testID={testID ? `${testID}-opt-${i}` : undefined} onPress={() => { onChange(o.value); setOpen(false); }} style={({ pressed }) => [st.opt, pressed && { backgroundColor: colors.surfaceTertiary }]}>
                  <Text style={[st.optT, sel && { color: colors.brand, fontWeight: "700" }]}>{o.label}</Text>
                  {sel && <Icon name="check" size={18} color={colors.brand} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function Check({ label, value, onChange, testID, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; testID?: string; disabled?: boolean }) {
  return (
    <Pressable testID={testID} disabled={disabled} onPress={() => onChange(!value)} style={[st.check, disabled && { opacity: 0.45 }]} accessibilityRole="checkbox" accessibilityState={{ checked: value }}>
      <View style={[st.box, value && { backgroundColor: colors.brand, borderColor: colors.brand }]}>{value && <Icon name="check" size={14} color={colors.onBrandPrimary} />}</View>
      <Text style={st.checkT}>{label}</Text>
    </Pressable>
  );
}

export const Chip = ({ label, bg = colors.surfaceTertiary, fg = colors.onSurfaceTertiary, testID, dot }: { label: string; bg?: string; fg?: string; testID?: string; dot?: boolean }) => (
  <View testID={testID} style={[st.chip, { backgroundColor: bg }]}>
    {dot && <View style={[st.dot, { backgroundColor: fg }]} />}
    <Text style={[st.chipT, { color: fg }]} numberOfLines={1}>{label}</Text>
  </View>
);

export const STATO_COL: Record<string, [string, string]> = {
  "Iscrizioni Aperte": [colors.infoSoft, colors.infoStrong],
  Sorteggiata: [colors.violetSoft, colors.violetStrong],
  "In Corso Live": [colors.errorSoft, colors.errorStrong],
  Conclusa: [colors.surfaceTertiary, colors.onSurfaceTertiary],
};
export const StatoChip = ({ stato, testID }: { stato: string; testID?: string }) => {
  const [bg, fg] = STATO_COL[stato] || STATO_COL.Conclusa;
  return <Chip label={stato} bg={bg} fg={fg} testID={testID} dot={stato === "In Corso Live"} />;
};
export const MISURA_STATO: Record<string, { t: string; bg: string; fg: string }> = {
  IN_ATTESA: { t: "In attesa", bg: colors.warningSoft, fg: colors.warningStrong },
  APPROVATA: { t: "Approvata", bg: colors.successSoft, fg: colors.successStrong },
  RIGETTATA: { t: "Rigettata", bg: colors.errorSoft, fg: colors.errorStrong },
};

export const Card = ({ children, style, testID }: { children: React.ReactNode; style?: any; testID?: string }) => <View testID={testID} style={[st.card, style]}>{children}</View>;
export const Empty = ({ text, testID }: { text: string; testID?: string }) => <Text testID={testID} style={st.empty}>{text}</Text>;
export const Loading = () => <View style={st.loading}><ActivityIndicator color={colors.brand} size="large" /></View>;
export const H2 = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[st.h2, style]}>{children}</Text>;
export const Muted = ({ children, style, numberOfLines, testID }: { children: React.ReactNode; style?: any; numberOfLines?: number; testID?: string }) => <Text testID={testID} numberOfLines={numberOfLines} style={[st.muted, style]}>{children}</Text>;
export const Row = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[st.row, style]}>{children}</View>;

export function Header({ title, back, right, brand }: { title?: string; back?: boolean; right?: React.ReactNode; brand?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[st.header, { paddingTop: insets.top }]}>
      <View style={st.headerIn}>
        {back && (
          <Pressable testID="header-back-btn" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={st.backBtn} accessibilityLabel="Indietro">
            <Icon name="chevron-left" size={24} color={colors.onSurface} />
          </Pressable>
        )}
        {brand ? (
          <Pressable testID="brand-home-link" onPress={() => router.replace("/")} style={st.brand}>
            <View style={st.logo}><Icon name="fish" size={17} color={colors.onBrandPrimary} /></View>
            <Text style={st.brandT}>Gare Ufficiali<Text style={{ color: colors.brandSecondary }}> Live</Text></Text>
          </Pressable>
        ) : (
          <Text style={st.headerT} numberOfLines={1}>{title}</Text>
        )}
        <View style={st.headerR}>{right}</View>
      </View>
    </View>
  );
}

export function Segmented({ items, value, onChange, prefix, dark }: { items: [string, string, number?][]; value: string; onChange: (k: string) => void; prefix: string; dark?: boolean }) {
  return (
    <View style={[st.segWrap, dark && { backgroundColor: colors.screenBg, borderBottomColor: colors.screenCard }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.segIn}>
        {items.map(([k, t, badge]) => {
          const on = value === k;
          return (
            <Pressable key={k} testID={`${prefix}-${k}`} onPress={() => onChange(k)} style={[st.seg, on ? { backgroundColor: dark ? colors.screenText : colors.onSurface, borderColor: dark ? colors.screenText : colors.onSurface } : dark && { backgroundColor: colors.screenCard, borderColor: colors.screenCard }]}>
              <Text style={[st.segT, { color: on ? (dark ? colors.screenBg : colors.surface) : dark ? colors.screenText : colors.onSurfaceSecondary }]}>{t}</Text>
              {!!badge && <View style={st.badge} testID={`${prefix}-${k}-badge`}><Text style={st.badgeT}>{badge}</Text></View>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Screen({ children, onRefresh, sticky, contentStyle }: { children: React.ReactNode; onRefresh?: () => Promise<any> | void; sticky?: number[]; contentStyle?: any }) {
  const insets = useSafeAreaInsets();
  const [ref, setRef] = useState(false);
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={sticky}
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingBottom: insets.bottom + spacing.xl }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={ref} tintColor={colors.brand} onRefresh={async () => { setRef(true); await onRefresh(); setRef(false); }} /> : undefined}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

export const Pad = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[{ paddingHorizontal: spacing.lg, gap: spacing.md }, style]}>{children}</View>;

export const st = StyleSheet.create({
  btn: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  btnSm: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm + 2, gap: 6 },
  iconOnly: { width: 46, paddingHorizontal: 0 },
  iconSm: { width: 38, paddingHorizontal: 0 },
  btnT: { fontSize: 15, fontWeight: "700" },
  btnTSm: { fontSize: 13 },
  lbl: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: colors.muted },
  input: { height: 46, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md - 2, paddingHorizontal: spacing.md, fontSize: 15, color: colors.onSurface, backgroundColor: colors.surface },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  selectT: { fontSize: 15, color: colors.onSurface, flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  opt: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: spacing.xs },
  optT: { fontSize: 15, color: colors.onSurface, flex: 1 },
  check: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 40 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkT: { fontSize: 14, color: colors.onSurface, flex: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.sm, height: 24, borderRadius: radius.pill, alignSelf: "flex-start", flexShrink: 0 },
  chipT: { fontSize: 11, fontWeight: "700" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden" },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, backgroundColor: colors.surface },
  h2: { fontSize: 20, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerIn: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.sm },
  headerT: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.onSurface },
  headerR: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  backBtn: { width: 40, height: 44, marginLeft: -spacing.sm, alignItems: "center", justifyContent: "center" },
  brand: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  brandT: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  segWrap: { height: 56, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: "center" },
  segIn: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" },
  seg: { height: 36, paddingHorizontal: spacing.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0, backgroundColor: colors.surface },
  segT: { fontSize: 13, fontWeight: "600" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.warning, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeT: { color: colors.onWarning, fontSize: 11, fontWeight: "800" },
});
