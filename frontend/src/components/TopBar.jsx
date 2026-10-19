import { Link, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Fish } from "lucide-react";
import { useAuth, homeFor } from "@/context/AuthContext";

export const TopBar = ({ children }) => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" data-testid="brand-home-link" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#0f3d56] text-white"><Fish size={17} /></span>
          <span className="font-display text-[15px] font-extrabold leading-none">FIPSAS<span className="text-slate-400"> Sorteggi Pro</span></span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {children}
          {user ? (
            <>
              <button data-testid="topbar-panel-btn" onClick={() => nav(homeFor(user))} className="btn btn-sm btn-outline">
                <LayoutDashboard size={14} /> <span className="hidden sm:inline">{user.username}</span>
                <span className="text-[10px] text-slate-500">{user.role}</span>
              </button>
              <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }} className="btn btn-sm btn-ghost" aria-label="Esci"><LogOut size={15} /></button>
            </>
          ) : (
            <Link to="/login" data-testid="area-giudici-btn" className="btn btn-sm btn-primary">Area Giudici</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export const StatoChip = ({ stato, testid }) => {
  const cls = {
    "Iscrizioni Aperte": "border-sky-200 bg-sky-50 text-sky-800",
    Sorteggiata: "border-violet-200 bg-violet-50 text-violet-800",
    "In Corso Live": "border-red-200 bg-red-50 text-red-700",
    Conclusa: "border-slate-200 bg-slate-100 text-slate-600",
  }[stato];
  return (
    <span data-testid={testid} className={`chip ${cls}`}>
      {stato === "In Corso Live" && <span className="live-dot" />}{stato}
    </span>
  );
};
