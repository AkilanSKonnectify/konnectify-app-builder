import { useEffect } from "react";
import * as esbuild from "esbuild-wasm";

let initialized = false;
let initializingPromise: Promise<void> | null = null;

export async function ensureEsbuildInitialized() {
  if (initialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      await esbuild.initialize({
        wasmURL: new URL("esbuild-wasm/esbuild.wasm", import.meta.url).toString(),
        worker: true,
      });
      initialized = true;
      console.log("✅ esbuild initialized");
    } catch (err) {
      console.error("❌ esbuild init error", err);
      throw err;
    }
  })();

  return initializingPromise;
}

// optional React hook for convenience
export function useEsbuild() {
  useEffect(() => {
    ensureEsbuildInitialized();
  }, []);
}
