import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Can } from "../auth/guards.jsx";
import { BOOL_FIELDS, FIELDS, MOV, NUM_FIELDS, TIPOS, fmtN, fmtTs, itemLabel, norm, requisitosMovimiento } from "../lib/kardex.js";
import { useConfig } from "./ConfigContext.jsx";
import { Modal, SemPill, TipoPill, useToast } from "./ui.jsx";

const porNombre = (m) => m.por?.nombre || m.porNombre || "—";

export function MovTable({ list, compact }) {
  if (!list?.length) return <p className="muted small">Aún no hay movimientos registrados.</p>;
  return (
    <div className="tbl-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th>{!compact && <><th>Lote / serie</th><th>Soporte</th><th>Destino / paciente</th></>}<th className="num">Cant.</th>{!compact && <th className="num">Saldo</th>}<th>Usuario</th></tr></thead>
      <tbody>{list.map((m) => (
        <tr key={m.id}>
          <td className="small">{fmtTs(m.ts)}</td>
          <td><span className={`pill ${m.signo > 0 ? "p-verde" : "p-rojo"}`}>{MOV[m.tipo]?.l.split(" (")[0] || m.tipo}</span></td>
          <td>{m.itemNombre}</td>
          {!compact && <>
            <td className="mono">{m.lote}{m.serie ? " / " + m.serie : ""}</td>
            <td className="small">{m.soporte || m.motivo}</td>
            <td className="small">{[m.destino, m.paciente ? "HC " + m.paciente : ""].filter(Boolean).join(" · ")}</td>
          </>}
          <td className="num">{m.signo > 0 ? "+" : "−"}{fmtN(m.cantidad)}</td>
          {!compact && <td className="num">{fmtN(m.saldoDespues)}</td>}
          <td className="small">{porNombre(m)}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function ItemPicker({ items, value, onPick }) {
  const [q, setQ] = useState(value ? itemLabel(value) : "");
  const [open, setOpen] = useState(false);
  const s = norm(q);
  const res = s.length < 2 ? [] : items.filter((i) => norm([i.nombre, i.codigo, i.lote, i.serie, i.referencia].join(" ")).includes(s)).slice(0, 30);
  return (
    <div className="picker">
      <input aria-label="Producto" placeholder="Busque por nombre, código, lote o serie" value={q} style={{ width: "100%" }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
      {open && s.length >= 2 && (
        <div className="opts">
          {res.length ? res.map((i) => (
            <div key={i.id} onClick={() => { setQ(itemLabel(i)); setOpen(false); onPick(i); }}>{itemLabel(i)} · saldo {fmtN(i.saldo)}</div>
          )) : <div>Sin resultados</div>}
        </div>
      )}
    </div>
  );
}

export function MovForm({ items, item: inicial, onClose, onSaved }) {
  const cfg = useConfig();
  const toast = useToast();
  const [item, setItem] = useState(inicial || null);
  const [f, setF] = useState({ tipo: inicial?.tipo === "OST" ? "USO" : "ENT", cantidad: "", soporte: "", destino: "", paciente: "", motivo: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const req = requisitosMovimiento(f.tipo, item);

  async function guardar() {
    if (!item) return toast("Seleccione un producto.");
    if (!(Number(f.cantidad) > 0)) return toast("Ingrese una cantidad mayor que cero.");
    setSaving(true);
    try {
      const mv = await api.post("/movimientos", { item: item.id, ...f, cantidad: Number(f.cantidad) });
      toast(`${MOV[f.tipo].l.split(" (")[0]} registrado. Nuevo saldo: ${fmtN(mv.saldoDespues)}`);
      onSaved?.(mv);
      onClose();
    } catch (e) { toast(e.message); setSaving(false); }
  }

  return (
    <Modal title="Registrar movimiento" onClose={onClose}>
      <label className="f">Producto *<ItemPicker items={items} value={inicial} onPick={setItem} /></label>
      {item && <div className="small muted">Saldo actual <b>{fmtN(item.saldo)}</b> · <SemPill item={item} /></div>}
      <div className="form">
        <label className="f">Tipo de movimiento *<select value={f.tipo} onChange={set("tipo")}>{Object.entries(MOV).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></label>
        <label className="f">Cantidad *<input type="number" min="1" step="any" value={f.cantidad} onChange={set("cantidad")} /></label>
        <label className="f">Documento soporte<input placeholder="Factura, remisión, orden, acta…" value={f.soporte} onChange={set("soporte")} /></label>
        <label className="f">Servicio destino<select value={f.destino} onChange={set("destino")}><option value="">—</option>{cfg.servicios.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="f">Historia clínica del paciente<input placeholder="Solo número de HC" value={f.paciente} onChange={set("paciente")} /></label>
        <label className="f wide">Motivo / observaciones<textarea value={f.motivo} onChange={set("motivo")} /></label>
      </div>
      {req.length > 0 && <p className="small muted">Obligatorio para este movimiento: {req.join(", ")}.</p>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={saving} onClick={guardar}>Registrar</button>
      </div>
    </Modal>
  );
}

function FieldInput({ k, value, onChange, ubics }) {
  const id = `f-${k}`;
  if (k === "tipo") return <select id={id} value={value || "MED"} onChange={(e) => onChange(e.target.value)}>{Object.entries(TIPOS).map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>;
  if (k === "ubicacion") return <><input id={id} list="dl-ubic" value={value || ""} onChange={(e) => onChange(e.target.value)} /><datalist id="dl-ubic">{ubics.map((u) => <option key={u} value={u} />)}</datalist></>;
  if (k === "vencimiento") return <input id={id} type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (k === "riesgo") return <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)}><option value="">No aplica</option>{["I", "IIa", "IIb", "III"].map((r) => <option key={r}>{r}</option>)}</select>;
  if (BOOL_FIELDS.includes(k)) return <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  if (NUM_FIELDS.includes(k)) return <input id={id} type="number" min="0" step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
  return <input id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

export function ItemForm({ item, items, onClose, onSaved }) {
  const cfg = useConfig();
  const toast = useToast();
  const { can } = useAuth();
  const [o, setO] = useState(item ? { ...item } : { tipo: "MED", ubicacion: cfg.servicios[0] });
  const [saving, setSaving] = useState(false);
  const ubics = [...new Set([...cfg.servicios, ...items.map((i) => i.ubicacion).filter(Boolean)])];
  const fields = FIELDS.filter(([k]) => !(item && k === "cantidad"));

  async function guardar() {
    if (!o.nombre?.trim()) return toast("El nombre es obligatorio.");
    setSaving(true);
    try {
      const body = Object.fromEntries(fields.map(([k]) => [k, o[k]]));
      if (item) { await api.put(`/items/${item.id}`, body); toast("Ítem actualizado"); }
      else {
        const n = await api.post("/items", { ...body, soporte: o.soporte });
        toast(n.sumado
          ? `Ese producto ya existía: se sumaron ${fmtN(n.cantidadSumada)} und. a su saldo (nuevo saldo ${fmtN(n.saldo)}).`
          : "Ítem creado con saldo inicial " + fmtN(n.saldo), 5000);
      }
      onSaved?.();
      onClose();
    } catch (e) { toast(e.message); setSaving(false); }
  }

  async function inactivar() {
    try { await api.post(`/items/${item.id}/inactivar`); toast("Ítem inactivado"); onSaved?.(); onClose(); }
    catch (e) { toast(e.message); }
  }

  return (
    <Modal title={item ? "Editar ítem" : "Nuevo ítem"} onClose={onClose}>
      {item && <p className="small muted">El saldo solo cambia con movimientos o ajustes de toma física. Saldo actual: <b>{fmtN(item.saldo)}</b>.</p>}
      <div className="form">
        {fields.map(([k, l]) => BOOL_FIELDS.includes(k)
          ? <label key={k} className="chk"><FieldInput k={k} value={o[k]} ubics={ubics} onChange={(v) => setO({ ...o, [k]: v })} /> {l}</label>
          : <label key={k} className={`f ${k === "nombre" ? "wide" : ""}`} htmlFor={`f-${k}`}>{l}{["nombre", "lote", "vencimiento", "invima"].includes(k) ? " *" : ""}
              <FieldInput k={k} value={o[k]} ubics={ubics} onChange={(v) => setO({ ...o, [k]: v })} /></label>)}
      </div>
      {!item && <>
        <label className="f">Documento soporte (factura / remisión)<input value={o.soporte || ""} placeholder="Opcional" onChange={(e) => setO({ ...o, soporte: e.target.value })} /></label>
        <p className="small muted">Si el producto ya existe con el mismo código o nombre, lote, serie y ubicación, la cantidad se suma a su saldo como una entrada en el kardex.</p>
      </>}
      <p className="small muted">* Campos que exige el estándar de habilitación para trazabilidad.</p>
      <div className="row between">
        {item && can("inventario:inactivar") ? <button className="btn danger" onClick={inactivar}>Inactivar ítem</button> : <span />}
        <div className="row"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" disabled={saving} onClick={guardar}>Guardar</button></div>
      </div>
    </Modal>
  );
}

export function KardexModal({ itemId, onClose, onMovimiento }) {
  const [d, setD] = useState(null);
  const toast = useToast();
  useEffect(() => { api.get(`/items/${itemId}/kardex`).then(setD).catch((e) => toast(e.message)); }, [itemId, toast]);
  if (!d) return <Modal title="Kardex" onClose={onClose}><div className="empty">Cargando…</div></Modal>;
  const it = d.item;
  return (
    <Modal title="Kardex" subtitle={itemLabel(it)} onClose={onClose}>
      <div className="row"><TipoPill tipo={it.tipo} /> <SemPill item={it} /> <span className="small muted">INVIMA {it.invima || "—"} · {it.fabricante} {it.proveedor ? "· " + it.proveedor : ""}</span></div>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Fecha</th><th>Movimiento</th><th>Soporte / detalle</th><th className="num">Entrada</th><th className="num">Salida</th><th className="num">Saldo</th><th>Usuario</th></tr></thead>
        <tbody>
          <tr><td className="small">{fmtTs(it.creado)}</td><td>Saldo inicial</td><td className="small">{it.origen}</td><td className="num">{fmtN(it.saldoInicial)}</td><td /><td className="num">{fmtN(it.saldoInicial)}</td><td className="small">{it.creadoPor?.nombre}</td></tr>
          {d.movimientos.map((m) => (
            <tr key={m.id}><td className="small">{fmtTs(m.ts)}</td><td>{MOV[m.tipo]?.l || m.tipo}</td>
              <td className="small">{[m.soporte, m.destino, m.paciente ? "HC " + m.paciente : "", m.motivo].filter(Boolean).join(" · ")}</td>
              <td className="num">{m.signo > 0 ? fmtN(m.cantidad) : ""}</td><td className="num">{m.signo < 0 ? fmtN(m.cantidad) : ""}</td>
              <td className="num">{fmtN(m.saldoCalculado)}</td><td className="small">{porNombre(m)}</td></tr>
          ))}
        </tbody>
      </table></div>
      {d.coincide
        ? <p className="small muted">El saldo reconstruido desde el kardex coincide con el saldo del ítem ({fmtN(it.saldo)}).</p>
        : <div className="banner">El saldo reconstruido ({fmtN(d.saldoReconstruido)}) no coincide con el saldo registrado ({fmtN(it.saldo)}).</div>}
      <Can perm="movimientos:crear"><div className="row"><button className="btn pri" onClick={() => onMovimiento(it)}>Registrar movimiento</button></div></Can>
    </Modal>
  );
}
