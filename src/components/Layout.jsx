import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { pantallasVisibles } from "../auth/permisos.js";
import { ConfigProvider } from "./ConfigContext.jsx";

export default function Layout() {
  const { usuario, permisos, logout } = useAuth();
  const tabs = pantallasVisibles(permisos);
  return (
    <ConfigProvider>
      <header className="top">
        <div className="wrap">
          <div className="topbar">
            <div className="brand"><h1>Kardex Clínico</h1><small>Medicamentos · Dispositivos · Insumos · Osteosíntesis</small></div>
            <div className="who">
              <span className="dot on" />
              <span>{usuario?.nombre} · {usuario?.roles.map((r) => r.nombre).join(", ")}</span>
              <button className="btn sm" onClick={logout}>Salir</button>
            </div>
          </div>
          <nav className="tabs" aria-label="Pantallas">
            {tabs.map((t) => (
              <NavLink key={t.clave} to={`/${t.clave}`}>{t.nombre}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap"><Outlet /></main>
    </ConfigProvider>
  );
}
