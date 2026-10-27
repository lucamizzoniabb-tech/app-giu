import React, { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { colors, radius, spacing } from "@/src/theme";
import { Btn, Field, Header, Label, Pad, Screen } from "@/src/ui";
import { useAuth, homeFor } from "@/src/auth";
import { api, errMsg } from "@/src/api";

export default function Login() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "", nome: "", role: "ISPETTORE" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Redirect href={homeFor(user) as any} />;
  const reg = mode === "register";
  const submit = async () => {
    setBusy(true); setErr(""); setOk("");
    try {
      if (!reg) router.replace(homeFor(await login(f.username.trim(), f.password)) as any);
      else {
        if (!f.nome.trim()) throw new Error("Inserisci nome e cognome");
        await api.post("/auth/register", f);
        setOk("Registrazione inviata. Potrai accedere dopo l'approvazione dell'Admin.");
        setMode("login");
      }
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header back title="" />
      <Screen>
        <Pad style={{ paddingTop: spacing.xxl, gap: spacing.lg }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: colors.onSurface, letterSpacing: -0.8 }}>{reg ? "Registrazione" : "Area Giudici"}</Text>
          {reg && (
            <View style={{ gap: spacing.xs }}>
              <Label>Ruolo</Label>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {[["GIUDICE", "Giudice"], ["ISPETTORE", "Ispettore"]].map(([k, t]) => (
                  <Btn key={k} flex variant={f.role === k ? "dark" : "outline"} title={t} onPress={() => setF({ ...f, role: k })} testID={`register-role-${k.toLowerCase()}`} />
                ))}
              </View>
            </View>
          )}
          {reg && <Field label="Nome e cognome" testID="register-nome-input" value={f.nome} onChangeText={(v) => setF({ ...f, nome: v })} />}
          <Field label="Utente" testID="login-username-input" autoCapitalize="none" autoCorrect={false} autoComplete="username" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} />
          <Field label="Password" testID="login-password-input" secureTextEntry autoCapitalize="none" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} onSubmitEditing={submit} returnKeyType="go" />
          {!!err && <Text style={{ color: colors.errorStrong }} testID="login-error">{err}</Text>}
          {!!ok && <Text style={{ backgroundColor: colors.successSoft, color: colors.successStrong, padding: spacing.md, borderRadius: radius.sm }} testID="register-success">{ok}</Text>}
          <Btn title={busy ? "Attendere…" : reg ? "Registrati" : "Accedi"} busy={busy} onPress={submit} testID="login-submit-btn" style={{ height: 52 }} />
          <Btn variant="ghost" title={reg ? "Hai già un account? Accedi" : "Giudice o ispettore? Registrati"} onPress={() => { setMode(reg ? "login" : "register"); setErr(""); }} testID="toggle-register-btn" />
        </Pad>
      </Screen>
    </View>
  );
}
