import React, { createContext, useContext, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { api, loadToken, setToken } from "@/src/api";
import { Loading } from "@/src/ui";

export type User = { id: string; username: string; role: "ADMIN" | "GIUDICE" | "ISPETTORE"; nome: string; gara_id?: string; settore?: string };
type Ctx = { user: User | null | false; login: (u: string, p: string) => Promise<User>; logout: () => Promise<void> };
const AuthCtx = createContext<Ctx>(null as any);

export const homeFor = (u: any) => (u?.role === "ADMIN" ? "/admin" : u?.role === "GIUDICE" ? "/giudice" : "/ispettore");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | false>(null);
  useEffect(() => {
    (async () => {
      if (!(await loadToken())) return setUser(false);
      try { setUser(await api.get("/auth/me")); } catch { await setToken(null); setUser(false); }
    })();
  }, []);
  const login = async (username: string, password: string) => {
    const data = await api.post("/auth/login", { username, password });
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => { await setToken(null); setUser(false); };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function Guard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (!roles.includes(user.role)) return <Redirect href={homeFor(user) as any} />;
  return <>{children}</>;
}
