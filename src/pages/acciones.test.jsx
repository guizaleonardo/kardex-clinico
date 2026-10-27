import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api/client.js";
import { USUARIO, renderApp } from "../test/utils.jsx";

const ITEM = { id: "i1", tipo: "MED", nombre: "Dipirona", presentacion: "1 g", codigo: "M1", invima: "INV", lote: "A1", serie: "", vencimiento: "2099-01-01", ubicacion: "UCI", saldo: 10, saldoInicial: 10, activo: true };
const CATALOGO = {
  acciones: { ver: "Ver", crear: "Crear", editar: "Editar", eliminar: "Eliminar" },
  pantallas: [{ clave: "inventario", nombre: "Inventario", acciones: ["ver", "crear", "editar"] }, { clave: "usuarios", nombre: "Usuarios", acciones: ["ver", "crear", "editar", "eliminar"] }],
};
const ROLES = [
  { id: "r0", nombre: "Administrador", descripcion: "", sistema: true, permisos: ["inventario:ver"], usuarios: 1 },
  { id: "r1", nombre: "Auditor", descripcion: "Consulta", sistema: false, permisos: ["inventario:ver"], usuarios: 0 },
];

describe("inventario: acciones según permisos", () => {
  const fila = async () => (await screen.findByText("Dipirona")).closest("tr");

  it("con solo ver no aparecen crear, editar, movimiento ni exportar", async () => {
    renderApp({ permisos: ["inventario:ver"], path: "/inventario", rutas: { "/items": [ITEM] } });
    const tr = await fila();
    expect(within(tr).getByRole("button", { name: "Kardex" })).toBeInTheDocument();
    expect(within(tr).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(tr).queryByRole("button", { name: "Movimiento" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nuevo ítem" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Exportar Excel" })).toBeNull();
  });

  it("cada acción aparece con su permiso", async () => {
    renderApp({ permisos: ["inventario:ver", "inventario:crear", "inventario:editar", "inventario:exportar", "movimientos:crear"], path: "/inventario", rutas: { "/items": [ITEM] } });
    const tr = await fila();
    expect(within(tr).getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(within(tr).getByRole("button", { name: "Movimiento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo ítem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeInTheDocument();
  });

  it("inactivar solo se ofrece con inventario:inactivar", async () => {
    renderApp({ permisos: ["inventario:ver", "inventario:editar"], path: "/inventario", rutas: { "/items": [ITEM] } });
    await userEvent.click(within(await fila()).getByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("dialog", { name: "Editar ítem" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inactivar ítem" })).toBeNull();
  });

  it("crea un ítem enviando los campos del formulario", async () => {
    renderApp({ permisos: ["inventario:ver", "inventario:crear"], path: "/inventario", rutas: { "/items": [] } });
    api.post.mockResolvedValue({ ...ITEM, saldo: 5 });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo ítem" }));
    await userEvent.type(screen.getByLabelText(/Nombre \/ DCI/), "Gasa estéril");
    await userEvent.type(screen.getByLabelText("Cantidad"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(api.post).toHaveBeenCalledWith("/items", expect.objectContaining({ nombre: "Gasa estéril", cantidad: 5, tipo: "MED" }));
  });
});

describe("nuevo ítem que ya existe", () => {
  it("avisa que la cantidad se sumó al existente y envía el soporte", async () => {
    renderApp({ permisos: ["inventario:ver", "inventario:crear"], path: "/inventario", rutas: { "/items": [ITEM] } });
    api.post.mockResolvedValue({ ...ITEM, saldo: 15, sumado: true, cantidadSumada: 5 });
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo ítem" }));
    await userEvent.type(screen.getByLabelText(/Nombre \/ DCI/), "Dipirona");
    await userEvent.type(screen.getByLabelText("Cantidad"), "5");
    await userEvent.type(screen.getByLabelText(/Documento soporte/), "FAC-9");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(api.post).toHaveBeenCalledWith("/items", expect.objectContaining({ nombre: "Dipirona", cantidad: 5, soporte: "FAC-9" }));
    expect(await screen.findByRole("status")).toHaveTextContent("se sumaron 5 und. a su saldo (nuevo saldo 15)");
  });
});

describe("toma física: acciones según permisos", () => {
  const CONTEO = { id: "c1", fecha: "2026-10-01", ubicacion: "UCI", estado: "abierto", ciega: true, por: { nombre: "Ana" }, resumen: { contadas: 0, lineas: 1 }, lineas: [{ id: "l1", nombre: "Dipirona", lote: "A1", serie: "", venc: "", fisico: null, obs: "" }] };

  it("el contador digita cantidades pero no ve el saldo ni puede cerrar", async () => {
    renderApp({ permisos: ["conteos:ver", "conteos:contar"], path: "/conteos", rutas: { "/conteos": [CONTEO], "/conteos/c1": CONTEO } });
    expect(screen.queryByRole("button", { name: "Nueva toma física" })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByLabelText("Físico Dipirona")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Sistema" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar conteo" })).toBeNull();
  });

  it("con solo ver la planilla es de lectura", async () => {
    renderApp({ permisos: ["conteos:ver"], path: "/conteos", rutas: { "/conteos": [CONTEO], "/conteos/c1": CONTEO } });
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    await screen.findByText(/líneas contadas/);
    expect(screen.queryByLabelText("Físico Dipirona")).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar avance" })).toBeNull();
  });
});

describe("usuarios", () => {
  const USUARIOS = [{ ...USUARIO, activo: true }, { id: "u2", username: "luis", nombre: "Luis", email: "", roles: [{ id: "r1", nombre: "Auditor" }], activo: true }];

  it("oculta crear, editar y eliminar sin esos permisos", async () => {
    renderApp({ permisos: ["usuarios:ver"], path: "/usuarios", rutas: { "/usuarios": USUARIOS } });
    await screen.findByText("luis");
    expect(screen.queryByRole("button", { name: "Nuevo usuario" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("no ofrece eliminar el propio usuario", async () => {
    renderApp({ permisos: ["usuarios:ver", "usuarios:eliminar"], path: "/usuarios", rutas: { "/usuarios": USUARIOS } });
    await screen.findByText("luis");
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(1);
    expect(within(screen.getByText("luis").closest("tr")).getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("crea un usuario con los roles marcados", async () => {
    renderApp({ permisos: ["usuarios:ver", "usuarios:crear"], path: "/usuarios", rutas: { "/usuarios": USUARIOS, "/roles": ROLES } });
    api.post.mockResolvedValue({});
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo usuario" }));
    const dlg = await screen.findByRole("dialog", { name: "Nuevo usuario" });
    await userEvent.type(within(dlg).getByLabelText("Usuario *"), "maria");
    await userEvent.type(within(dlg).getByLabelText("Nombre completo *"), "María");
    await userEvent.type(within(dlg).getByLabelText("Contraseña *"), "Clave1234");
    await userEvent.click(within(dlg).getByLabelText(/Auditor/));
    await userEvent.click(within(dlg).getByRole("button", { name: "Guardar" }));
    expect(api.post).toHaveBeenCalledWith("/usuarios", expect.objectContaining({ username: "maria", nombre: "María", password: "Clave1234", roles: ["r1"], activo: true }));
  });
});

describe("roles y matriz de permisos", () => {
  const rutas = { "/roles": ROLES, "/auth/catalogo": CATALOGO };

  it("marcar una acción marca también ver y se envía al guardar", async () => {
    renderApp({ permisos: ["roles:ver", "roles:crear"], path: "/roles", rutas });
    api.post.mockResolvedValue({});
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo rol" }));
    const dlg = await screen.findByRole("dialog", { name: "Nuevo rol" });
    await userEvent.type(within(dlg).getByLabelText("Nombre *"), "Enfermería");
    await userEvent.click(within(dlg).getByLabelText("Usuarios: Crear"));
    expect(within(dlg).getByLabelText("Usuarios: Ver")).toBeChecked();
    expect(within(dlg).queryByLabelText("Inventario: Eliminar")).toBeNull();
    await userEvent.click(within(dlg).getByRole("button", { name: "Guardar" }));
    expect(api.post).toHaveBeenCalledWith("/roles", expect.objectContaining({ nombre: "Enfermería", permisos: expect.arrayContaining(["usuarios:ver", "usuarios:crear"]) }));
  });

  it("el rol de sistema no permite cambiar permisos ni eliminarse", async () => {
    renderApp({ permisos: ["roles:ver", "roles:editar", "roles:eliminar"], path: "/roles", rutas });
    const tr = (await screen.findByText("Administrador")).closest("tr");
    expect(within(tr).queryByRole("button", { name: "Eliminar" })).toBeNull();
    await userEvent.click(within(tr).getByRole("button", { name: "Editar" }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByLabelText("Inventario: Ver")).toBeDisabled();
  });

  it("con solo ver, la matriz es de lectura", async () => {
    renderApp({ permisos: ["roles:ver"], path: "/roles", rutas });
    expect(await screen.findByText("Auditor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo rol" })).toBeNull();
    await userEvent.click(within(screen.getByText("Auditor").closest("tr")).getByRole("button", { name: "Ver" }));
    expect(within(await screen.findByRole("dialog")).getByLabelText("Inventario: Ver")).toBeDisabled();
  });
});

describe("ajustes", () => {
  it("sin ajustes:editar el formulario queda deshabilitado", async () => {
    renderApp({ permisos: ["ajustes:ver"], path: "/ajustes" });
    expect(await screen.findByText(/no modificarlos/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Semáforo rojo/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar ajustes" })).toBeNull();
  });

  it("con ajustes:editar valida y guarda", async () => {
    renderApp({ permisos: ["ajustes:ver", "ajustes:editar"], path: "/ajustes" });
    api.put.mockResolvedValue({});
    const rojo = await screen.findByLabelText(/Semáforo rojo/);
    await userEvent.clear(rojo);
    await userEvent.type(rojo, "3");
    await userEvent.click(screen.getByRole("button", { name: "Guardar ajustes" }));
    expect(api.put).toHaveBeenCalledWith("/config", expect.objectContaining({ rojoMeses: 3, servicios: ["Urgencias", "UCI"] }));
  });
});
