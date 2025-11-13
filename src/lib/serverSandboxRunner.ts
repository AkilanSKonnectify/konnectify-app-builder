import * as esbuild from "esbuild";

/**
 * Server-side sandbox runner that uses regular esbuild (not wasm)
 * This is used in API routes where we can't use browser APIs like Workers
 */
export class ServerSandboxRunner {
  private connectorModule: any = null;

  async compileToWrappedJS(tsCode: string): Promise<string> {
    const res = await esbuild.transform(tsCode, {
      loader: "ts",
      format: "cjs",
      target: "es2019",
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

  async loadConnector(tsCode: string): Promise<void> {
    const jsWrapped = await this.compileToWrappedJS(tsCode);

    // Create a minimal context for evaluation
    const context = {
      exports: {} as any,
      module: { exports: {} as any },
    };

    // Evaluate the compiled code
    const fn = new Function("exports", "module", jsWrapped);

    fn(context.exports, context.module);

    // Extract the connector module
    this.connectorModule =
      context.exports.default || context.module.exports.default || context.module.exports || context.exports;
  }

  async run(
    methodPath: string,
    context: any,
    options?: {
      proxyFetch?: boolean;
      timeoutMs?: number;
      operationData?: any;
    }
  ): Promise<any> {
    if (!this.connectorModule) {
      throw new Error("Connector not loaded");
    }

    // Helper to get nested property
    const getByPath = (obj: any, path: string): any => {
      if (!path) return obj;
      return path.split(".").reduce((acc, p) => (acc ? acc[p] : undefined), obj);
    };

    // Find the method
    let fn = getByPath(this.connectorModule, methodPath);
    if (!fn && typeof fn !== "function") {
      // Try alternative paths
      const alternatives = [
        methodPath.replace("connection.auth.", "connection.auth."),
        methodPath.replace("connection.", "connection."),
      ];
      for (const alt of alternatives) {
        fn = getByPath(this.connectorModule, alt);
        if (fn && typeof fn === "function") break;
      }
    }

    if (!fn || typeof fn !== "function") {
      return fn;
    }

    // Create enhanced context
    const enhancedContext = {
      ...context,
      logger: {
        debug: (...args: any[]) => console.debug("[Connector]", ...args),
        info: (...args: any[]) => console.info("[Connector]", ...args),
        warn: (...args: any[]) => console.warn("[Connector]", ...args),
        error: (...args: any[]) => console.error("[Connector]", ...args),
      },
      fetch: options?.proxyFetch
        ? async (url: string, fetchOptions?: RequestInit) => {
            // In server context, use native fetch (no CORS issues)
            // But we can still use the proxy if needed for consistency
            try {
              const response = await fetch(url, fetchOptions);
              return response;
            } catch (error: any) {
              // If direct fetch fails, try proxy
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              const proxyResponse = await fetch(`${baseUrl}/api/proxy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, options: fetchOptions }),
              });
              const data = await proxyResponse.json();
              return {
                ok: data.ok,
                status: data.status,
                statusText: data.statusText,
                text: async () => data.text,
                json: async () => JSON.parse(data.text),
              } as Response;
            }
          }
        : fetch,
      moment: null, // Can be polyfilled if needed
      lodash: null, // Can be polyfilled if needed
      btoa: (input: string) => Buffer.from(input).toString("base64"),
      config: options?.operationData?.config || {},
      webhookEndpoint: options?.operationData?.webhookEndpoint,
      engineEndpoint: options?.operationData?.engineEndpoint,
      operationKey: options?.operationData?.operationKey || "",
    };

    // Execute with timeout
    if (options?.timeoutMs) {
      return Promise.race([
        fn(enhancedContext),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), options.timeoutMs)),
      ]);
    }

    return fn(enhancedContext);
  }

  dispose() {
    this.connectorModule = null;
  }
}
