import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { storage } from "@/src/utils/storage";

export const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API = `${BASE}/api`;
const KEY = "fipsas_token";
let token: string | null = null;

export const setToken = async (t: string | null) => {
  token = t;
  if (t) await storage.setItem(KEY, t);
  else await storage.removeItem(KEY);
};
export const loadToken = async () => (token = await storage.getItem(KEY));

export class ApiError extends Error {
  status: number;
  constructor(m: string, s: number) { super(m); this.status = s; }
}

async function req(method: string, path: string, body?: any) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let b: any;
  if (typeof FormData !== "undefined" && body instanceof FormData) b = body;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; b = JSON.stringify(body); }
  let r: Response;
  try { r = await fetch(API + path, { method, headers, body: b }); }
  catch { throw new ApiError("Connessione assente: controlla la rete", 0); }
  const txt = await r.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) {
    const d = data?.detail;
    throw new ApiError(typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x?.msg).join(" ") : `Errore ${r.status}`, r.status);
  }
  return data;
}

export const api = {
  get: (p: string) => req("GET", p),
  post: (p: string, b: any = {}) => req("POST", p, b),
  put: (p: string, b: any = {}) => req("PUT", p, b),
  patch: (p: string, b: any = {}) => req("PATCH", p, b),
  del: (p: string) => req("DELETE", p),
};

export const errMsg = (e: any) => e?.message || "Errore";

export function usePoll<T = any>(fn: () => Promise<T>, ms = 2500, key = "") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const ref = useRef(fn);
  ref.current = fn;
  const load = useCallback(async () => {
    try { setData(await ref.current()); setError(null); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { setData(null); }, [key]);
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => { if (AppState.currentState === "active") load(); }, ms);
      return () => clearInterval(t);
    }, [load, ms, key]) // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { data, error, reload: load };
}
