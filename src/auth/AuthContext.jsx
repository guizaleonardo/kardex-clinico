import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "../api/client.js";
import { puede } from "./permisos.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.set(null);
    setSesion(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    api.get("/auth/me")
      .then(setSesion)
      .catch(() => tokenStore.set(null))
      .finally(() => setCargando(false));
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const { token, ...s } = await api.post("/auth/login", { username, password });
    tokenStore.set(token);
    setSesion(s);
    return s;
  }, []);

  const refrescar = useCallback(async () => setSesion(await api.get("/auth/me")), []);

  const value = useMemo(() => {
    const permisos = new Set(sesion?.permisos || []);
    return {
      usuario: sesion?.usuario || null,
      permisos,
      can: (...p) => puede(permisos, ...p),
      cargando,
      login,
      logout,
      refrescar,
    };
  }, [sesion, cargando, login, logout, refrescar]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
