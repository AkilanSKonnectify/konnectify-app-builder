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
import { Input } from "@/components/ui/input";

export default function TriggerTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [timeout, setTimeout] = useState<number>(30);
  const [authData, setAuthData] = useState("{}");
  const [triggerData, setTriggerData] = useState(
    '{"since": "2024-01-01T00:00:00Z", "till": "2024-12-31T23:59:59Z", "cursor": null}'
  );
  const [configData, setConfigData] = useState("{}");
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [availableTriggers, setAvailableTriggers] = useState<string[]>([]);
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

  async function loadAvailableTriggers() {
    if (!activeFile?.content) return;

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Try to get triggers from the connector
      const triggers = await runner.run("triggers", {}, { timeoutMs: 5000 });
      const triggerOptions = triggers?.value;
      if (triggerOptions && typeof triggerOptions === "object") {
        const triggerNames = Object.keys(triggerOptions);
        setAvailableTriggers(triggerNames);
        if (triggerNames.length > 0 && !selectedTrigger) {
          setSelectedTrigger(triggerNames[0]);
        }
      }
    } catch (err) {
      console.log(err);
      append("warn", ["Could not load triggers:", String(err)]);
    }
  }

  async function handleTestTrigger() {
    if (!activeFile?.content) {
      append("error", ["No active file to test"]);
      return;
    }

    if (!selectedTrigger) {
      append("error", ["Please select a trigger to test"]);
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    append("info", [`Starting trigger test for: ${selectedTrigger}`]);

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Parse input data
      let parsedAuth = {};
      let parsedTriggerData = {};
      let parsedConfig = {};

      try {
        parsedAuth = JSON.parse(authData);
        parsedTriggerData = JSON.parse(triggerData);
        parsedConfig = JSON.parse(configData);
      } catch (e) {
        append("warn", ["Invalid JSON in input data, using empty objects"]);
      }

      // Build context for trigger
      const context = {
        auth: parsedAuth,
        payload: {
          data: parsedTriggerData,
          config_fields: parsedConfig,
        },
      };

      // Run trigger poll function
      const result = await runner.run(`triggers.${selectedTrigger}.poll`, context, {
        proxyFetch: true,
        timeoutMs: timeout * 1000,
        operationData: {
          appId: activeFile.name,
          triggerKey: selectedTrigger,
        },
      });

      setTestResult({ success: true, result });
      append("info", [`Trigger ${selectedTrigger} executed successfully:`, result]);
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
      loadAvailableTriggers();
    }
  }, [activeFile]);

  return (
    <div className="h-full flex flex-col text-gray-300 p-3">
      <Card className="flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">Trigger Test</CardTitle>
          <CardDescription className="text-xs">Test trigger polling functionality for your connector</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 overflow-hidden space-y-3">
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
          <div className="text-xs text-gray-300 flex-shrink-0">
            <label className="mb-1 block">Select Trigger</label>
            <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a trigger" />
              </SelectTrigger>
              <SelectContent className="bg-[#252526] border border-slate-700 text-gray-100">
                {availableTriggers.map((trigger) => (
                  <SelectItem
                    className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                    key={trigger}
                    value={trigger}
                  >
                    {trigger}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Auth Data (JSON)</label>
            <Textarea
              value={authData}
              onChange={(e) => setAuthData(e.target.value)}
              placeholder='{"access_token": "your_token"}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Trigger Data (JSON)</label>
            <Textarea
              value={triggerData}
              onChange={(e) => setTriggerData(e.target.value)}
              placeholder='{"since": "2024-01-01T00:00:00Z", "till": "2024-12-31T23:59:59Z", "cursor": null}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Config Fields (JSON)</label>
            <Textarea
              value={configData}
              onChange={(e) => setConfigData(e.target.value)}
              placeholder='{"module": "Contact"}'
              className="min-h-[60px] text-xs font-mono"
            />
          </div>

          <Button
            onClick={handleTestTrigger}
            disabled={isLoading || !activeFile || !selectedTrigger}
            className="w-full flex-shrink-0"
            size="sm"
          >
            {isLoading ? "Testing..." : "Test Trigger"}
          </Button>

          {testResult && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div className="bg-gray-800 p-2 rounded text-xs font-mono flex-1 overflow-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.result || testResult.error, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
