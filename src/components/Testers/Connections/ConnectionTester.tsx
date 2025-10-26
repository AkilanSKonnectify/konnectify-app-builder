import React, { useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ConnectionTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);

  async function ensureRunner() {
    if (!runnerRef.current) {
      runnerRef.current = new SandboxRunner();

      runnerRef.current.onConsole = (level, args) =>
        append(level === "info" ? "info" : level === "warn" ? "warn" : "error", args);

      runnerRef.current.onNetworkRequest = (req, respond) => {
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
    const ts = activeFile?.content;
    if (!ts) {
      append("error", ["No active file to test"]);
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    append("info", ["Starting connection test..."]);

    try {
      // Ensure esbuild initialized FIRST
      await ensureEsbuildInitialized();

      const runner = await ensureRunner();
      await runner.loadConnector(ts);
      append("info", ["Connector loaded in worker"]);

      // Parse auth data
      let parsedAuth = {};
      try {
        parsedAuth = JSON.parse(authData);
      } catch (e) {
        append("warn", ["Invalid JSON in auth data, using empty object"]);
      }

      // Build context
      const context = {
        auth: parsedAuth,
        logger: {
          info: (...args: any[]) => append("info", args),
          error: (...args: any[]) => append("error", args),
          debug: (...args: any[]) => append("debug", args),
          warn: (...args: any[]) => append("warn", args),
        },
        payload: {},
      };

      // Run connection validation
      const result = await runner.run("connection.auth.validate", context, {
        proxyFetch: true,
        timeoutMs: 15000,
        operationData: { appId: activeFile.name },
      });

      setTestResult({ success: true, result });
      append("info", ["Connection validation successful:", result]);
    } catch (err: any) {
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-gray-300">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connection Test</CardTitle>
          <CardDescription className="text-xs">Test the connection authentication for your connector</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-gray-300 mb-1 block">Auth Data (JSON)</label>
            <Textarea
              value={authData}
              onChange={(e) => setAuthData(e.target.value)}
              placeholder='{"access_token": "your_token", "client_id": "your_id"}'
              className="min-h-[80px] text-xs font-mono"
            />
          </div>

          <Button onClick={handleTestConnection} disabled={isLoading || !activeFile} className="w-full" size="sm">
            {isLoading ? "Testing..." : "Test Connection"}
          </Button>

          {testResult && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div className="bg-gray-800 p-2 rounded text-xs font-mono max-h-32 overflow-auto">
                <pre>{JSON.stringify(testResult.result || testResult.error, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
