import { createContext, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY } from "@/lib/api";

const Ctx = createContext(null);

export const homeFor = (u) => (u?.role === "ADMIN" ? "/admin" : u?.role === "GIUDICE" ? "/giudice" : "/ispettore");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return setUser(false);
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(false);
    });
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(false);
  };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
