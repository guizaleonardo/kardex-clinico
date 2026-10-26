import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useConfig } from "../components/ConfigContext.jsx";
import { useToast } from "../components/ui.jsx";

export default function Ajustes() {
  const cfg = useConfig();
  const toast = useToast();
  const { can } = useAuth();
  const editable = can("ajustes:editar");
  const [f, setF] = useState(null);
  useEffect(() => { setF({ ...cfg, servicios: cfg.servicios.join("\n") }); }, [cfg]);
  if (!f) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar() {
    const n = { ...f, servicios: f.servicios.split("\n").map((s) => s.trim()).filter(Boolean) };
    for (const k of ["rojoMeses", "amarilloMeses", "diasConsignacion", "horaInicio", "horaFin"]) n[k] = Number(n[k]);
    if (n.amarilloMeses <= n.rojoMeses) return toast("El umbral amarillo debe ser mayor que el rojo.");
    try { await api.put("/config", n); toast("Ajustes guardados"); cfg.recargar(); }
    catch (e) { toast(e.message); }
  }

  return (
    <section className="view">
      <h2>Ajustes</h2>
      {!editable && <div className="banner">Su rol puede consultar los ajustes pero no modificarlos.</div>}
      <div className="panel">
        <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="form">
            <label className="f wide">Servicios / ubicaciones (uno por línea)<textarea rows={6} value={f.servicios} onChange={set("servicios")} /></label>
            <label className="f">Semáforo rojo: vence en menos de (meses)<input type="number" min="1" value={f.rojoMeses} onChange={set("rojoMeses")} /></label>
            <label className="f">Semáforo amarillo: vence en menos de (meses)<input type="number" min="1" value={f.amarilloMeses} onChange={set("amarilloMeses")} /></label>
            <label className="f">Días máximos en consignación sin legalizar<input type="number" min="1" value={f.diasConsignacion} onChange={set("diasConsignacion")} /></label>
            <label className="f">Horario habitual: desde (hora)<input type="number" min="0" max="23" value={f.horaInicio} onChange={set("horaInicio")} /></label>
            <label className="f">Horario habitual: hasta (hora)<input type="number" min="1" max="24" value={f.horaFin} onChange={set("horaFin")} /></label>
          </div>
        </fieldset>
        {editable && <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}><button className="btn pri" onClick={guardar}>Guardar ajustes</button></div>}
      </div>
    </section>
  );
}
