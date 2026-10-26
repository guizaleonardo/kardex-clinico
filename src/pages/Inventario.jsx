import { useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { SEM_L, TIPOS, fmtN, norm, semaforo } from "../lib/kardex.js";
import { exportarXlsx } from "../lib/excel.js";
import { useConfig } from "../components/ConfigContext.jsx";
import { ItemForm, KardexModal, MovForm } from "../components/kardex.jsx";
import { SemPill, TipoPill, useLoad } from "../components/ui.jsx";

export function exportInventario(items, cfg) {
  const rows = items.map((i) => ({
    Tipo: TIPOS[i.tipo] || i.tipo, "Código": i.codigo, Nombre: i.nombre, "Presentación": i.presentacion, "Registro INVIMA": i.invima, Lote: i.lote, Serie: i.serie,
    Referencia: i.referencia, Fabricante: i.fabricante, Proveedor: i.proveedor, Vencimiento: i.vencimiento, "Semáforo": SEM_L[semaforo(i, cfg)], "Ubicación": i.ubicacion,
    Saldo: i.saldo, "Stock mínimo": i.stockMin ?? "", "Costo unitario": i.costo ?? "", Valor: (i.saldo || 0) * (i.costo || 0), "Riesgo DM": i.riesgo,
    "Cadena de frío": i.cadenaFrio ? "Sí" : "No", "Control especial": i.controlEspecial ? "Sí" : "No", "Consignación": i.consignacion ? "Sí" : "No",
  }));
  exportarXlsx(`Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`, [["Inventario", rows]]);
}

export default function Inventario() {
  const cfg = useConfig();
  const { can } = useAuth();
  const { data: items, error, reload } = useLoad(() => api.get("/items"));
  const [f, setF] = useState({ q: "", tipo: "", ubic: "", sem: "", saldo: true });
  const [modal, setModal] = useState(null);

  const ubics = useMemo(() => [...new Set([...cfg.servicios, ...(items || []).map((i) => i.ubicacion).filter(Boolean)])], [cfg.servicios, items]);
  const list = useMemo(() => {
    const q = norm(f.q);
    return (items || []).filter((i) => (!f.tipo || i.tipo === f.tipo) && (!f.ubic || i.ubicacion === f.ubic) && (!f.sem || semaforo(i, cfg) === f.sem) && (!f.saldo || i.saldo !== 0)
      && (!q || norm([i.nombre, i.codigo, i.lote, i.serie, i.invima, i.referencia, i.proveedor].join(" ")).includes(q)));
  }, [items, f, cfg]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <section className="view">
      <div className="row between">
        <h2>Inventario maestro</h2>
        <div className="row">
          <Can perm="inventario:exportar"><button className="btn" onClick={() => exportInventario(list, cfg)}>Exportar Excel</button></Can>
          <Can perm="inventario:crear"><button className="btn pri" onClick={() => setModal({ t: "item" })}>Nuevo ítem</button></Can>
        </div>
      </div>
      <div className="row">
        <input aria-label="Buscar" placeholder="Buscar nombre, código, lote, serie, INVIMA…" style={{ flex: "1 1 260px" }} value={f.q} onChange={set("q")} />
        <select aria-label="Tipo" value={f.tipo} onChange={set("tipo")}><option value="">Todos los tipos</option>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Ubicación" value={f.ubic} onChange={set("ubic")}><option value="">Todas las ubicaciones</option>{ubics.map((u) => <option key={u}>{u}</option>)}</select>
        <select aria-label="Vencimiento" value={f.sem} onChange={set("sem")}><option value="">Todo vencimiento</option>{Object.entries(SEM_L).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label className="chk"><input type="checkbox" checked={f.saldo} onChange={set("saldo")} /> Solo con saldo</label>
      </div>
      {error && <div className="banner">{error}</div>}
      {!items ? <div className="empty">Cargando inventario…</div>
        : !items.length ? <div className="empty">No hay ítems todavía.</div>
        : !list.length ? <div className="empty">Ningún ítem cumple los filtros.</div>
        : <>
          <p className="small muted">{list.length} referencias · ordenadas por vencimiento (FEFO)</p>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Tipo</th><th>Producto</th><th>Código</th><th>INVIMA</th><th>Lote / serie</th><th>Vencimiento</th><th>Ubicación</th><th className="num">Saldo</th><th /></tr></thead>
            <tbody>{list.slice(0, 400).map((i) => {
              const low = i.stockMin && i.saldo < i.stockMin;
              return (
                <tr key={i.id}>
                  <td><TipoPill tipo={i.tipo} /></td>
                  <td><b>{i.nombre}</b><div className="small muted">{i.presentacion}{i.referencia ? " · Ref " + i.referencia : ""}
                    {i.controlEspecial && <> · <span className="pill p-rojo">Control especial</span></>}
                    {i.consignacion && <> · <span className="pill t-OST">Consignación</span></>}
                    {i.cadenaFrio && <> · <span className="pill t-MED">Cadena de frío</span></>}</div></td>
                  <td className="mono">{i.codigo}</td>
                  <td className="mono">{i.invima || <span className="pill p-amarillo">Falta</span>}</td>
                  <td className="mono">{i.lote}{i.serie && <><br />S: {i.serie}</>}</td>
                  <td><SemPill item={i} /></td>
                  <td className="small">{i.ubicacion}</td>
                  <td className="num"><b style={{ color: i.saldo < 0 ? "var(--bad)" : low ? "var(--warn)" : "inherit" }}>{fmtN(i.saldo)}</b>{i.stockMin ? <div className="small muted">mín {fmtN(i.stockMin)}</div> : null}</td>
                  <td><div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
                    <button className="btn sm" onClick={() => setModal({ t: "kardex", id: i.id })}>Kardex</button>
                    {can("movimientos:crear") && <button className="btn sm" onClick={() => setModal({ t: "mov", item: i })}>Movimiento</button>}
                    {can("inventario:editar") && <button className="btn sm" onClick={() => setModal({ t: "item", item: i })}>Editar</button>}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </>}
      {modal?.t === "item" && <ItemForm item={modal.item} items={items || []} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.t === "mov" && <MovForm item={modal.item} items={items || []} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.t === "kardex" && <KardexModal itemId={modal.id} onClose={() => setModal(null)} onMovimiento={(it) => setModal({ t: "mov", item: it })} />}
    </section>
  );
}
