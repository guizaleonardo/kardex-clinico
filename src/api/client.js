const BASE = import.meta.env.VITE_API_URL || "/api";
const KEY = "kardex.token";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// El token vive en sessionStorage: se borra al cerrar la pestaña.
export const tokenStore = {
  get() { try { return sessionStorage.getItem(KEY); } catch { return null; } },
  set(t) { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } },
};

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, path, body) {
  const headers = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b = {}) => request("POST", p, b),
  put: (p, b = {}) => request("PUT", p, b),
  del: (p) => request("DELETE", p),
};

export const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== "" && v != null));
  const s = p.toString();
  return s ? `?${s}` : "";
};
