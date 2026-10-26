import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

/** Muestra el contenido solo si el usuario tiene alguno de los permisos ("pantalla:accion"). */
export function Can({ perm, children, fallback = null }) {
  const { can } = useAuth();
  const perms = Array.isArray(perm) ? perm : [perm];
  return can(...perms) ? children : fallback;
}

/** Protege una ruta: exige sesión y el permiso de ver la pantalla. */
export function RequirePermiso({ perm, children }) {
  const { usuario, cargando, can } = useAuth();
  const loc = useLocation();
  if (cargando) return <div className="empty">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (perm && !can(perm)) return <Navigate to="/sin-acceso" replace />;
  return children;
}
