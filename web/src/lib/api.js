import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const TOKEN_KEY = "fipsas_token";
export const api = axios.create({ baseURL: API });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Errore";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return String(d);
};

export function usePoll(fn, ms = 2500, key = "") {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(fn);
  ref.current = fn;
  const load = useCallback(async () => {
    try {
      setData(await ref.current());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    setData(null);
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, ms);
    return () => clearInterval(t);
  }, [load, ms, key]);
  return { data, error, reload: load };
}

export const get = (url) => api.get(url).then((r) => r.data);
