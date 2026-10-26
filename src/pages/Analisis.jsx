import { useState } from "react";
import { api } from "../api/client.js";
import { fmt$, fmtN } from "../lib/kardex.js";
import { AlertItem, useLoad } from "../components/ui.jsx";

export default function Analisis() {
  const { data: d, error } = useLoad(() => api.get("/analisis"));
  const [nivel, setNivel] = useState("");
  if (error) return <div className="banner">{error}</div>;
  if (!d) return <div className="empty">Calculando alertas…</div>;
  const L = nivel ? d.alertas.filter((a) => a.nivel === nivel) : d.alertas;
  return (
    <section className="view">
      <h2>Análisis de riesgo de pérdida</h2>
      <div className="grid two">
        <div className="panel">
          <div className="row between"><h3>Alertas ({d.alertas.length})</h3>
            <select aria-label="Nivel" value={nivel} onChange={(e) => setNivel(e.target.value)}><option value="">Todos los niveles</option><option value="critico">Crítico</option><option value="alto">Alto</option><option value="medio">Medio</option></select>
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>{L.length ? L.slice(0, 200).map((a, i) => <AlertItem key={i} a={a} />) : <p className="muted">Sin alertas en este nivel.</p>}</div>
        </div>
        <div className="grid" style={{ gap: 12 }}>
          <div className="panel"><h3>Faltantes acumulados por producto</h3>
            {d.faltantes.length ? <div className="tbl-wrap"><table>
              <thead><tr><th>Producto</th><th className="num">Tomas</th><th className="num">Unidades</th><th className="num">Valor</th></tr></thead>
              <tbody>{d.faltantes.map((x) => <tr key={x.itemId}><td>{x.nombre}<div className="small muted mono">{x.lote}</div></td><td className="num">{x.tomas}</td><td className="num">{fmtN(x.unidades)}</td><td className="num">{x.valor ? fmt$(x.valor) : "—"}</td></tr>)}</tbody>
            </table></div> : <p className="small muted">Sin faltantes en tomas cerradas.</p>}
          </div>
          <div className="panel"><h3>Ajustes negativos y bajas por usuario (90 días)</h3>
            {d.ajustesPorUsuario.length ? <div className="tbl-wrap"><table>
              <thead><tr><th>Usuario</th><th className="num">Registros</th><th className="num">Unidades</th><th className="num">Valor</th></tr></thead>
              <tbody>{d.ajustesPorUsuario.map((o, i) => <tr key={i}><td>{o.usuario}</td><td className="num">{o.registros}</td><td className="num">{fmtN(o.unidades)}</td><td className="num">{o.valor ? fmt$(o.valor) : "—"}</td></tr>)}</tbody>
            </table></div> : <p className="small muted">Sin ajustes negativos ni bajas.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
