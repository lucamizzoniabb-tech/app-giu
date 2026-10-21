import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const InstallaApp = () => {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(window.matchMedia("(display-mode: standalone)").matches);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setEvt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!evt && !ios) return null;
  const click = async () => {
    if (evt) { evt.prompt(); await evt.userChoice; setEvt(null); return; }
    toast.message("Installa su iPhone", { description: "Tocca Condividi in Safari, poi \"Aggiungi alla schermata Home\"", duration: 8000 });
  };
  return (
    <button data-testid="installa-app-btn" onClick={click} className="btn btn-sm btn-outline" title="Installa l'app">
      <Download size={14} /><span className="hidden sm:inline">Installa app</span>
    </button>
  );
};
