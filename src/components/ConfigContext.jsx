import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

export const DEF_CFG = { servicios: ["Servicio farmacéutico"], rojoMeses: 6, amarilloMeses: 12, diasConsignacion: 30, horaInicio: 6, horaFin: 22 };

const ConfigContext = createContext({ ...DEF_CFG, recargar: () => {} });

export function ConfigProvider({ children }) {
  const [cfg, setCfg] = useState(DEF_CFG);
  const recargar = useCallback(() => api.get("/config").then(setCfg).catch(() => {}), []);
  useEffect(() => { recargar(); }, [recargar]);
  return <ConfigContext.Provider value={{ ...cfg, recargar }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
