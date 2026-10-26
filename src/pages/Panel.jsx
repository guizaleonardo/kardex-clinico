import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { SEM_L, TIPOS, fmt$, fmtD, fmtN } from "../lib/kardex.js";
import { useConfig } from "../components/ConfigContext.jsx";
import { MovTable } from "../components/kardex.jsx";
import { AlertItem, Kpi, useLoad } from "../components/ui.jsx";

const COLORS = { verde: "var(--ok)", amarillo: "var(--warn)", rojo: "var(--bad)", vencido: "#7a0d14", sin: "var(--line)" };
const ORDEN = ["vencido", "rojo", "amarillo", "verde", "sin"];

export default function Panel() {
  const cfg = useConfig();
  const { can } = useAuth();
  const nav = useNavigate();
  const { data: d, error } = useLoad(() => api.get("/panel"));
  if (error) return <div className="banner">{error}</div>;
  if (!d) return <div className="empty">Cargando inventario…</div>;
  const k = d.kpis;
  if (!k.referencias) {
    return (
      <div className="panel">
        <h2>Empiece por cargar su inventario</h2>
        <p className="muted" style={{ maxWidth: "65ch" }}>Aquí verá existencias, valor, semáforo de vencimiento, faltantes de la última toma física y alertas de pérdida.</p>
        <div className="row">
          {can("importar:ejecutar") && <button className="btn pri" onClick={() => nav("/importar")}>Importar Excel</button>}
          {can("inventario:crear") && <button className="btn" onClick={() => nav("/inventario")}>Crear ítems</button>}
        </div>
      </div>
    );
  }
  return (
    <section className="view">
      <div className="grid kpis">
        <Kpi lab="Referencias activas" val={fmtN(k.referencias)} sub="producto · lote · ubicación" />
        <Kpi lab="Unidades en existencia" val={fmtN(k.unidades)} sub={k.valor ? fmt$(k.valor) + " valorizado" : "sin costos cargados"} />
        <Kpi lab="Vencidos con saldo" val={k.vencidosConSaldo} sub={`${k.rojoConSaldo} en semáforo rojo`} tone={k.vencidosConSaldo ? "bad" : ""} />
        <Kpi lab="Faltante última toma" val={fmtN(k.faltanteUltimaToma)} sub={k.fechaUltimaToma ? (k.valorFaltanteUltimaToma ? fmt$(k.valorFaltanteUltimaToma) + " · " : "") + fmtD(k.fechaUltimaToma) : "sin tomas cerradas"} tone={k.faltanteUltimaToma ? "bad" : ""} />
        <Kpi lab="Alertas críticas" val={k.alertasCriticas} sub={`${k.alertas} alertas en total`} tone={k.alertasCriticas ? "bad" : ""} />
      </div>
      <div className="grid two">
        <div className="panel">
          <div className="row between" style={{ marginBottom: 6 }}><h3>Alertas prioritarias</h3>{can("analisis:ver") && <button className="btn sm" onClick={() => nav("/analisis")}>Ver todas</button>}</div>
          {d.alertas.length ? d.alertas.map((a, i) => <AlertItem key={i} a={a} />) : <p className="muted">Sin alertas. El inventario está consistente con los registros.</p>}
        </div>
        <div className="grid" style={{ gap: 12 }}>
          <div className="panel">
            <h3>Semáforo de vencimiento por tipo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.porTipo.map((x) => (
                <div key={x.tipo}>
                  <div className="row between small"><span>{TIPOS[x.tipo]}</span><span className="muted">{x.n} ref.</span></div>
                  <div className="bar">{ORDEN.map((s) => x.semaforo[s] ? <span key={s} title={`${SEM_L[s]}: ${x.semaforo[s]}`} style={{ width: `${(x.semaforo[s] / x.n) * 100}%`, background: COLORS[s] }} /> : null)}</div>
                </div>
              ))}
            </div>
            <div className="legend" style={{ marginTop: 10 }}>{ORDEN.map((s) => <span key={s}><i style={{ background: COLORS[s] }} />{SEM_L[s]}</span>)}</div>
            <p className="small muted" style={{ marginTop: 6 }}>Rojo: vence en menos de {cfg.rojoMeses} meses · Amarillo: menos de {cfg.amarilloMeses} meses.</p>
          </div>
          <div className="panel"><h3>Últimos movimientos</h3><MovTable list={d.ultimosMovimientos} compact /></div>
        </div>
      </div>
    </section>
  );
}
