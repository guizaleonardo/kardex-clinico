import * as XLSX from "xlsx";
import { FIELDS, TIPOS, norm } from "./kardex.js";

/* Sinónimos de encabezados para reconocer columnas de archivos de distintas fuentes. */
export const SYN = {
  tipo: ["tipo", "clase", "categoria", "grupo", "familia"], codigo: ["codigo", "cod", "codigointerno", "cum", "codigoproducto", "item", "sku", "plu"],
  nombre: ["nombre", "descripcion", "producto", "dci", "principioactivo", "medicamento", "articulo", "denominacion", "nombregenerico", "insumo", "dispositivo"],
  presentacion: ["presentacion", "concentracion", "forma", "formafarmaceutica", "unidad", "um", "unidadmedida"],
  invima: ["invima", "registro", "registrosanitario", "rs", "registroinvima", "regsanitario"], lote: ["lote", "nolote", "numerolote", "batch", "lot"],
  serie: ["serie", "serial", "noserie", "numeroserie", "sn"], referencia: ["referencia", "ref", "modelo", "codigoreferencia"],
  fabricante: ["fabricante", "laboratorio", "titular", "marca"], proveedor: ["proveedor", "casacomercial", "distribuidor", "casa"],
  vencimiento: ["vencimiento", "fechavencimiento", "fvence", "fv", "caducidad", "expira", "expiracion", "fechadevencimiento", "venc"],
  cantidad: ["cantidad", "cant", "existencia", "existencias", "saldo", "stock", "unidades", "conteo", "fisico", "cantidadfisica"],
  costo: ["costo", "costounitario", "valorunitario", "precio", "vrunitario", "valor"], ubicacion: ["ubicacion", "servicio", "bodega", "area", "almacen", "sede"],
  stockMin: ["stockmin", "stockminimo", "minimo", "min"], riesgo: ["riesgo", "clasificacionriesgo", "claseriesgo", "riesgodm"],
  cadenaFrio: ["cadenafrio", "refrigerado", "frio"], controlEspecial: ["controlespecial", "control", "fne"], consignacion: ["consignacion", "consignado"],
};

/** Asigna cada campo a un índice de columna: primero coincidencia exacta, luego parcial. */
export function guessMap(headers) {
  const map = {};
  const used = new Set();
  for (const [k] of FIELDS) {
    const syn = SYN[k].map(norm);
    let best = -1;
    headers.forEach((h, i) => { if (best < 0 && !used.has(i) && syn.includes(norm(h))) best = i; });
    if (best < 0) headers.forEach((h, i) => { const n = norm(h); if (best < 0 && !used.has(i) && n && syn.some((s) => s.length > 3 && n.includes(s))) best = i; });
    if (best >= 0) { map[k] = best; used.add(best); }
  }
  return map;
}

export function parseBool(v) {
  return ["si", "x", "1", "true", "yes", "s", "verdadero"].includes(norm(v));
}

export function parseNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/\$/g, "").replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const pad = (n) => String(n).padStart(2, "0");
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Acepta fechas de Excel (serial), ISO, DD/MM/AAAA y mes/año (toma el último día del mes). */
export function parseDate(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) return `${m[2]}-${pad(m[1])}-${pad(lastDay(+m[2], +m[1]))}`;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/))) return `${m[1]}-${pad(m[2])}-${pad(lastDay(+m[1], +m[2]))}`;
  return "";
}

export function parseTipo(v, def = "MED") {
  const s = norm(v);
  if (!s) return def;
  if (s.includes("osteo") || s.includes("implant") || s === "ost") return "OST";
  if (s.includes("med") && !s.includes("dispositivo")) return "MED";
  if (s.includes("disp") || s === "dm") return "DM";
  if (s.includes("ins")) return "INS";
  return TIPOS[String(v).toUpperCase()] ? String(v).toUpperCase() : def;
}

/** Convierte filas crudas en ítems listos para enviar al backend, con advertencias por fila. */
export function rowsFromMatrix(rows, map, { defTipo = "MED", defUbic = "" } = {}) {
  const get = (r, k) => (map[k] === undefined ? "" : r[map[k]]);
  return rows
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((r, i) => {
      const o = {
        _fila: i + 2,
        tipo: parseTipo(get(r, "tipo"), defTipo),
        vencimiento: parseDate(get(r, "vencimiento")),
        cantidad: parseNum(get(r, "cantidad")) ?? 0,
        costo: parseNum(get(r, "costo")),
        stockMin: parseNum(get(r, "stockMin")),
        cadenaFrio: parseBool(get(r, "cadenaFrio")),
        controlEspecial: parseBool(get(r, "controlEspecial")),
        consignacion: parseBool(get(r, "consignacion")),
      };
      for (const k of ["codigo", "nombre", "presentacion", "invima", "lote", "serie", "referencia", "fabricante", "proveedor", "ubicacion", "riesgo"]) o[k] = String(get(r, k) ?? "").trim();
      if (!o.ubicacion) o.ubicacion = defUbic;
      if (!["", "I", "IIa", "IIb", "III"].includes(o.riesgo)) o.riesgo = "";
      const avisos = [];
      if (!o.nombre) avisos.push("sin nombre");
      if (!o.lote && !o.serie) avisos.push("sin lote ni serie");
      if (!o.vencimiento && (o.tipo === "MED" || o.tipo === "INS")) avisos.push("sin vencimiento");
      if (!o.invima) avisos.push("sin INVIMA");
      o._avisos = avisos;
      o._valida = Boolean(o.nombre);
      return o;
    });
}

export async function leerArchivo(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const m = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  const headers = (m[0] || []).map(String);
  return { headers, rows: m.slice(1) };
}

export function exportarXlsx(nombre, hojas) {
  const wb = XLSX.utils.book_new();
  for (const [n, rows] of hojas) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Sin datos": "" }]), n.slice(0, 31));
  XLSX.writeFile(wb, nombre);
}
