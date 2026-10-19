import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useAuth, homeFor } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { nav(homeFor(await login(u, p))); } catch (er) { setErr(errMsg(er)); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-4xl font-extrabold">Area Giudici</h1>
        <p className="mt-2 text-sm text-slate-500">Admin, Giudici e Ispettori di sponda</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div><label className="lbl">Utente</label><input data-testid="login-username-input" autoCapitalize="none" autoComplete="username" className="fld h-12" value={u} onChange={(e) => setU(e.target.value)} required /></div>
          <div><label className="lbl">Password</label><input data-testid="login-password-input" type="password" autoComplete="current-password" className="fld h-12" value={p} onChange={(e) => setP(e.target.value)} required /></div>
          {err && <p className="text-sm text-red-600" data-testid="login-error">{err}</p>}
          <button data-testid="login-submit-btn" disabled={busy} className="btn btn-lg btn-primary w-full">{busy ? "Accesso…" : "Accedi"}</button>
        </form>
      </main>
    </div>
  );
}
