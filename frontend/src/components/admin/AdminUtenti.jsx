import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, get } from "@/lib/api";

const EMPTY = { username: "", password: "", role: "ISPETTORE", nome: "", gara_id: "", settore: "" };

export const AdminUtenti = () => {
  const [users, setUsers] = useState([]);
  const [gare, setGare] = useState([]);
  const [f, setF] = useState(null);
  const load = () => get("/users").then(setUsers);
  useEffect(() => { load(); get("/gare").then(setGare); }, []);
  const gara = gare.find((g) => g.id === f?.gara_id);
  const letters = gara?.settori?.length ? gara.settori.map((s) => s.lettera) : ["A", "B", "C", "D", "E"];

  const save = async (e) => {
    e.preventDefault();
    const body = { ...f, gara_id: f.gara_id || null, settore: f.settore || null };
    try {
      f.id ? await api.put(`/users/${f.id}`, body) : await api.post("/users", body);
      toast.success("Utente salvato"); setF(null); load();
    } catch (er) { toast.error(errMsg(er)); }
  };
  const del = async (u) => {
    if (!window.confirm(`Eliminare ${u.username}?`)) return;
    try { await api.delete(`/users/${u.id}`); load(); } catch (er) { toast.error(errMsg(er)); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-4">
      {!f && <button data-testid="nuovo-utente-btn" onClick={() => setF(EMPTY)} className="btn btn-primary"><Plus size={16} />Nuovo utente</button>}
      {f && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-3" data-testid="utente-form">
          <div><span className="lbl">Username</span><input data-testid="utente-form-username" disabled={!!f.id} required className="fld" value={f.username} onChange={set("username")} /></div>
          <div><span className="lbl">Password {f.id && "(lascia vuoto)"}</span><input data-testid="utente-form-password" required={!f.id} className="fld" value={f.password || ""} onChange={set("password")} /></div>
          <div><span className="lbl">Nome</span><input data-testid="utente-form-nome" className="fld" value={f.nome || ""} onChange={set("nome")} /></div>
          <div><span className="lbl">Ruolo</span><select data-testid="utente-form-role" className="fld" value={f.role} onChange={set("role")}>{["GIUDICE", "ISPETTORE", "ADMIN"].map((r) => <option key={r}>{r}</option>)}</select></div>
          {f.role === "ISPETTORE" && (
            <>
              <div><span className="lbl">Gara</span><select data-testid="utente-form-gara" className="fld" value={f.gara_id || ""} onChange={set("gara_id")}><option value="">— Nessuna —</option>{gare.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select></div>
              <div><span className="lbl">Settore</span><select data-testid="utente-form-settore" className="fld" value={f.settore || ""} onChange={set("settore")}><option value="">—</option>{letters.map((l) => <option key={l} value={l}>SETTORE {l}</option>)}</select></div>
            </>
          )}
          <div className="flex items-end gap-2 sm:col-span-3"><button data-testid="utente-form-save" className="btn btn-primary">Salva</button><button type="button" onClick={() => setF(null)} className="btn btn-outline">Annulla</button></div>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="tbl" data-testid="admin-utenti-table">
          <thead><tr><th>Utente</th><th>Ruolo</th><th>Assegnazione</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><div className="font-semibold">{u.username}</div><div className="text-xs text-slate-500">{u.nome}</div></td>
                <td><span className="chip border-slate-300 text-slate-600">{u.role}</span></td>
                <td className="text-xs">{u.role === "ISPETTORE" ? (u.gara_id ? `${gare.find((g) => g.id === u.gara_id)?.nome || "?"} · SETTORE ${u.settore || "—"}` : "—") : u.role === "GIUDICE" ? gare.filter((g) => g.giudice_id === u.id).map((g) => g.nome).join(", ") || "—" : "tutto"}</td>
                <td className="whitespace-nowrap text-right">
                  <button data-testid={`edit-user-${u.username}`} onClick={() => setF({ ...u, password: "" })} className="btn btn-sm btn-ghost" aria-label="Modifica"><Pencil size={14} /></button>
                  <button data-testid={`del-user-${u.username}`} onClick={() => del(u)} className="btn btn-sm btn-ghost text-red-600" aria-label="Elimina"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
