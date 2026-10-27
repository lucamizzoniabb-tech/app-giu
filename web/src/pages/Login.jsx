import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useAuth, homeFor } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "", nome: "", role: "ISPETTORE" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setOk("");
    try {
      if (mode === "login") nav(homeFor(await login(f.username, f.password)));
      else {
        await api.post("/auth/register", f);
        setOk("Registrazione inviata. Potrai accedere dopo l'approvazione dell'Admin.");
        setMode("login");
      }
    } catch (er) { setErr(errMsg(er)); }
    setBusy(false);
  };
  const reg = mode === "register";
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-4xl font-extrabold">{reg ? "Registrazione" : "Area Giudici"}</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {reg && (
            <div><label className="lbl">Ruolo</label>
              <div className="grid grid-cols-2 gap-2">
                {[["GIUDICE", "Giudice"], ["ISPETTORE", "Ispettore"]].map(([k, t]) => (
                  <button type="button" key={k} data-testid={`register-role-${k.toLowerCase()}`} onClick={() => setF({ ...f, role: k })} className={`btn ${f.role === k ? "bg-slate-900 text-white" : "btn-outline"}`}>{t}</button>
                ))}
              </div></div>
          )}
          {reg && <div><label className="lbl">Nome e cognome</label><input data-testid="register-nome-input" className="fld h-12" value={f.nome} onChange={set("nome")} required /></div>}
          <div><label className="lbl">Utente</label><input data-testid="login-username-input" autoCapitalize="none" autoComplete="username" className="fld h-12" value={f.username} onChange={set("username")} required /></div>
          <div><label className="lbl">Password</label><input data-testid="login-password-input" type="password" autoComplete={reg ? "new-password" : "current-password"} className="fld h-12" value={f.password} onChange={set("password")} required minLength={reg ? 6 : undefined} /></div>
          {err && <p className="text-sm text-red-600" data-testid="login-error">{err}</p>}
          {ok && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="register-success">{ok}</p>}
          <button data-testid="login-submit-btn" disabled={busy} className="btn btn-lg btn-primary w-full">{busy ? "Attendere…" : reg ? "Registrati" : "Accedi"}</button>
        </form>
        <button data-testid="toggle-register-btn" onClick={() => { setMode(reg ? "login" : "register"); setErr(""); }} className="btn btn-ghost mt-4 w-full">
          {reg ? "Hai già un account? Accedi" : "Giudice o ispettore? Registrati"}
        </button>
      </main>
    </div>
  );
}
