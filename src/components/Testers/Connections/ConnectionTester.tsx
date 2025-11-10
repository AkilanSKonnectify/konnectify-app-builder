import React, { useEffect, useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConnectionField } from "@/types/konnectify-dsl";
import JsonViewer from "../JsonViewer";

export default function ConnectionTester() {
  useEsbuild();

  const { files, activeFileId, addConnectionsToFile } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState<any>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [connectionName, setConnectionName] = useState<string>("");
  const [isConnectionSaved, setIsConnectionSaved] = useState<boolean>(false);
  const [authType, setAuthType] = useState<"credentials" | "oauth2">("credentials");
  const [authFields, setAuthFields] = useState<ConnectionField[]>();

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

  async function loadAuthDetails() {
    if (!activeFile?.content) return;

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Try to get authType from the connector
      const connection = await runner.run("connection", {}, { timeoutMs: 5000 });
      const typeOfAuth = connection?.value?.["auth"]?.["type"];
      const FieldsInAuth = connection?.value?.["fields"];
      if (typeOfAuth) setAuthType(typeOfAuth);
      if (FieldsInAuth) {
        setAuthFields(FieldsInAuth);
        if (typeOfAuth === "credentials" && FieldsInAuth?.length === 0)
          append("warn", ["Auth type is set to credentials but there are no fields available!"]);
      }
    } catch (err) {
      append("warn", ["Could not load authType:", String(err)]);
    }
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

      // Build context
      const context = {
        auth: authData,
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
    if (!activeFileId || !authData || !connectionName) return;
    addConnectionsToFile(activeFileId, { id: "", name: connectionName, fields: authData });
    setIsConnectionSaved(true);
  };

  useEffect(() => {
    setIsConnectionSaved(false);
  }, [testResult]);

  useEffect(() => {
    if (activeFile) {
      loadAuthDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  return (
    <div className="h-full min-h-0 flex flex-col text-gray-300 p-3 overflow-hidden">
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">Connection Test</CardTitle>
          <CardDescription className="text-xs">Test the connection authentication for your connector</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-auto scrollbar-custom space-y-3 pr-1 mb-5">
          <div className="flex-shrink-0">
            {authType === "credentials" &&
              authFields?.map((field) => (
                <div key={field.name} className="mb-5">
                  <label key={field.name} className="text-xs text-gray-300 mb-1 block">
                    {field?.label || field.name}
                  </label>
                  <Input
                    className="text-xs font-mono"
                    type={field.type}
                    name={field.name}
                    placeholder={field?.placeholder || `Enter ${field.name}`}
                    value={authData?.[field.name]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthData((prev: any) => ({ ...prev, [field.name]: e.target.value }))
                    }
                  />
                </div>
              ))}
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={isLoading || !activeFile}
            className="w-full flex-shrink-0 border rounded-sm"
            size="sm"
          >
            {isLoading ? "Testing..." : "Test Connection"}
          </Button>

          {testResult && (
            <div className="flex-1 flex flex-col min-h-32">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div className="flex-1 min-h-32">
                <JsonViewer data={testResult.result || testResult.error} height="200px" />
              </div>
              {testResult?.success && testResult?.result?.["validated"] && (
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
