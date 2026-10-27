import { Delete, Check } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "del"];

export const NumPad = ({ value, onChange, onOk, max = 4, busy, testid }) => {
  const press = (k) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (k === "del") return onChange(value.slice(0, -1));
    if (k === "C") return onChange("");
    if (value.length >= max) return;
    onChange(value === "0" ? k : value + k);
  };
  return (
    <div className="grid select-none grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1.5" data-testid={testid}>
      {KEYS.map((k) => (
        <button key={k} type="button" data-testid={`${testid}-${k}`} onClick={() => press(k)}
          className={`num h-14 rounded-md text-2xl font-bold transition-transform active:scale-95 ${k === "C" ? "bg-white text-red-600" : "bg-white text-slate-900"} shadow-sm`}>
          {k === "del" ? <Delete className="mx-auto" size={22} /> : k}
        </button>
      ))}
      <button type="button" data-testid={`${testid}-ok`} disabled={busy} onClick={onOk} className="col-span-3 flex h-14 items-center justify-center gap-2 rounded-md bg-emerald-600 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50">
        <Check size={20} />Invia
      </button>
    </div>
  );
};
