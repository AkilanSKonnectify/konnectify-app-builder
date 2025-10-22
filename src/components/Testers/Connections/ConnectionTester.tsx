import React, { useRef } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";

export default function ConnectionTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();

  async function ensureRunner() {
    if (!runnerRef.current) {
      runnerRef.current = new SandboxRunner();

      runnerRef.current.onConsole = (level, args) =>
        append(level === "info" ? "info" : level === "warn" ? "warn" : "error", args);

      runnerRef.current.onNetworkRequest = (req, respond) => {
        // const allowed = req.url.startsWith("https://api.v0.dev");
        // if (!allowed) return respond({ ok: false, status: 403, statusText: "forbidden", text: "blocked" });
        fetch(req.url, req.options)
          .then(async (r) => {
            const text = await r.text();
            respond({ ok: r.ok, status: r.status, statusText: r.statusText, text });
          })
          .catch((err) => respond({ error: String(err) }));
      };

      await runnerRef.current.init();
    }
    return runnerRef.current!;
  }

  async function handleTestConnection() {
    append("info", ["Starting connection test..."]);
    try {
      // ensure esbuild initialized FIRST
      await ensureEsbuildInitialized();

      const ts = activeFile?.content;
      if (!ts) throw new Error("Error while reading the code");

      const runner = await ensureRunner();
      await runner.loadConnector(ts);
      append("info", ["Connector loaded in worker"]);

      // build context (collect credentials from UI or use placeholder)
      const context = {
        auth: { access_token: window.prompt("Enter API key for test (or leave blank)") || "" },
        logger: {
          info: (...args: any[]) => append("info", args),
          error: (...args: any[]) => append("error", args),
          debug: (...args: any[]) => append("debug", args),
          warn: (...args: any[]) => append("warn", args),
        },
        payload: {},
      };

      // run validate (path may vary — adjust accordingly)
      const res = await runner.run("connection.auth.validate", context, { proxyFetch: true, timeoutMs: 15000 });
      append("info", ["Validation result:", res]);
      alert("Validation result: " + JSON.stringify(res));
    } catch (err: any) {
      append("error", [String(err)]);
      console.error(err);
      alert("Test failed: " + String(err));
    }
  }

  return (
    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleTestConnection}>
      Test Connection
    </button>
  );
}
