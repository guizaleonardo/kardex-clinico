export const TIPOS = { MED: "Medicamento", DM: "Dispositivo médico", INS: "Insumo", OST: "Osteosíntesis / implante" };

export const MOV = {
  ENT: { l: "Entrada (compra / remisión)", s: 1 },
  DEV_IN: { l: "Devolución desde servicio", s: 1 },
  AJ_POS: { l: "Ajuste positivo (acta)", s: 1 },
  SAL: { l: "Salida / dispensación a servicio", s: -1 },
  USO: { l: "Uso en paciente / implantado", s: -1 },
  DEV_PROV: { l: "Devolución a proveedor / casa comercial", s: -1 },
  BAJA: { l: "Baja (vencido, averiado, alerta sanitaria)", s: -1 },
  AJ_NEG: { l: "Ajuste negativo (acta)", s: -1 },
};

export const SEM_L = { vencido: "Vencido", rojo: "Rojo", amarillo: "Amarillo", verde: "Verde", sin: "Sin fecha" };

export const FIELDS = [
  ["tipo", "Tipo"], ["codigo", "Código interno"], ["nombre", "Nombre / DCI / descripción"], ["presentacion", "Presentación / concentración / forma"],
  ["invima", "Registro sanitario INVIMA"], ["lote", "Lote"], ["serie", "Serie"], ["referencia", "Referencia / modelo"], ["fabricante", "Fabricante / titular"],
  ["proveedor", "Proveedor / casa comercial"], ["vencimiento", "Fecha de vencimiento"], ["cantidad", "Cantidad"], ["costo", "Costo unitario"],
  ["ubicacion", "Ubicación / servicio"], ["stockMin", "Stock mínimo"], ["riesgo", "Clasificación de riesgo (DM)"], ["cadenaFrio", "Cadena de frío"],
  ["controlEspecial", "Control especial"], ["consignacion", "En consignación"],
];
export const BOOL_FIELDS = ["cadenaFrio", "controlEspecial", "consignacion"];
export const NUM_FIELDS = ["cantidad", "costo", "stockMin"];

export const NORMAS = [
  ["Resolución 1403 de 2007 (MinProtección)", "Modelo de gestión del servicio farmacéutico y Manual de condiciones esenciales y procedimientos: recepción técnica, almacenamiento, control de existencias, control de fechas de vencimiento y medicamentos de control especial.", "Maestro por lote, kardex por movimiento, semáforo de vencimiento, toma física con acta y ajustes soportados."],
  ["Resolución 3100 de 2019 (MinSalud)", "Estándar de habilitación de Medicamentos, dispositivos médicos e insumos: registros con lote, fecha de vencimiento, registro sanitario y, para dispositivos, marca, serie o referencia; trazabilidad y seguimiento al uso.", "Campos obligatorios validados al cargar Excel; alertas de registros incompletos; trazabilidad hasta paciente para implantes."],
  ["Decreto 780 de 2016 (DUR Salud)", "Compila el Decreto 2200 de 2005 sobre servicio farmacéutico y sus procesos.", "Soporte general del modelo de gestión aplicado."],
  ["Decreto 4725 de 2005", "Régimen de registros sanitarios y vigilancia sanitaria de dispositivos médicos; clasificación por riesgo I, IIa, IIb y III.", "Campo de clasificación de riesgo y exigencia de registro INVIMA y serie para dispositivos de mayor riesgo."],
  ["Resolución 4816 de 2008 (MinProtección)", "Programa Nacional de Tecnovigilancia: identificar el dispositivo y el paciente expuesto ante un evento o incidente adverso.", "El movimiento “Uso en paciente” exige historia clínica para implantes/osteosíntesis."],
  ["Resolución 2535 de 2013 y Resolución 1405 de 2022 (MinSalud)", "Estándar semántico y codificación de dispositivos médicos e insumos para garantizar su trazabilidad en toda la cadena, incluido el uso y la disposición final.", "Campos de código y referencia homologables al estándar semántico."],
  ["Resolución 1478 de 2006 (MinProtección)", "Control, seguimiento y vigilancia de sustancias sometidas a fiscalización y medicamentos de control especial. Verifique la vigencia y modificaciones posteriores antes de citarla en documentos.", "Marca de control especial: cualquier diferencia en conteo se clasifica como crítica."],
];

export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const fmtN = (n) => (Number(n) || 0).toLocaleString("es-CO");
export const fmt$ = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
export const today = () => new Date().toISOString().slice(0, 10);
export function fmtD(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
}
export function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function semaforo(it, cfg = { rojoMeses: 6, amarilloMeses: 12 }, hoy = today()) {
  if (!it?.vencimiento) return "sin";
  const d = (new Date(it.vencimiento + "T00:00:00Z") - new Date(hoy + "T00:00:00Z")) / 86400000;
  if (d < 0) return "vencido";
  if (d < cfg.rojoMeses * 30.44) return "rojo";
  if (d < cfg.amarilloMeses * 30.44) return "amarillo";
  return "verde";
}

export const itemLabel = (it) => it ? `${it.nombre}${it.presentacion ? " · " + it.presentacion : ""} — Lote ${it.lote || "s/l"}${it.serie ? " · Serie " + it.serie : ""} · ${it.ubicacion || ""}` : "(ítem eliminado)";

/** Documentos que exige cada tipo de movimiento (se muestran antes de registrar). */
export function requisitosMovimiento(tipo, item) {
  const r = [];
  if (tipo === "ENT" || tipo === "DEV_PROV") r.push("documento soporte");
  if (tipo === "SAL") r.push("servicio destino");
  if (tipo === "USO" && item?.tipo === "OST") r.push("historia clínica (tecnovigilancia)");
  if (["AJ_NEG", "AJ_POS", "BAJA"].includes(tipo)) r.push("documento soporte (acta) y motivo");
  return r;
}
