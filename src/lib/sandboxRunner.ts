import * as esbuild from "esbuild-wasm";
import { createWorkerBlobUrl } from "./createSandboxWorkerBlob";

export class SandboxRunner {
  worker: Worker | null = null;
  url: string | null = null;
  pending = new Map<string, (msg: any) => void>();

  constructor() {
    this.url = createWorkerBlobUrl();
  }

  async init() {
    if (this.worker) return;
    if (!this.url) throw new Error("worker url missing");

    this.worker = new Worker(this.url);

    this.worker.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;

      // Relay console logs from worker
      if (msg.type === "console") {
        this.onConsole?.(msg.level, msg.args);
        return;
      }

      // Relay logs emitted via logger proxy
      if (msg.type === "log") {
        this.onConsole?.(msg.level, msg.args);
        return;
      }

      // Handle proxied network requests from inside worker
      if (msg.type === "networkRequest") {
        this.onNetworkRequest?.(msg, (response) => {
          this.worker!.postMessage({
            type: "networkResponse",
            id: msg.id,
            response,
          });
        });
        return;
      }

      // Handle async responses
      const id = msg.requestId;
      if (id && this.pending.has(id)) {
        this.pending.get(id)!(msg);
        this.pending.delete(id);
      } else {
        this.onMessage?.(msg);
      }
    };

    // Tell the worker that we support logger + fetch proxy
    this.worker.postMessage({
      type: "setup",
      capabilities: {
        fetch: true,
        logger: true,
      },
    });
  }

  // Callbacks for external handlers
  onConsole?: (level: string, args: any[]) => void;
  onNetworkRequest?: (req: any, respond: (resp: any) => void) => void;
  onMessage?: (msg: any) => void;

  async compileToWrappedJS(tsCode: string) {
    const res = await esbuild.transform(tsCode, {
      loader: "ts",
      format: "cjs",
      target: "es2022",
    });

    return `
      (function(exports, module){
        ${res.code}
        if (module && module.exports) {
          exports.default = module.exports.default ?? module.exports;
        }
      })(
        (typeof exports === 'undefined') ? (globalThis.exports = {}) : exports,
        (typeof module === 'undefined') ? (globalThis.module = { exports: {} }) : module
      );
    `;
  }

  async loadConnector(tsCode: string) {
    await this.init();
    const jsWrapped = await this.compileToWrappedJS(tsCode);

    return new Promise<void>((resolve, reject) => {
      const onLoaded = (e: MessageEvent) => {
        const data = e.data;
        if (data?.type === "loaded") {
          this.worker!.removeEventListener("message", onLoaded);
          resolve();
        } else if (data?.type === "error" && !data.requestId) {
          this.worker!.removeEventListener("message", onLoaded);
          reject(new Error(data.error || "worker load error"));
        }
      };

      this.worker!.addEventListener("message", onLoaded);

      // Send connector code into the worker
      this.worker!.postMessage({
        type: "load",
        code: jsWrapped,
      });
    });
  }

  run(
    methodPath: string,
    context: any,
    options?: {
      proxyFetch?: boolean;
      timeoutMs?: number;
      operationData?: any;
    },
    isFields: boolean = false
  ) {
    if (!this.worker) throw new Error("Worker not ready");
    const requestId = Math.random().toString(36).slice(2);

    // Remove non-cloneable items from context
    const serializableContext = JSON.parse(JSON.stringify(context));

    const p = new Promise<any>((resolve, reject) => {
      const resolver = (msg: any) => {
        if (msg.type === "result") resolve(msg.result);
        else reject(new Error(msg.error || "unknown worker error"));
      };
      this.pending.set(requestId, resolver);

      if (options?.timeoutMs) {
        setTimeout(() => {
          if (this.pending.has(requestId)) {
            this.pending.delete(requestId);
            reject(new Error("Worker timeout"));
            this.worker!.terminate();
            this.worker = null;
          }
        }, options.timeoutMs);
      }
    });

    // Send message to worker with cleaned context
    this.worker.postMessage({
      type: "run",
      methodPath,
      context: serializableContext,
      requestId,
      proxyFetch: !!options?.proxyFetch,
      operationData: options?.operationData || {},
      enableLogger: true,
      isFields,
    });

    return p;
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }
}
