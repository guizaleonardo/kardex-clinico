import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { TIPOS, fmt$, fmtD, fmtN, fmtTs, norm, today } from "../lib/kardex.js";
import { exportarXlsx } from "../lib/excel.js";
import { useConfig } from "../components/ConfigContext.jsx";
import { Kpi, Modal, useLoad, useToast } from "../components/ui.jsx";

function NuevaToma({ onClose, onCreated }) {
  const cfg = useConfig();
  const toast = useToast();
  const [f, setF] = useState({ fecha: today(), ubicacion: "", tipo: "", testigo: "", ciega: true });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  async function crear() {
    try { const c = await api.post("/conteos", f); toast(`Planilla creada con ${c.lineas.length} líneas`); onCreated(c.id); }
    catch (e) { toast(e.message); }
  }
  return (
    <Modal title="Nueva toma física" onClose={onClose}>
      <div className="form">
        <label className="f">Fecha<input type="date" value={f.fecha} onChange={set("fecha")} /></label>
        <label className="f">Ubicación<select value={f.ubicacion} onChange={set("ubicacion")}><option value="">Todas</option>{cfg.servicios.map((u) => <option key={u}>{u}</option>)}</select></label>
        <label className="f">Tipo<select value={f.tipo} onChange={set("tipo")}><option value="">Todos</option>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="f">Testigo (nombre y cargo)<input placeholder="Persona de otra área" value={f.testigo} onChange={set("testigo")} /></label>
        <label className="chk wide"><input type="checkbox" checked={f.ciega} onChange={set("ciega")} /> Conteo a ciegas (oculta el saldo del sistema hasta cerrar)</label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={crear}>Crear planilla</button></div>
    </Modal>
  );
}

