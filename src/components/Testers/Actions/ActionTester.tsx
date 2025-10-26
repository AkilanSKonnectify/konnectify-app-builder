import React, { useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ActionTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState("{}");
  const [actionData, setActionData] = useState("{}");
  const [configData, setConfigData] = useState("{}");
  const [selectedAction, setSelectedAction] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);
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

  async function loadAvailableActions() {
    if (!activeFile?.content) return;

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Try to get actions from the connector
      const actions = await runner.run("actions", {}, { timeoutMs: 5000 });
      if (actions && typeof actions === "object") {
        const actionNames = Object.keys(actions);
        setAvailableActions(actionNames);
        if (actionNames.length > 0 && !selectedAction) {
          setSelectedAction(actionNames[0]);
        }
      }
    } catch (err) {
      append("warn", ["Could not load actions:", String(err)]);
    }
  }

  async function handleTestAction() {
    if (!activeFile?.content) {
      append("error", ["No active file to test"]);
      return;
    }

    if (!selectedAction) {
      append("error", ["Please select an action to test"]);
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    append("info", [`Starting action test for: ${selectedAction}`]);

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Parse input data
      let parsedAuth = {};
      let parsedActionData = {};
      let parsedConfig = {};

      try {
        parsedAuth = JSON.parse(authData);
        parsedActionData = JSON.parse(actionData);
        parsedConfig = JSON.parse(configData);
      } catch (e) {
        append("warn", ["Invalid JSON in input data, using empty objects"]);
      }

      // Build context for action
      const context = {
        auth: parsedAuth,
        payload: {
          data: parsedActionData,
          config_fields: parsedConfig,
        },
        logger: {
          info: (...args: any[]) => append("info", args),
          error: (...args: any[]) => append("error", args),
          debug: (...args: any[]) => append("debug", args),
          warn: (...args: any[]) => append("warn", args),
        },
      };

      // Run action execute function
      const result = await runner.run(`actions.${selectedAction}.execute`, context, {
        proxyFetch: true,
        timeoutMs: 30000,
        operationData: {
          appId: activeFile.name,
          operationKey: selectedAction,
        },
      });

      setTestResult({ success: true, result });
      append("info", [`Action ${selectedAction} executed successfully:`, result]);
    } catch (err: any) {
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (activeFile) {
      loadAvailableActions();
    }
  }, [activeFile]);

  return (
    <div className="space-y-4 text-gray-300">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Action Test</CardTitle>
          <CardDescription className="text-xs">Test action execution functionality for your connector</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-gray-300 mb-1 block">Select Action</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1 block">Auth Data (JSON)</label>
            <Textarea
              value={authData}
              onChange={(e) => setAuthData(e.target.value)}
              placeholder='{"access_token": "your_token"}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1 block">Action Data (JSON)</label>
            <Textarea
              value={actionData}
              onChange={(e) => setActionData(e.target.value)}
              placeholder='{"name": "John Doe", "email": "john@example.com"}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
            <Textarea
              value={configData}
              onChange={(e) => setConfigData(e.target.value)}
              placeholder='{"module": "Contact"}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <Button
            onClick={handleTestAction}
            disabled={isLoading || !activeFile || !selectedAction}
            className="w-full"
            size="sm"
          >
            {isLoading ? "Testing..." : "Test Action"}
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
