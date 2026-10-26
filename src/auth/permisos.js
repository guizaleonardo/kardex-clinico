/* Pantallas del menú. El permiso "<clave>:ver" decide si la pestaña aparece y si la ruta abre. */
export const PANTALLAS = [
  { clave: "panel", nombre: "Panel" },
  { clave: "inventario", nombre: "Inventario" },
  { clave: "movimientos", nombre: "Movimientos" },
  { clave: "conteos", nombre: "Toma física" },
  { clave: "importar", nombre: "Importar Excel" },
  { clave: "analisis", nombre: "Análisis de riesgo" },
  { clave: "normas", nombre: "Marco normativo" },
  { clave: "ajustes", nombre: "Ajustes" },
  { clave: "usuarios", nombre: "Usuarios" },
  { clave: "roles", nombre: "Roles y permisos" },
];

/** true si el conjunto de permisos incluye al menos uno de los requeridos. */
export function puede(permisos, ...requeridos) {
  if (!permisos) return false;
  return requeridos.some((p) => permisos.has(p));
}

export const pantallasVisibles = (permisos) => PANTALLAS.filter((p) => puede(permisos, `${p.clave}:ver`));

export function rutaInicial(permisos) {
  const p = pantallasVisibles(permisos)[0];
  return p ? `/${p.clave}` : "/sin-acceso";
}

/** Igual que en el backend: marcar una acción implica poder ver la pantalla; quitar "ver" quita todas sus acciones. */
export function alternarPermiso(lista, permiso, marcado) {
  const set = new Set(lista);
  const [pantalla, accion] = permiso.split(":");
  if (marcado) {
    set.add(permiso);
    set.add(`${pantalla}:ver`);
  } else if (accion === "ver") {
    for (const p of [...set]) if (p.startsWith(`${pantalla}:`)) set.delete(p);
  } else {
    set.delete(permiso);
  }
  return [...set];
}
