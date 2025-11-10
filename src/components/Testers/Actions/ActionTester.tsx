import React, { useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import JsonViewer from "../JsonViewer";
import JsonEditor from "../JsonEditor";

export default function ActionTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [timeout, setTimeout] = useState<number>(30);
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

  async function loadAvailableActions() {
    if (!activeFile?.content) return;

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Try to get actions from the connector
      const actions = await runner.run("actions", {}, { timeoutMs: 5000 });
      const actionOptions = actions?.value;
      if (actionOptions && typeof actionOptions === "object") {
        const actionNames = Object.keys(actionOptions);
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
      };

      // Run action execute function
      const result = await runner.run(`actions.${selectedAction}.execute`, context, {
        proxyFetch: true,
        timeoutMs: timeout * 1000,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  return (
    <div className="h-full min-h-0 flex flex-col text-gray-300 p-3 overflow-hidden">
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">Action Test</CardTitle>
          <CardDescription className="text-xs">Test action execution functionality for your connector</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-auto scrollbar-custom space-y-3 pr-1 mb-5">
          <div className="text-xs flex justify-start gap-3 flex-shrink-0">
            <span>Set timeout(in sec): </span>
            <Input
              className="h-4 w-20"
              type="number"
              name="timeout"
              placeholder="in seconds"
              value={timeout}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeout(parseInt(e?.target?.value))}
            />
          </div>
          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Select Action</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent className="bg-[#252526] border border-slate-700 text-gray-100">
                {availableActions.map((action) => (
                  <SelectItem
                    className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                    key={action}
                    value={action}
                  >
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Auth Data (JSON)</label>
            <JsonEditor
              value={authData}
              onChange={setAuthData}
              placeholder='{\n  "access_token": "your_token"\n}'
              height="120px"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Input Fields (JSON)</label>
            <JsonEditor
              value={actionData}
              onChange={setActionData}
              placeholder='{\n  "name": "John Doe",\n  "email": "john@example.com"\n}'
              height="120px"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
            <JsonEditor
              value={configData}
              onChange={setConfigData}
              placeholder='{\n  "module": "Contact"\n}'
              height="120px"
            />
          </div>

          <Button
            onClick={handleTestAction}
            disabled={isLoading || !activeFile || !selectedAction}
            className="w-full flex-shrink-0"
            size="sm"
          >
            {isLoading ? "Testing..." : "Test Action"}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
