import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Todas las pruebas usan un cliente HTTP simulado; client.test.js importa el real con vi.importActual.
vi.mock("../api/client.js", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});
