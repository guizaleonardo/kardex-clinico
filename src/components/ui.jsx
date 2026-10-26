import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SEM_L, TIPOS, fmtD, semaforo } from "../lib/kardex.js";
import { useConfig } from "./ConfigContext.jsx";

/* ---- Toast ---- */
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const toast = useCallback((m, ms = 3200) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), ms);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/* ---- Modal ---- */
export function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><h2>{title}</h2>{subtitle && <div className="small muted">{subtitle}</div>}</div>
          <button className="btn sm" onClick={onClose}>Cerrar</button>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ---- Pills ---- */
export function SemPill({ item }) {
  const cfg = useConfig();
  const s = semaforo(item, cfg);
  return <span className={`pill p-${s}`} title={`Vence ${fmtD(item.vencimiento)}`}>{SEM_L[s]}{item.vencimiento ? " · " + fmtD(item.vencimiento) : ""}</span>;
}
export const TipoPill = ({ tipo }) => <span className={`pill t-${tipo}`}>{TIPOS[tipo]?.split(" ")[0] || tipo}</span>;

export function Kpi({ lab, val, sub, tone }) {
  return (
    <div className={`kpi ${tone || ""}`}>
      <span className="lab">{lab}</span><span className="val">{val}</span>{sub && <span className="sub">{sub}</span>}
    </div>
  );
}

export function AlertItem({ a }) {
  const pill = a.nivel === "critico" ? "p-rojo" : a.nivel === "alto" ? "p-amarillo" : "t-DM";
  const txt = a.nivel === "critico" ? "Crítico" : a.nivel === "alto" ? "Alto" : "Medio";
  return (
    <div className="alert">
      <span className={`sev ${a.nivel}`} />
      <div><b>{a.titulo}</b> <span className={`pill ${pill}`}>{txt}</span><div className="small">{a.detalle}</div><div className="norm">{a.norma}</div></div>
    </div>
  );
}

/** Hook mínimo de carga de datos con recarga manual. */
export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    set((s) => ({ ...s, loading: true }));
    try { set({ data: await fn(), error: null, loading: false }); }
    catch (e) { set({ data: null, error: e.message, loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
