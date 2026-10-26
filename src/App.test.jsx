import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api, tokenStore } from "./api/client.js";
import { USUARIO, renderApp } from "./test/utils.jsx";

const PANEL = { kpis: { referencias: 0 }, porTipo: [], alertas: [], ultimosMovimientos: [] };

describe("control de acceso por pantalla", () => {
  it("sin sesión muestra el login", async () => {
    renderApp({ sesion: false });
    expect(await screen.findByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });

  it("el menú solo muestra las pantallas permitidas", async () => {
    renderApp({ permisos: ["movimientos:ver", "normas:ver"], path: "/normas" });
    const nav = await screen.findByRole("navigation", { name: "Pantallas" });
    const tabs = within(nav).getAllByRole("link").map((a) => a.textContent);
    expect(tabs).toEqual(["Movimientos", "Marco normativo"]);
    expect(screen.getByText(USUARIO.nombre, { exact: false })).toBeInTheDocument();
  });

  it("la raíz redirige a la primera pantalla permitida", async () => {
    renderApp({ permisos: ["normas:ver"], path: "/" });
    expect(await screen.findByRole("heading", { name: "Marco normativo aplicado" })).toBeInTheDocument();
  });

  it("entrar por URL a una pantalla sin permiso muestra sin acceso", async () => {
    renderApp({ permisos: ["normas:ver"], path: "/usuarios" });
    expect(await screen.findByText(/no tiene permiso para ver esta pantalla/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/usuarios");
  });

  it("abre la pantalla cuando tiene permiso de ver", async () => {
    renderApp({ permisos: ["panel:ver"], path: "/panel", rutas: { "/panel": PANEL } });
    expect(await screen.findByText("Empiece por cargar su inventario")).toBeInTheDocument();
  });

  it("cerrar sesión borra el token y vuelve al login", async () => {
    renderApp({ permisos: ["normas:ver"], path: "/normas" });
    await userEvent.click(await screen.findByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("button", { name: "Ingresar" })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});

describe("login", () => {
  it("ingresa y navega a la primera pantalla permitida", async () => {
    renderApp({ sesion: false, rutas: { "/panel": PANEL } });
    api.post.mockResolvedValue({ token: "t1", usuario: USUARIO, permisos: ["panel:ver"] });
    await userEvent.type(await screen.findByLabelText("Usuario"), "ana");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Clave1234");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(api.post).toHaveBeenCalledWith("/auth/login", { username: "ana", password: "Clave1234" });
    expect(await screen.findByText("Empiece por cargar su inventario")).toBeInTheDocument();
    expect(tokenStore.get()).toBe("t1");
  });

  it("el botón del ojo muestra y oculta la contraseña", async () => {
    renderApp({ sesion: false });
    const clave = await screen.findByLabelText("Contraseña");
    await userEvent.type(clave, "Secreta1");
    expect(clave).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(clave).toHaveAttribute("type", "text");
    expect(clave).toHaveValue("Secreta1");
    const ocultar = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(ocultar).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(ocultar);
    expect(clave).toHaveAttribute("type", "password");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor", async () => {
    renderApp({ sesion: false });
    api.post.mockRejectedValue(new Error("Usuario o contraseña incorrectos"));
    await userEvent.type(await screen.findByLabelText("Usuario"), "ana");
    await userEvent.type(screen.getByLabelText("Contraseña"), "mala");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Usuario o contraseña incorrectos"));
  });
});
