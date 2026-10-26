import { NORMAS } from "../lib/kardex.js";

export default function Normas() {
  return (
    <section className="view">
      <h2>Marco normativo aplicado</h2>
      <p className="muted" style={{ maxWidth: "75ch" }}>Normas colombianas en las que se apoyan los campos, validaciones y alertas de esta herramienta. Antes de citarlas en un procedimiento institucional, verifique vigencia y modificaciones en el normograma de MinSalud o del INVIMA.</p>
      <div className="panel">
        {NORMAS.map(([n, q, h]) => (
          <div className="norma" key={n}><b>{n}</b><div><div>{q}</div><div className="small muted" style={{ marginTop: 4 }}>En la herramienta: {h}</div></div></div>
        ))}
      </div>
      <div className="panel"><h3>Criterios institucionales configurables (no son norma)</h3><p className="small muted">Umbrales del semáforo de vencimiento, días máximos de material en consignación sin legalizar y franja horaria de movimientos inusuales. Se ajustan en la pantalla Ajustes.</p></div>
    </section>
  );
}
