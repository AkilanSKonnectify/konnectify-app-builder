import React, { useEffect, useRef, useState } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, Triggers } from "@/types/konnectify-dsl";
import { loadConfigFields } from "../loadRequiredFields";
import { cn } from "@/utils/utils";
import InputFields from "./InputFields";
import JsonViewer from "../JsonViewer";
import JsonEditor from "../JsonEditor";

export default function TriggerTester() {
  useEsbuild();

  const { files, activeFileId } = useEditor();
  const activeFile = files.find((f) => f.id === activeFileId);
  const connections = activeFile?.connections;

  const runnerRef = useRef<SandboxRunner | null>(null);
  const { append } = useLogs();
  const [isLoading, setIsLoading] = useState(false);
  const [timeout, setTimeout] = useState<number>(30);
  const [authData, setAuthData] = useState("{}");
  const [isAuthDataManual, setIsAuthDataManual] = useState(connections?.length === 0);
  const [selectedConnection, setSelectedConnection] = useState(connections?.length ? connections?.[0] : null);
  const [isConfigDataManual, setIsConfigDataManual] = useState(true);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const [additionalTriggerData, setAdditionalTriggerData] = useState(
    JSON.stringify({ since: fiveMinutesAgo.toISOString(), till: now.toISOString(), cursor: null })
  );
  const [configData, setConfigData] = useState("{}");
  const [selectedTrigger, setSelectedTrigger] = useState<string>();
  const [triggerType, setTriggerType] = useState<"poll" | "webhook">();
  const [availableTriggers, setAvailableTriggers] = useState<Triggers>();
  const [isConfigFieldsLoading, setIsConfigFieldsLoading] = useState(false);
  const [configFields, setConfigFields] = useState<Field[]>();
  const [testResult, setTestResult] = useState<any>(null);

  const [testTab, setTestTab] = useState<"config" | "sample" | "poll" | "output">("poll");

  const tabs: { id: "config" | "sample" | "poll" | "output"; label: string }[] = [
    { id: "config", label: "Config fields" },
    { id: "sample", label: "Sample data" },
    { id: "poll", label: "Poll data" },
    { id: "output", label: "Output Schema" },
  ];

  async function ensureRunner() {
    if (!runnerRef.current) {
      runnerRef.current = new SandboxRunner();

      runnerRef.current.onConsole = (level, args) =>
        append(level === "info" ? "info" : level === "warn" ? "warn" : level === "debug" ? "debug" : "error", args);

      runnerRef.current.onNetworkRequest = async (req, respond) => {
        try {
          // Use proxyFetch to handle CORS issues in production
          const { proxyFetch } = await import("@/utils/proxyFetch");
          const r = await proxyFetch(req.url, req.options);
          const text = await r.text();
          respond({ ok: r.ok, status: r.status, statusText: r.statusText, text });
        } catch (err) {
          respond({ error: String(err) });
        }
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
        setAvailableTriggers(triggerOptions);
        const triggerNames = Object.keys(triggerOptions);
        if (triggerNames.length > 0 && !selectedTrigger) {
          setSelectedTrigger(triggerNames[0]);
          const typeOfTrigger = triggerOptions[triggerNames[0]]["type"] === "webhook" ? "webhook" : "poll";
          setTriggerType(typeOfTrigger);
        }
      }
    } catch (err) {
      console.log(err);
      append("warn", ["Could not load triggers:", String(err)]);
    }
  }

  async function loadConfigAndInputFields() {
    if (!selectedTrigger || !availableTriggers?.[selectedTrigger]?.has_config_fields) return;

    try {
      append("info", ["Config Loading Config Fields...."]);
      setIsConfigFieldsLoading(true);
      const result = await loadConfigFields(
        "triggers",
        selectedTrigger,
        activeFile,
        ensureRunner,
        append,
        timeout,
        authData
      );
      setConfigFields(result);
      append("info", ["Config fields loaded"]);
    } catch (err) {
      append("error", [String(err)]);
    } finally {
      setIsConfigFieldsLoading(false);
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
    append("info", [`Starting trigger test for: ${selectedTrigger}: ${testTab}...`]);

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
        parsedTriggerData = { ...JSON.parse(additionalTriggerData) };
        parsedConfig = JSON.parse(configData);
      } catch (e) {
        append("warn", ["Invalid JSON in input data, using empty objects:", String(e)]);
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
      const result = await runner.run(
        `triggers.${selectedTrigger}.${
          testTab === "poll"
            ? "poll"
            : testTab === "sample"
            ? "sample"
            : `${testTab === "config" ? "config_fields" : "output_schema"}.fields`
        }`,
        context,
        {
          proxyFetch: true,
          timeoutMs: timeout * 1000,
          operationData: {
            appId: activeFile.name,
            triggerKey: selectedTrigger,
          },
        },
        testTab === "config"
      );

      setTestResult({ success: true, result });
      append("info", [`Trigger ${selectedTrigger}: ${testTab} executed successfully:`, result]);
    } catch (err: any) {
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeFile) {
      loadAvailableTriggers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  useEffect(() => {
    if (selectedConnection) {
      setAuthData(JSON.stringify(selectedConnection?.fields));
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (selectedTrigger) {
      loadConfigAndInputFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrigger, authData]);

  return (
    <div className="h-full min-h-0 flex flex-col text-gray-300 p-3 overflow-hidden">
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-sm">Trigger Test</CardTitle>
          <CardDescription className="text-xs">Test trigger polling functionality for your connector</CardDescription>
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
          <div className="text-xs text-gray-300 flex-shrink-0">
            <label className="mb-1 block">Select Trigger</label>
            <Select
              value={selectedTrigger}
              onValueChange={(triggerId) => {
                setSelectedTrigger(triggerId);
                const typeOfTrigger = availableTriggers?.[triggerId]["type"] === "webhook" ? "webhook" : "poll";
                setTriggerType(typeOfTrigger);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a trigger" />
              </SelectTrigger>
              <SelectContent className="bg-[#252526] border border-slate-700 text-gray-100">
                {Object.keys(availableTriggers || {}).map((trigger) => (
                  <SelectItem
                    className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                    key={trigger}
                    value={trigger}
                  >
                    {availableTriggers?.[trigger].title || availableTriggers?.[trigger].name || trigger}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-300 mb-1 block">Auth Data {isAuthDataManual && "(JSON)"}</label>
              <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30] rounded overflow-hidden text-gray-300">
                <Button
                  onClick={() => setIsAuthDataManual(true)}
                  size="sm"
                  className={cn(
                    "rounded-none border-r border-gray-600 text-gray-300",
                    isAuthDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
                  )}
                >
                  {"{}"}
                </Button>
                <Button
                  onClick={() => setIsAuthDataManual(false)}
                  disabled={!connections}
                  size="sm"
                  className={cn(
                    "rounded-none border-r border-gray-600 text-gray-300",
                    !isAuthDataManual ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d30] text-[#969696]"
                  )}
                >
                  Load
                </Button>
              </div>
            </div>
            {isAuthDataManual ? (
              <JsonEditor
                value={authData}
                onChange={setAuthData}
                placeholder='{\n  "access_token": "your_token"\n}'
                height="120px"
              />
            ) : (
              <Select
                value={selectedConnection?.id}
                onValueChange={(e) =>
                  setSelectedConnection(connections?.find((connection) => connection.id === e) || null)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a connection" />
                </SelectTrigger>
                <SelectContent className="bg-[#252526] border border-slate-700 text-gray-100">
                  {connections?.map((connection) => (
                    <SelectItem
                      className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                      key={connection.id}
                      value={connection.id}
                    >
                      {connection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-shrink-0">
            <label className="text-xs text-gray-300 mb-1 block">Additional data (JSON)</label>
            <JsonEditor
              value={additionalTriggerData}
              onChange={setAdditionalTriggerData}
              placeholder='{\n  "since": "2024-01-01T00:00:00Z",\n  "till": "2024-12-31T23:59:59Z",\n  "cursor": null\n}'
              height="120px"
            />
          </div>

          <div className="flex border-b border-[#1e1e1e] bg-[#2d2d30] flex-shrink-0 sticky top-0 z-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTestTab(tab.id)}
                className={`flex-1 px-2 py-2.5 border-none cursor-pointer text-xs ${
                  testTab === tab.id
                    ? "bg-[#1e1e1e] text-white border-b-2 border-b-[#0e639c]"
                    : "bg-[#2d2d30] text-[#969696]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {testTab !== "config" && selectedTrigger && availableTriggers?.[selectedTrigger]?.has_config_fields && (
            <InputFields
              selectedTrigger={selectedTrigger}
              isConfigDataManual={isConfigDataManual}
              setIsConfigDataManual={setIsConfigDataManual}
              configData={configData}
              setConfigData={setConfigData}
              configFields={configFields}
              isConfigFieldsLoading={isConfigFieldsLoading}
              triggerType={triggerType}
            />
          )}

          <Button
            onClick={handleTestTrigger}
            disabled={isLoading || !activeFile || !selectedTrigger}
            className="w-full flex-shrink-0 border rounded-sm"
            size="sm"
          >
            {isLoading ? "Testing..." : `Test ${testTab}`}
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
