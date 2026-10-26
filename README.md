# Kardex Clínico — Frontend

Aplicación web del Kardex Clínico (medicamentos, dispositivos, insumos y osteosíntesis), con inicio de sesión y control de acceso **por pantalla y por acción**. Consume la API de [`kardex-clinico-back`](../kardex-clinico-back).

- React 18 · React Router 6 · Vite 5 · SheetJS (importar/exportar Excel)
- Pruebas: Vitest + Testing Library

## Puesta en marcha

```bash
npm install
cp .env.example .env   # VITE_API_URL; por defecto /api (Vite lo redirige a http://localhost:4000)
npm run dev            # http://localhost:5173
```

Requiere el backend en marcha. Si `VITE_API_URL` apunta a otro origen, configure `CORS_ORIGIN` en el backend.

## Pruebas

```bash
npm test
```

| Archivo | Qué cubre |
|---|---|
| `src/auth/permisos.test.js` | Pantallas visibles, ruta inicial, reglas de la matriz de permisos |
| `src/lib/lib.test.js` | Lectura de Excel (fechas, números, columnas), semáforo, requisitos de movimientos |
| `src/api/client.test.js` | Token Bearer, errores, cierre de sesión ante 401 |
| `src/App.test.jsx` | Login, menú según permisos, rutas protegidas, cierre de sesión |
| `src/pages/acciones.test.jsx` | Botones y formularios por acción en inventario, toma física, usuarios, roles y ajustes |

## Control de acceso

- `GET /auth/me` devuelve los permisos `pantalla:accion` del usuario.
- El menú muestra solo las pantallas con `pantalla:ver`; entrar por URL a otra pantalla redirige a “sin acceso”.
- Dentro de cada pantalla, los botones de cada acción se muestran con `<Can perm="pantalla:accion">` o `can(...)` de `useAuth()`.
- El backend valida los mismos permisos en cada endpoint: ocultar un botón es comodidad, no la protección.

Pantallas: Panel, Inventario, Movimientos, Toma física, Importar Excel, Análisis de riesgo, Marco normativo, Ajustes, Usuarios, Roles y permisos (matriz pantalla × acción).

## Estructura

```
src/
  api/client.js         cliente HTTP con token
  auth/                 AuthContext, guards (Can, RequirePermiso), permisos
  components/           Layout, modal, toast, formularios de ítem y movimiento, kardex
  lib/                  reglas y formatos del kardex, lectura/escritura de Excel
  pages/                una pantalla por archivo
```

Diferencia con la versión HTML original: la lectura de fotos con IA y el análisis con Claude dependían del entorno de claude.ai y no se incluyeron; las alertas deterministas se calculan en el backend.
