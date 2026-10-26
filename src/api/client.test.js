import { afterEach, describe, expect, it, vi } from "vitest";

// setup.js simula este módulo para el resto de pruebas; aquí se prueba el real.
const { api, ApiError, qs, setUnauthorizedHandler, tokenStore } = await vi.importActual("./client.js");

const respuesta = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe("cliente HTTP", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envía el token Bearer y el cuerpo JSON", async () => {
    const fetch = vi.fn(() => respuesta(200, { ok: 1 }));
    vi.stubGlobal("fetch", fetch);
    tokenStore.set("abc");
    expect(await api.post("/items", { nombre: "x" })).toEqual({ ok: 1 });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/items$/);
    expect(opts.headers.Authorization).toBe("Bearer abc");
    expect(JSON.parse(opts.body)).toEqual({ nombre: "x" });
  });

  it("convierte errores del servidor en ApiError con su mensaje", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(403, { error: "No tiene permiso para esta acción" })));
    await expect(api.get("/usuarios")).rejects.toMatchObject({ status: 403, message: "No tiene permiso para esta acción" });
  });

  it("un 401 con sesión activa dispara el cierre de sesión", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn(() => respuesta(401, { error: "Sesión vencida" })));
    tokenStore.set("viejo");
    await expect(api.get("/items")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("informa la falta de conexión", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("fail"))));
    await expect(api.get("/x")).rejects.toMatchObject({ status: 0 });
  });

  it("204 devuelve null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(204)));
    expect(await api.del("/roles/1")).toBeNull();
  });

  it("qs omite valores vacíos", () => {
    expect(qs({ tipo: "ENT", q: "", desde: null })).toBe("?tipo=ENT");
    expect(qs({})).toBe("");
  });
});
