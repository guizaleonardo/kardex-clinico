import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { ToastProvider } from "../components/ui.jsx";
import { api, tokenStore } from "../api/client.js";
import App from "../App.jsx";

export const USUARIO = { id: "u1", username: "ana", nombre: "Ana Ruiz", email: "", roles: [{ id: "r1", nombre: "Regente" }] };
export const CFG = { servicios: ["Urgencias", "UCI"], rojoMeses: 6, amarilloMeses: 12, diasConsignacion: 30, horaInicio: 6, horaFin: 22 };

/** Responde api.get según la ruta (sin query string). */
export function mockRutas(rutas) {
  api.get.mockImplementation(async (p) => {
    const base = p.split("?")[0];
    if (!(base in rutas)) throw new Error(`Ruta no simulada: ${p}`);
    const v = rutas[base];
    return typeof v === "function" ? v(p) : structuredClone(v);
  });
}

/** Renderiza la app completa con una sesión que tiene exactamente los permisos indicados. */
export function renderApp({ permisos = [], path = "/", rutas = {}, sesion = true } = {}) {
  if (sesion) tokenStore.set("token-de-prueba");
  mockRutas({ "/auth/me": { usuario: USUARIO, permisos }, "/config": CFG, ...rutas });
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider>
    </MemoryRouter>
  );
}
