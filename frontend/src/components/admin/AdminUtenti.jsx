import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";

const EMPTY = { username: "", password: "", role: "GIUDICE", nome: "" };

export const AdminUtenti = () => {
  const [users, setUsers] = useState([]);
  const [gare, setGare] = useState([]);
  const [f, setF] = useState(null);
  const load = () => get("/users").then(setUsers);
  useEffect(() => { load(); get("/gare").then(setGare); }, []);
  const pending = users.filter((u) => !u.approvato);

  const save = async (e) => {
    e.preventDefault();
    try {
      f.id ? await api.put(`/users/${f.id}`, f) : await api.post("/users", f);
      toast.success("Utente salvato"); setF(null); load();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (u) => {
    if (!window.confirm(`Eliminare ${u.username}?`)) return;
    try { await api.delete(`/users/${u.id}`); load(); } catch (er) { toast.error(errMsg(er)); }
  };
  const approva = async (u, v) => {
    try { await api.post(`/users/${u.id}/approva`, { approvato: v }); toast.success(v ? `${u.username} approvato` : `${u.username} sospeso`); load(); } catch (er) { toast.error(errMsg(er)); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const assegn = (u) => u.role === "ISPETTORE" ? (u.gara_id ? `${gare.find((g) => g.id === u.gara_id)?.nome || "?"} · SETTORE ${u.settore}` : "nessuna gara")
    : u.role === "GIUDICE" ? gare.filter((g) => g.giudice_id === u.id).map((g) => g.nome).join(", ") || "—" : "tutto";

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="card border-amber-300" data-testid="pending-users">
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Ispettori in attesa di approvazione ({pending.length})</div>
          <ul className="divide-y divide-slate-100">
            {pending.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1"><div className="font-semibold">{u.username}</div><div className="text-xs text-slate-500">{u.nome}</div></div>
                <button data-testid={`approva-${u.username}`} onClick={() => approva(u, true)} className="btn btn-sm btn-success"><Check size={14} />Approva</button>
                <button data-testid={`rifiuta-${u.username}`} onClick={() => del(u)} className="btn btn-sm btn-ghost text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!f && <button data-testid="nuovo-utente-btn" onClick={() => setF(EMPTY)} className="btn btn-primary"><Plus size={16} />Nuovo utente</button>}
      {f && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-4" data-testid="utente-form">
          <div><span className="lbl">Username</span><input data-testid="utente-form-username" disabled={!!f.id} required className="fld" value={f.username} onChange={set("username")} /></div>
          <div><span className="lbl">Password {f.id && "(lascia vuoto)"}</span><input data-testid="utente-form-password" required={!f.id} className="fld" value={f.password || ""} onChange={set("password")} /></div>
          <div><span className="lbl">Nome</span><input data-testid="utente-form-nome" className="fld" value={f.nome || ""} onChange={set("nome")} /></div>
          <div><span className="lbl">Ruolo</span><select data-testid="utente-form-role" className="fld" value={f.role} onChange={set("role")}>{["GIUDICE", "ISPETTORE", "ADMIN"].map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="flex gap-2 sm:col-span-4"><button data-testid="utente-form-save" className="btn btn-primary">Salva</button><button type="button" onClick={() => setF(null)} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      <ul className="card divide-y divide-slate-100" data-testid="admin-utenti-list">
        {users.filter((u) => u.approvato).map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-semibold">{u.username}</span><span className="chip border-slate-300 text-slate-600">{u.role}</span></div>
              <div className="truncate text-xs text-slate-500">{u.nome} · {assegn(u)}</div>
            </div>
            {u.role === "ISPETTORE" && <button data-testid={`sospendi-${u.username}`} onClick={() => approva(u, false)} className="btn btn-sm btn-ghost" aria-label="Sospendi" title="Sospendi"><Ban size={14} /></button>}
            <button data-testid={`edit-user-${u.username}`} onClick={() => setF({ ...u, password: "" })} className="btn btn-sm btn-ghost" aria-label="Modifica"><Pencil size={14} /></button>
            <button data-testid={`del-user-${u.username}`} onClick={() => del(u)} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
};
