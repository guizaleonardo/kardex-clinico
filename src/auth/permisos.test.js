import { describe, expect, it } from "vitest";
import { alternarPermiso, pantallasVisibles, puede, rutaInicial } from "./permisos.js";

describe("puede", () => {
  it("basta con uno de los permisos requeridos", () => {
    const p = new Set(["inventario:ver"]);
    expect(puede(p, "inventario:ver")).toBe(true);
    expect(puede(p, "inventario:crear", "inventario:ver")).toBe(true);
    expect(puede(p, "inventario:crear")).toBe(false);
    expect(puede(null, "inventario:ver")).toBe(false);
  });
});

describe("pantallas visibles y ruta inicial", () => {
  it("solo muestra pantallas con permiso de ver, en el orden del menú", () => {
    const p = new Set(["roles:ver", "movimientos:ver", "movimientos:crear"]);
    expect(pantallasVisibles(p).map((x) => x.clave)).toEqual(["movimientos", "roles"]);
    expect(rutaInicial(p)).toBe("/movimientos");
  });
  it("sin pantallas manda a sin-acceso", () => {
    expect(rutaInicial(new Set())).toBe("/sin-acceso");
  });
});

describe("alternarPermiso", () => {
  it("marcar una acción agrega ver", () => {
    expect(alternarPermiso([], "inventario:editar", true).sort()).toEqual(["inventario:editar", "inventario:ver"]);
  });
  it("quitar ver quita todas las acciones de esa pantalla", () => {
    expect(alternarPermiso(["inventario:ver", "inventario:crear", "panel:ver"], "inventario:ver", false)).toEqual(["panel:ver"]);
  });
  it("quitar una acción deja ver", () => {
    expect(alternarPermiso(["inventario:ver", "inventario:crear"], "inventario:crear", false)).toEqual(["inventario:ver"]);
  });
});