function Editor({ id, onBack }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data: c, reload } = useLoad(() => api.get(`/conteos/${id}`), [id]);
  const [draft, setDraft] = useState({});
  const [filtro, setFiltro] = useState({ q: "", dif: false });
  const [modal, setModal] = useState(null);
  const [acta, setActa] = useState({ testigo: "", acta: "", motivo: "" });
  if (!c) return <div className="empty">Cargando planilla…</div>;

  const cerrado = c.estado === "cerrado";
  const ciega = c.ciega && !cerrado;
  const editable = !cerrado && can("conteos:contar");
  const linea = (l) => ({ ...l, ...draft[l.id] });
  const sucio = Object.keys(draft).length > 0;
  const lineas = c.lineas.map(linea).filter((l) => (!filtro.q || norm(`${l.nombre} ${l.lote} ${l.serie}`).includes(norm(filtro.q)))
    && (!filtro.dif || l.fisico == null || (l.sistema !== undefined && l.fisico !== l.sistema)));

  async function guardar() {
    if (!sucio) return;
    try {
      await api.put(`/conteos/${id}/lineas`, { lineas: Object.entries(draft).map(([lid, v]) => ({ id: lid, ...v })) });
      setDraft({}); toast("Avance guardado"); reload();
    } catch (e) { toast(e.message); }
  }
  async function cerrar() {
    try {
      if (sucio) await api.put(`/conteos/${id}/lineas`, { lineas: Object.entries(draft).map(([lid, v]) => ({ id: lid, ...v })) });
      await api.post(`/conteos/${id}/cerrar`, { testigo: acta.testigo || c.testigo });
      setDraft({}); setModal(null); toast("Conteo cerrado. Revise las diferencias."); reload();
    } catch (e) { toast(e.message); }
  }
  async function ajustar() {
    try {
      const r = await api.post(`/conteos/${id}/ajustar`, { acta: acta.acta, motivo: acta.motivo || `Ajuste por toma física del ${fmtD(c.fecha)}` });
      setModal(null); toast(r.errores.length ? `${r.errores.length} ajustes fallaron: ${r.errores[0]}` : `${r.aplicados} ajustes aplicados al kardex`); reload();
    } catch (e) { toast(e.message); }
  }
  function exportar() {
    const rows = c.lineas.map((l) => ({ Producto: l.nombre, Lote: l.lote, Serie: l.serie, Vencimiento: l.venc, "Saldo sistema": l.sistema, "Conteo físico": l.fisico ?? "No contado", Diferencia: l.fisico == null ? "" : l.fisico - l.sistema, "Observación": l.obs }));
    const cab = [{ Campo: "Fecha", Valor: c.fecha }, { Campo: "Ubicación", Valor: c.ubicacion || "Todas" }, { Campo: "Responsable", Valor: c.por?.nombre }, { Campo: "Testigo", Valor: c.testigo }, { Campo: "Cerrado", Valor: fmtTs(c.cerradoTs) }, { Campo: "Ajuste aplicado", Valor: c.ajustado ? "Sí · " + c.actaAjuste : "No" }];
    exportarXlsx(`Acta_toma_fisica_${c.fecha}.xlsx`, [["Acta", cab], ["Detalle", rows]]);
  }
  const setL = (lid, k, v) => setDraft({ ...draft, [lid]: { ...draft[lid], [k]: v } });

  return (
    <section className="view">
      <div className="row between">
        <div>
          <button className="btn sm" onClick={async () => { await guardar(); onBack(); }}>← Tomas físicas</button>
          <h2 style={{ marginTop: 8 }}>Toma física {fmtD(c.fecha)} · {c.ubicacion || "Todas las ubicaciones"}</h2>
          <div className="small muted">Responsable {c.por?.nombre}{c.testigo ? " · Testigo " + c.testigo : ""} · {ciega ? "Conteo a ciegas" : "Saldo visible"} · {c.resumen.contadas}/{c.resumen.lineas} líneas contadas</div>
        </div>
        <div className="row">
          {cerrado ? <>
            <Can perm="conteos:exportar"><button className="btn" onClick={exportar}>Exportar acta Excel</button></Can>
            {!c.ajustado && <Can perm="conteos:ajustar"><button className="btn pri" onClick={() => setModal("ajustar")}>Aplicar ajustes al kardex</button></Can>}
          </> : <>
            {editable && <button className="btn" disabled={!sucio} onClick={guardar}>Guardar avance</button>}
            <Can perm="conteos:cerrar"><button className="btn pri" onClick={() => { setActa({ ...acta, testigo: c.testigo }); setModal("cerrar"); }}>Cerrar conteo</button></Can>
          </>}
        </div>
      </div>
      {cerrado && <div className="grid kpis">
        <Kpi lab="Faltante" val={fmtN(c.resumen.faltante)} sub={c.resumen.valorFaltante ? fmt$(c.resumen.valorFaltante) : ""} tone={c.resumen.faltante ? "bad" : ""} />
        <Kpi lab="Cerrado por" val={<span style={{ fontSize: 16 }}>{c.cerradoPor?.nombre}</span>} sub={fmtTs(c.cerradoTs)} />
        <Kpi lab="Ajuste" val={<span style={{ fontSize: 16 }}>{c.ajustado ? "Aplicado" : "Pendiente"}</span>} sub={c.ajustado ? "acta " + c.actaAjuste : "requiere acta"} />
      </div>}
      <div className="row">
        <input aria-label="Filtrar líneas" placeholder="Filtrar líneas…" style={{ flex: "1 1 220px" }} value={filtro.q} onChange={(e) => setFiltro({ ...filtro, q: e.target.value })} />
        <label className="chk"><input type="checkbox" checked={filtro.dif} onChange={(e) => setFiltro({ ...filtro, dif: e.target.checked })} /> Solo diferencias o pendientes</label>
      </div>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Producto</th><th>Lote / serie</th><th>Venc.</th>{!ciega && <th className="num">Sistema</th>}<th className="num">Físico</th>{!ciega && <th className="num">Diferencia</th>}<th>Observación</th></tr></thead>
        <tbody>{lineas.slice(0, 600).map((l) => {
          const d = l.fisico == null || ciega ? null : l.fisico - l.sistema;
          return (
            <tr key={l.id}>
              <td>{l.nombre}</td><td className="mono">{l.lote}{l.serie ? " / " + l.serie : ""}</td><td className="small">{fmtD(l.venc)}</td>
              {!ciega && <td className="num">{fmtN(l.sistema)}</td>}
              <td className="num">{editable
                ? <input type="number" min="0" step="any" aria-label={`Físico ${l.nombre}`} value={l.fisico ?? ""} onChange={(e) => setL(l.id, "fisico", e.target.value === "" ? null : Number(e.target.value))} />
                : l.fisico == null ? "—" : fmtN(l.fisico)}</td>
              {!ciega && <td className="num" style={{ color: d < 0 ? "var(--bad)" : d > 0 ? "var(--warn)" : "inherit", fontWeight: 600 }}>{d === null ? "—" : (d > 0 ? "+" : "") + fmtN(d)}</td>}
              <td>{editable ? <input style={{ width: 160 }} value={l.obs || ""} onChange={(e) => setL(l.id, "obs", e.target.value)} /> : l.obs}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      {modal === "cerrar" && (
        <Modal title="Cerrar conteo" onClose={() => setModal(null)}>
          <p>{c.resumen.lineas - c.resumen.contadas ? <>Quedan <b>{c.resumen.lineas - c.resumen.contadas}</b> líneas sin contar; no generarán ajuste.</> : "Todas las líneas están contadas."} Al cerrar, la planilla queda bloqueada y se muestran las diferencias.</p>
          <label className="f">Testigo (nombre y cargo)<input value={acta.testigo} onChange={(e) => setActa({ ...acta, testigo: e.target.value })} /></label>
          <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setModal(null)}>Volver</button><button className="btn pri" onClick={cerrar}>Cerrar conteo</button></div>
        </Modal>
      )}
      {modal === "ajustar" && (
        <Modal title="Aplicar ajustes" onClose={() => setModal(null)}>
          <p>Se registrarán ajustes en el kardex para dejar el saldo igual a lo contado. Cada ajuste queda con su usuario, fecha y el acta indicada.</p>
          <p className="small muted">Los faltantes de control especial o implantes deben investigarse antes de ajustar.</p>
          <label className="f">Número de acta *<input placeholder="Ej. ACTA-INV-2026-014" value={acta.acta} onChange={(e) => setActa({ ...acta, acta: e.target.value })} /></label>
          <label className="f">Motivo *<textarea placeholder={`Ajuste por toma física del ${fmtD(c.fecha)}`} value={acta.motivo} onChange={(e) => setActa({ ...acta, motivo: e.target.value })} /></label>
          <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setModal(null)}>Cancelar</button><button className="btn pri" onClick={ajustar}>Aplicar ajustes</button></div>
        </Modal>
      )}
    </section>
  );
}

export default function Conteos() {
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const { data: list, error, reload } = useLoad(() => api.get("/conteos"));
  if (abierto) return <Editor id={abierto} onBack={() => { setAbierto(null); reload(); }} />;
  return (
    <section className="view">
      <div className="row between"><h2>Toma física de inventario</h2><Can perm="conteos:crear"><button className="btn pri" onClick={() => setNuevo(true)}>Nueva toma física</button></Can></div>
      <p className="muted small" style={{ maxWidth: "80ch" }}>La toma física compara el saldo del sistema con lo contado. Se recomienda conteo a ciegas, un testigo de otra área y congelar movimientos del área mientras se cuenta. Las diferencias se ajustan solo con acta.</p>
      {error && <div className="banner">{error}</div>}
      {!list ? <div className="empty">Cargando…</div> : !list.length ? <div className="empty">Aún no hay tomas físicas.</div> : (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Fecha</th><th>Ubicación</th><th>Responsable / testigo</th><th>Estado</th><th className="num">Líneas</th><th className="num">Faltante</th><th className="num">Sobrante</th><th /></tr></thead>
          <tbody>{list.map((c) => (
            <tr key={c.id}>
              <td>{fmtD(c.fecha)}</td><td>{c.ubicacion || "Todas"}{c.tipo ? " · " + TIPOS[c.tipo] : ""}</td>
              <td className="small">{c.por?.nombre}{c.testigo ? " / " + c.testigo : ""}</td>
              <td><span className={`pill ${c.estado === "cerrado" ? (c.ajustado ? "p-verde" : "p-amarillo") : "t-DM"}`}>{c.estado === "cerrado" ? (c.ajustado ? "Cerrado y ajustado" : "Cerrado, sin ajustar") : "En curso"}</span></td>
              <td className="num">{c.resumen.lineas}</td>
              <td className="num" style={{ color: c.resumen.faltante ? "var(--bad)" : "inherit" }}>{c.resumen.faltante === undefined ? "—" : fmtN(c.resumen.faltante)}</td>
              <td className="num">{c.resumen.sobrante === undefined ? "—" : fmtN(c.resumen.sobrante)}</td>
              <td><button className="btn sm" onClick={() => setAbierto(c.id)}>{c.estado === "cerrado" ? "Ver acta" : "Continuar"}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {nuevo && <NuevaToma onClose={() => setNuevo(false)} onCreated={(id) => { setNuevo(false); setAbierto(id); }} />}
    </section>
  );
}
