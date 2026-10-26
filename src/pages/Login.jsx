import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { rutaInicial } from "../auth/permisos.js";

function IconoOjo({ tachado }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export default function Login() {
  const { usuario, permisos, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verClave, setVerClave] = useState(false);
  if (usuario) return <Navigate to={rutaInicial(permisos)} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const s = await login(f.username, f.password);
      nav(loc.state?.from || rutaInicial(new Set(s.permisos)), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="panel" onSubmit={enviar}>
        <h1>Kardex Clínico</h1>
        <p className="small muted">Medicamentos · Dispositivos · Insumos · Osteosíntesis</p>
        <label className="f">Usuario<input autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></label>
        <label className="f" htmlFor="login-clave">Contraseña
          <div className="clave">
            <input id="login-clave" type={verClave ? "text" : "password"} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={verClave} title={verClave ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVerClave(!verClave)}>
              <IconoOjo tachado={verClave} />
            </button>
          </div>
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn pri" disabled={busy}>Ingresar</button>
      </form>
    </div>
  );
}
