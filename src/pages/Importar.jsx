import { useState } from "react";
import { api } from "../api/client.js";
import { Can } from "../auth/guards.jsx";
import { FIELDS, TIPOS, fmtN, fmtTs } from "../lib/kardex.js";
import { exportarXlsx, guessMap, leerArchivo, rowsFromMatrix } from "../lib/excel.js";
import { useConfig } from "../components/ConfigContext.jsx";
import { useLoad, useToast } from "../components/ui.jsx";

const PLANTILLA = [{ Tipo: "Medicamento", Codigo: "", Nombre: "", Presentacion: "", Registro_INVIMA: "", Lote: "", Serie: "", Referencia: "", Fabricante: "", Proveedor: "", Vencimiento: "AAAA-MM-DD", Cantidad: "", Costo_unitario: "", Ubicacion: "", Stock_minimo: "", Riesgo_DM: "I / IIa / IIb / III", Cadena_frio: "Sí / No", Control_especial: "Sí / No", Consignacion: "Sí / No" }];

export default function Importar() {
  const cfg = useConfig();
  const toast = useToast();
  const { data: hist, reload } = useLoad(() => api.get("/importar/historial"));
  const [imp, setImp] = useState(null);
  const [busy, setBusy] = useState(false);

  async function elegir(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { headers, rows } = await leerArchivo(file);
      if (!headers.length) return toast("El archivo está vacío.");
      setImp({ file: file.name, headers, raw: rows, map: guessMap(headers), destino: "maestro", defTipo: "MED", defUbic: cfg.servicios[0], soporte: "" });
    } catch { toast("No se pudo leer el archivo."); }
  }

  const filas = imp ? rowsFromMatrix(imp.raw, imp.map, imp) : [];
  const validas = filas.filter((r) => r._valida);
  const set = (k) => (e) => setImp({ ...imp, [k]: e.target.value });

  async function ejecutar() {
    setBusy(true);
    try {
      const r = await api.post("/importar", {
        archivo: imp.file, destino: imp.destino, soporte: imp.soporte,
        filas: validas.map(({ _fila, _avisos, _valida, ...o }) => o),
      });
      toast(`Carga lista: ${r.creados} ítems creados, ${r.entradas} entradas, ${r.omitidos} omitidos.`, 6000);
      setImp(null);
      reload();
    } catch (e) { toast(e.message); }
    setBusy(false);
  }

  return (
    <section className="view">
      <h2>Importar Excel</h2>
      <div className="panel">
        <h3>Archivo Excel o CSV</h3>
        <p className="small muted">Su inventario actual, un reporte del sistema o la remisión de una casa comercial. Se reconocen las columnas y se validan lote, vencimiento e INVIMA antes de cargar.</p>
        <div className="row" style={{ marginTop: 6 }}>
          <Can perm="importar:ejecutar"><label className="btn pri">Elegir archivo<input type="file" accept=".xlsx,.xls,.csv,.ods" hidden onChange={elegir} /></label></Can>
          <button className="btn" onClick={() => exportarXlsx("Plantilla_inventario.xlsx", [["Inventario", PLANTILLA]])}>Descargar plantilla</button>
        </div>
      </div>

      {imp && (
        <div className="panel">
          <div className="row between"><h3>{imp.file}</h3><button className="btn sm" onClick={() => setImp(null)}>Descartar</button></div>
          <div className="form" style={{ marginTop: 8 }}>
            <label className="f">Destino<select value={imp.destino} onChange={set("destino")}><option value="maestro">Crear ítems en el maestro (saldo inicial)</option><option value="entrada">Registrar entradas (remisión / factura)</option></select></label>
            {imp.destino === "entrada" && <label className="f">Documento soporte *<input value={imp.soporte} onChange={set("soporte")} placeholder="Remisión o factura" /></label>}
            <label className="f">Tipo por defecto<select value={imp.defTipo} onChange={set("defTipo")}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="f">Ubicación por defecto<select value={imp.defUbic} onChange={set("defUbic")}>{cfg.servicios.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <h3 style={{ marginTop: 14 }}>Columnas</h3>
          <div className="form">
            {FIELDS.map(([k, l]) => (
              <label key={k} className="f">{l}
                <select value={imp.map[k] ?? ""} onChange={(e) => { const m = { ...imp.map }; if (e.target.value === "") delete m[k]; else m[k] = Number(e.target.value); setImp({ ...imp, map: m }); }}>
                  <option value="">— No cargar —</option>{imp.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>{filas.length} filas · {validas.length} válidas · {filas.filter((r) => r._avisos.length).length} con advertencias</p>
          <div className="tbl-wrap" style={{ maxHeight: 360 }}><table>
            <thead><tr><th>Fila</th><th>Tipo</th><th>Nombre</th><th>Lote</th><th>Vence</th><th>INVIMA</th><th className="num">Cant.</th><th>Advertencias</th></tr></thead>
            <tbody>{filas.slice(0, 200).map((r) => (
              <tr key={r._fila}><td>{r._fila}</td><td>{r.tipo}</td><td>{r.nombre || <span className="pill p-rojo">Falta</span>}</td><td className="mono">{r.lote}</td><td>{r.vencimiento}</td><td className="mono">{r.invima}</td><td className="num">{fmtN(r.cantidad)}</td>
                <td className="small">{r._avisos.join(", ")}</td></tr>
            ))}</tbody>
          </table></div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
            <button className="btn pri" disabled={busy || !validas.length || (imp.destino === "entrada" && !imp.soporte.trim())} onClick={ejecutar}>Cargar {validas.length} filas</button>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Historial de cargas</h3>
        {hist?.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Fecha</th><th>Archivo</th><th>Destino</th><th className="num">Filas</th><th className="num">Creados</th><th className="num">Entradas</th><th className="num">Omitidos</th><th>Usuario</th></tr></thead>
            <tbody>{hist.map((h) => <tr key={h.id}><td className="small">{fmtTs(h.ts)}</td><td className="small">{h.archivo}</td><td>{h.destino}</td><td className="num">{fmtN(h.filas)}</td><td className="num">{fmtN(h.creados)}</td><td className="num">{fmtN(h.entradas)}</td><td className="num" title={h.errores?.join("\n")}>{fmtN(h.omitidos)}</td><td className="small">{h.por?.nombre}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="small muted">Sin cargas registradas.</p>}
      </div>
    </section>
  );
}
