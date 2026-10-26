import { describe, expect, it } from "vitest";
import { guessMap, parseBool, parseDate, parseNum, parseTipo, rowsFromMatrix } from "./excel.js";
import { fmtD, requisitosMovimiento, semaforo } from "./kardex.js";

describe("parseDate", () => {
  it.each([
    ["2026-03-05", "2026-03-05"],
    ["05/03/2026", "2026-03-05"],
    ["5-3-26", "2026-03-05"],
    ["02/2026", "2026-02-28"],
    ["2024/02", "2024-02-29"],
    [46086, "2026-03-05"],
    ["", ""],
    ["no es fecha", ""],
  ])("%s → %s", (v, r) => expect(parseDate(v)).toBe(r));
});

describe("parseNum", () => {
  it("entiende formatos colombianos y de Excel", () => {
    expect(parseNum("$ 1.250.000,50")).toBe(1250000.5);
    expect(parseNum("12,5")).toBe(12.5);
    expect(parseNum(7)).toBe(7);
    expect(parseNum("")).toBeNull();
    expect(parseNum("abc")).toBeNull();
  });
});

describe("parseBool y parseTipo", () => {
  it("reconoce sí/no", () => {
    expect(parseBool("Sí")).toBe(true);
    expect(parseBool("x")).toBe(true);
    expect(parseBool("No")).toBe(false);
  });
  it("clasifica el tipo", () => {
    expect(parseTipo("Osteosíntesis")).toBe("OST");
    expect(parseTipo("Medicamento")).toBe("MED");
    expect(parseTipo("Dispositivo médico")).toBe("DM");
    expect(parseTipo("insumo")).toBe("INS");
    expect(parseTipo("", "INS")).toBe("INS");
  });
});

describe("guessMap y rowsFromMatrix", () => {
  const headers = ["Descripción", "No. Lote", "Fecha Vencimiento", "Existencia", "Registro INVIMA", "Observación"];
  it("asigna columnas por sinónimos y no repite columnas", () => {
    const m = guessMap(headers);
    expect(m).toMatchObject({ nombre: 0, lote: 1, vencimiento: 2, cantidad: 3, invima: 4 });
    expect(new Set(Object.values(m)).size).toBe(Object.values(m).length);
  });
  it("convierte filas, omite vacías y marca advertencias", () => {
    const rows = [["Dipirona", "A1", "31/12/2027", "1.200", "INV-1", ""], ["", "", "", "", "", ""], ["", "B2", "", 3, "", ""]];
    const r = rowsFromMatrix(rows, guessMap(headers), { defUbic: "UCI" });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ nombre: "Dipirona", lote: "A1", vencimiento: "2027-12-31", cantidad: 1200, ubicacion: "UCI", _valida: true, _avisos: [] });
    expect(r[1]._valida).toBe(false);
    expect(r[1]._avisos).toEqual(expect.arrayContaining(["sin nombre", "sin vencimiento", "sin INVIMA"]));
  });
});

describe("kardex", () => {
  it("semáforo de vencimiento", () => {
    const hoy = "2026-01-01";
    expect(semaforo({ vencimiento: "2025-12-01" }, undefined, hoy)).toBe("vencido");
    expect(semaforo({ vencimiento: "2026-04-01" }, undefined, hoy)).toBe("rojo");
    expect(semaforo({ vencimiento: "2026-09-01" }, undefined, hoy)).toBe("amarillo");
    expect(semaforo({ vencimiento: "2028-01-01" }, undefined, hoy)).toBe("verde");
    expect(semaforo({}, undefined, hoy)).toBe("sin");
  });
  it("formatea fechas", () => {
    expect(fmtD("2026-03-05")).toBe("05/03/2026");
    expect(fmtD("")).toBe("—");
  });
  it("lista requisitos por tipo de movimiento", () => {
    expect(requisitosMovimiento("SAL")).toEqual(["servicio destino"]);
    expect(requisitosMovimiento("USO", { tipo: "OST" })).toEqual(["historia clínica (tecnovigilancia)"]);
    expect(requisitosMovimiento("USO", { tipo: "MED" })).toEqual([]);
  });
});
