import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { fmtTs } from "../lib/kardex.js";
import { Modal, useLoad, useToast } from "../components/ui.jsx";

export function UsuarioForm({ usuario, roles, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    username: usuario?.username || "", nombre: usuario?.nombre || "", email: usuario?.email || "", password: "",
    roles: usuario?.roles.map((r) => r.id) || [], activo: usuario?.activo ?? true,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggleRol = (id) => setF({ ...f, roles: f.roles.includes(id) ? f.roles.filter((x) => x !== id) : [...f.roles, id] });

  async function guardar() {
    if (!f.roles.length) return toast("Asigne al menos un rol.");
    if (!usuario && f.password.length < 8) return toast("La contraseña debe tener al menos 8 caracteres.");
    try {
      const { username, password, ...resto } = f;
      if (usuario) await api.put(`/usuarios/${usuario.id}`, { ...resto, ...(password ? { password } : {}) });
      else await api.post("/usuarios", f);
      toast(usuario ? "Usuario actualizado" : "Usuario creado");
      onSaved();
      onClose();
    } catch (e) { toast(e.message); }
  }

  return (
    <Modal title={usuario ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}>
      <div className="form">
        <label className="f">Usuario *<input value={f.username} disabled={Boolean(usuario)} onChange={set("username")} /></label>
        <label className="f">Nombre completo *<input value={f.nombre} onChange={set("nombre")} /></label>
        <label className="f">Correo<input type="email" value={f.email} onChange={set("email")} /></label>
        <label className="f">{usuario ? "Nueva contraseña (opcional)" : "Contraseña *"}<input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} /></label>
        <label className="chk"><input type="checkbox" checked={f.activo} onChange={set("activo")} /> Activo</label>
      </div>
      <fieldset style={{ border: "1px solid var(--line)", borderRadius: 6 }}>
        <legend className="small muted">Roles *</legend>
        {roles.map((r) => (
          <label key={r.id} className="chk"><input type="checkbox" checked={f.roles.includes(r.id)} onChange={() => toggleRol(r.id)} /> {r.nombre} <span className="small muted">{r.descripcion}</span></label>
        ))}
      </fieldset>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={guardar}>Guardar</button></div>
    </Modal>
  );
}

export default function Usuarios() {
  const { can, usuario: yo } = useAuth();
  const toast = useToast();
  const { data: usuarios, error, reload } = useLoad(() => api.get("/usuarios"));
  const [roles, setRoles] = useState(null);
  const [edit, setEdit] = useState(null);

  async function abrir(u) {
    try { setRoles(roles || (await api.get("/roles"))); setEdit({ u }); }
    catch (e) { toast(e.message); }
  }
  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar el usuario ${u.username}? Esta acción no se puede deshacer.`)) return;
    try { await api.del(`/usuarios/${u.id}`); toast("Usuario eliminado"); reload(); }
    catch (e) { toast(e.message); }
  }

  return (
    <section className="view">
      <div className="row between"><h2>Usuarios</h2><Can perm="usuarios:crear"><button className="btn pri" onClick={() => abrir(null)}>Nuevo usuario</button></Can></div>
      {error && <div className="banner">{error}</div>}
      {!usuarios ? <div className="empty">Cargando…</div> : (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Roles</th><th>Estado</th><th>Último ingreso</th><th /></tr></thead>
          <tbody>{usuarios.map((u) => (
            <tr key={u.id}>
              <td className="mono">{u.username}</td><td>{u.nombre}<div className="small muted">{u.email}</div></td>
              <td>{u.roles.map((r) => <span key={r.id} className="pill t-MED" style={{ marginRight: 4 }}>{r.nombre}</span>)}</td>
              <td><span className={`pill ${u.activo ? "p-verde" : "off"}`}>{u.activo ? "Activo" : "Inactivo"}</span></td>
              <td className="small">{fmtTs(u.ultimoIngreso)}</td>
              <td><div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
                {can("usuarios:editar") && <button className="btn sm" onClick={() => abrir(u)}>Editar</button>}
                {can("usuarios:eliminar") && u.id !== yo.id && <button className="btn sm danger" onClick={() => eliminar(u)}>Eliminar</button>}
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {edit && roles && <UsuarioForm usuario={edit.u} roles={roles} onClose={() => setEdit(null)} onSaved={reload} />}
    </section>
  );
}
