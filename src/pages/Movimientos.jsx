import { useState } from "react";
import { api, qs } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { MOV, fmtTs } from "../lib/kardex.js";
import { exportarXlsx } from "../lib/excel.js";
import { MovForm, MovTable } from "../components/kardex.jsx";
import { useLoad } from "../components/ui.jsx";

export default function Movimientos() {
  const { can } = useAuth();
  const [f, setF] = useState({ tipo: "", q: "", desde: "", hasta: "" });
  const { data: movs, error, reload } = useLoad(() => api.get("/movimientos" + qs({ ...f, limit: 1000 })), [f.tipo, f.q, f.desde, f.hasta]);
  const [items, setItems] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function abrirForm() {
    if (can("movimientos:crear")) setItems(await api.get("/items"));
  }
  function exportar() {
    const rows = (movs || []).map((m) => ({ Fecha: fmtTs(m.ts), Movimiento: MOV[m.tipo]?.l || m.tipo, Producto: m.itemNombre, Lote: m.lote, Serie: m.serie, "Ubicación": m.ubicacion,
      Cantidad: m.signo * m.cantidad, "Saldo anterior": m.saldoAntes, "Saldo nuevo": m.saldoDespues, Soporte: m.soporte, Destino: m.destino, "HC paciente": m.paciente, Motivo: m.motivo, Usuario: m.por?.nombre }));
    exportarXlsx(`Kardex_${new Date().toISOString().slice(0, 10)}.xlsx`, [["Movimientos", rows]]);
  }

  return (
    <section className="view">
      <div className="row between">
        <h2>Movimientos (kardex general)</h2>
        <div className="row">
          <Can perm="movimientos:exportar"><button className="btn" onClick={exportar}>Exportar Excel</button></Can>
          <Can perm="movimientos:crear"><button className="btn pri" onClick={abrirForm}>Registrar movimiento</button></Can>
        </div>
      </div>
      <div className="row">
        <input aria-label="Buscar" placeholder="Producto, lote, soporte, HC…" style={{ flex: "1 1 220px" }} value={f.q} onChange={set("q")} />
        <select aria-label="Tipo" value={f.tipo} onChange={set("tipo")}><option value="">Todos</option>{Object.entries(MOV).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
        <label className="f">Desde<input type="date" value={f.desde} onChange={set("desde")} /></label>
        <label className="f">Hasta<input type="date" value={f.hasta} onChange={set("hasta")} /></label>
      </div>
      <p className="small muted">Los movimientos no se editan ni se eliminan: un error se corrige con un ajuste soportado.</p>
      {error ? <div className="banner">{error}</div> : !movs ? <div className="empty">Cargando…</div> : <MovTable list={movs.slice(0, 300)} />}
      {items && <MovForm items={items} onClose={() => setItems(null)} onSaved={reload} />}
    </section>
  );
}
