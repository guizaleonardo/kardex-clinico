import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import { RequirePermiso } from "./auth/guards.jsx";
import { rutaInicial } from "./auth/permisos.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Panel from "./pages/Panel.jsx";
import Inventario from "./pages/Inventario.jsx";
import Movimientos from "./pages/Movimientos.jsx";
import Conteos from "./pages/Conteos.jsx";
import Importar from "./pages/Importar.jsx";
import Analisis from "./pages/Analisis.jsx";
import Normas from "./pages/Normas.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Roles from "./pages/Roles.jsx";

export const RUTAS = [
  ["panel", Panel], ["inventario", Inventario], ["movimientos", Movimientos], ["conteos", Conteos], ["importar", Importar],
  ["analisis", Analisis], ["normas", Normas], ["ajustes", Ajustes], ["usuarios", Usuarios], ["roles", Roles],
];

function Inicio() {
  const { permisos } = useAuth();
  return <Navigate to={rutaInicial(permisos)} replace />;
}

function SinAcceso() {
  return <div className="empty">Su usuario no tiene permiso para ver esta pantalla. Solicite el acceso al administrador.</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequirePermiso><Layout /></RequirePermiso>}>
        <Route index element={<Inicio />} />
        {RUTAS.map(([clave, Comp]) => (
          <Route key={clave} path={clave} element={<RequirePermiso perm={`${clave}:ver`}><Comp /></RequirePermiso>} />
        ))}
        <Route path="sin-acceso" element={<SinAcceso />} />
        <Route path="*" element={<Inicio />} />
      </Route>
    </Routes>
  );
}
