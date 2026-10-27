import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, homeFor } from "@/context/AuthContext";
import Home from "@/pages/Home";
import GaraPublic from "@/pages/GaraPublic";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import GiudiceList from "@/pages/GiudiceList";
import Giudice from "@/pages/Giudice";
import Ispettore from "@/pages/Ispettore";
import Schermo from "@/pages/Schermo";
import Campionato from "@/pages/Campionato";
import { CampionatiManager } from "@/components/CampionatiManager";
import { AtletiManager } from "@/components/AtletiManager";
import { TopBar } from "@/components/TopBar";

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-sm text-slate-500">Caricamento…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gara/:id" element={<GaraPublic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/schermo/:id" element={<Schermo />} />
          <Route path="/campionato/:id" element={<Campionato />} />
          <Route path="/atleti" element={<Protected roles={["ADMIN", "GIUDICE"]}><><TopBar /><main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-3xl font-extrabold">Database atleti</h1><AtletiManager /></main></></Protected>} />
          <Route path="/campionati" element={<Protected roles={["ADMIN", "GIUDICE"]}><><TopBar /><main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-3xl font-extrabold">Campionati</h1><CampionatiManager /></main></></Protected>} />
          <Route path="/admin" element={<Protected roles={["ADMIN"]}><Admin /></Protected>} />
          <Route path="/giudice" element={<Protected roles={["ADMIN", "GIUDICE"]}><GiudiceList /></Protected>} />
          <Route path="/giudice/:id" element={<Protected roles={["ADMIN", "GIUDICE"]}><Giudice /></Protected>} />
          <Route path="/ispettore" element={<Protected roles={["ISPETTORE"]}><Ispettore /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
