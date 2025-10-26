import React, { useEffect, useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ConnectionTester() {
  useEsbuild();

  const { files, activeFileId, addConnectionsToFile } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [connectionName, setConnectionName] = useState<string>("");
  const [isConnectionSaved, setIsConnectionSaved] = useState<boolean>(false);

  async function ensureRunner() {
    if (!runnerRef.current) {
      runnerRef.current = new SandboxRunner();

      runnerRef.current.onConsole = (level, args) =>
        append(level === "info" ? "info" : level === "warn" ? "warn" : level === "debug" ? "debug" : "error", args);

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
      console.log("It raises and error");
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const saveConnection = () => {
    const fields = JSON.parse(authData);
    if (!activeFileId || !fields || !connectionName) return;
    addConnectionsToFile(activeFileId, { id: "", name: connectionName, fields });
    setIsConnectionSaved(true);
  };

  useEffect(() => {
    setIsConnectionSaved(false);
  }, [testResult]);

  return (
    <div className="h-full flex flex-col text-gray-300 p-3">
      <Card className="flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">Connection Test</CardTitle>
          <CardDescription className="text-xs">Test the connection authentication for your connector</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 overflow-hidden space-y-3">
          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Auth Data (JSON)</label>
            <Textarea
              value={authData}
              onChange={(e) => setAuthData(e.target.value)}
              placeholder='{"access_token": "your_token", "client_id": "your_id"}'
              className="min-h-[80px] text-xs font-mono"
            />
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={isLoading || !activeFile}
            className="w-full flex-shrink-0"
            size="sm"
          >
            {isLoading ? "Testing..." : "Test Connection"}
          </Button>

          {testResult && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div className="bg-gray-800 p-2 rounded text-xs font-mono flex-1 overflow-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(testResult.result || testResult.error, null, 2)}
                </pre>
              </div>
              {testResult.success && (
                <div className="w-full mt-2 flex flex-col gap-3 p-3 flex-shrink-0">
                  <Input
                    type="text"
                    name="connectionName"
                    placeholder="Enter connetion name"
                    value={connectionName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConnectionName(e?.target?.value)}
                    maxLength={30}
                  />
                  {!isConnectionSaved ? (
                    <Button
                      className="border border-slate-700 rounded-lg"
                      onClick={saveConnection}
                      disabled={isConnectionSaved}
                      size="sm"
                    >
                      Save connection
                    </Button>
                  ) : (
                    <>Connection Saved!</>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
