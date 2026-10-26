import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { alternarPermiso } from "../auth/permisos.js";
import { Modal, useLoad, useToast } from "../components/ui.jsx";

/** Matriz pantallas × acciones. Las celdas de acciones que no existen en una pantalla quedan vacías. */
export function MatrizPermisos({ catalogo, permisos, onChange, disabled }) {
  const acciones = Object.keys(catalogo.acciones);
  const set = new Set(permisos);
  return (
    <div className="tbl-wrap"><table className="matriz">
      <thead><tr><th>Pantalla</th>{acciones.map((a) => <th key={a}>{catalogo.acciones[a]}</th>)}</tr></thead>
      <tbody>{catalogo.pantallas.map((p) => (
        <tr key={p.clave}>
          <td>{p.nombre}</td>
          {acciones.map((a) => {
            const perm = `${p.clave}:${a}`;
            return <td key={a}>{p.acciones.includes(a) && (
              <input type="checkbox" aria-label={`${p.nombre}: ${catalogo.acciones[a]}`} checked={set.has(perm)} disabled={disabled}
                onChange={(e) => onChange(alternarPermiso(permisos, perm, e.target.checked))} />
            )}</td>;
          })}
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function RolForm({ rol, catalogo, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ nombre: rol?.nombre || "", descripcion: rol?.descripcion || "", permisos: rol?.permisos || [] });
  const sistema = Boolean(rol?.sistema);
  async function guardar() {
    if (!f.nombre.trim()) return toast("El nombre del rol es obligatorio.");
    try {
      if (rol) await api.put(`/roles/${rol.id}`, sistema ? { descripcion: f.descripcion } : f);
      else await api.post("/roles", f);
      toast(rol ? "Rol actualizado" : "Rol creado");
      onSaved();
      onClose();
    } catch (e) { toast(e.message); }
  }
  return (
    <Modal title={rol ? `Rol: ${rol.nombre}` : "Nuevo rol"} onClose={onClose}>
      <div className="form">
        <label className="f">Nombre *<input value={f.nombre} disabled={sistema} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
        <label className="f wide">Descripción<input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></label>
      </div>
      {sistema && <div className="banner">Rol del sistema: siempre tiene todos los permisos.</div>}
      <p className="small muted">Marcar cualquier acción habilita también “Ver” en esa pantalla. Quitar “Ver” quita todas las acciones de la pantalla.</p>
      <MatrizPermisos catalogo={catalogo} permisos={f.permisos} disabled={sistema} onChange={(permisos) => setF({ ...f, permisos })} />
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={guardar}>Guardar</button></div>
    </Modal>
  );
}

export default function Roles() {
  const { can, refrescar } = useAuth();
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [roles, catalogo] = await Promise.all([api.get("/roles"), api.get("/auth/catalogo")]);
    return { roles, catalogo };
  });
  const [edit, setEdit] = useState(null);
  const guardado = () => { reload(); refrescar(); };

  async function eliminar(r) {
    if (!window.confirm(`¿Eliminar el rol ${r.nombre}?`)) return;
    try { await api.del(`/roles/${r.id}`); toast("Rol eliminado"); reload(); }
    catch (e) { toast(e.message); }
  }

  if (error) return <div className="banner">{error}</div>;
  if (!data) return <div className="empty">Cargando…</div>;
  return (
    <section className="view">
      <div className="row between"><h2>Roles y permisos</h2><Can perm="roles:crear"><button className="btn pri" onClick={() => setEdit({})}>Nuevo rol</button></Can></div>
      <p className="small muted" style={{ maxWidth: "80ch" }}>Cada rol define qué pantallas ve el usuario y qué acciones puede ejecutar en cada una. Un usuario con varios roles suma sus permisos. Los cambios aplican de inmediato en el servidor.</p>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Rol</th><th>Descripción</th><th className="num">Permisos</th><th className="num">Usuarios</th><th /></tr></thead>
        <tbody>{data.roles.map((r) => (
          <tr key={r.id}>
            <td><b>{r.nombre}</b>{r.sistema && <> <span className="pill p-sin">Sistema</span></>}</td>
            <td className="small">{r.descripcion}</td><td className="num">{r.permisos.length}</td><td className="num">{r.usuarios}</td>
            <td><div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
              <button className="btn sm" onClick={() => setEdit({ r })}>{can("roles:editar") ? "Editar" : "Ver"}</button>
              {can("roles:eliminar") && !r.sistema && <button className="btn sm danger" onClick={() => eliminar(r)}>Eliminar</button>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {edit && (can("roles:editar") || !edit.r
        ? <RolForm rol={edit.r} catalogo={data.catalogo} onClose={() => setEdit(null)} onSaved={guardado} />
        : <Modal title={`Rol: ${edit.r.nombre}`} onClose={() => setEdit(null)}><MatrizPermisos catalogo={data.catalogo} permisos={edit.r.permisos} disabled onChange={() => {}} /></Modal>)}
    </section>
  );
}
