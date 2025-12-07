import React, { useRef, useState, useEffect } from "react";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { useLogs } from "@/context/LogContext";
import { ensureEsbuildInitialized, useEsbuild } from "@/hooks/useEsbuild";
import { useEditor } from "@/context/EditorContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Actions, Field } from "@/types/konnectify-dsl";
import { loadConfigFields, loadInputFields } from "../loadRequiredFields";
import { cn } from "@/utils/utils";
import InputFields from "./InputFields";
import JsonViewer from "../JsonViewer";
import JsonEditor from "../JsonEditor";

export default function ActionTester() {
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
  const [isInputDataManual, setIsInputDataManual] = useState(true);
  const [inputData, setInputData] = useState("{}");
  const [configData, setConfigData] = useState("{}");
  const [selectedAction, setSelectedAction] = useState("");
  const [availableActions, setAvailableActions] = useState<Actions>();
  const [isConfigFieldsLoading, setIsConfigFieldsLoading] = useState(false);
  const [configFields, setConfigFields] = useState<Field[]>();
  const [isInputFieldsLoading, setIsInputFieldsLoading] = useState(false);
  const [inputFields, setInputFields] = useState<Field[]>();
  const [testResult, setTestResult] = useState<any>(null);

  const [testTab, setTestTab] = useState<"config" | "input" | "execute" | "output">("execute");

  const tabs: { id: "config" | "input" | "execute" | "output"; label: string }[] = [
    { id: "config", label: "Config fields" },
    { id: "input", label: "Input schema" },
    { id: "execute", label: "Execute data" },
    { id: "output", label: "Output schema" },
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
        setAvailableActions(actionOptions);
        const actionNames = Object.keys(actionOptions);
        if (actionNames.length > 0 && !selectedAction) {
          setSelectedAction(actionNames[0]);
        }
      }
    } catch (err) {
      append("warn", ["Could not load actions:", String(err)]);
    }
  }

  async function loadConfigAndInputFields() {
    if (!selectedAction) return;

    try {
      setConfigFields(undefined);
      setConfigData("{}");
      setInputFields(undefined);
      setInputData("{}");
      if (availableActions?.[selectedAction]?.has_config_fields) {
        append("info", ["Loading Config Fields...."]);
        setIsConfigFieldsLoading(true);
        const result = await loadConfigFields(
          "actions",
          selectedAction,
          activeFile,
          ensureRunner,
          append,
          timeout,
          authData
        );
        setConfigFields(result);
        append("info", ["Config fields loaded"]);
      } else {
        append("info", ["Loading Input Schema...."]);
        setIsInputFieldsLoading(true);
        const result = await loadInputFields(
          "actions",
          selectedAction,
          activeFile,
          ensureRunner,
          append,
          timeout,
          authData
        );
        setInputFields(result);
        append("info", ["Input schema loaded"]);
      }
    } catch (err) {
      append("error", [String(err)]);
    } finally {
      setIsConfigFieldsLoading(false);
      setIsInputFieldsLoading(false);
    }
  }

  async function loadInputFieldsWithConfigData() {
    if (!selectedAction) return;

    try {
      append("info", ["Loading Input Schema...."]);
      setIsInputFieldsLoading(true);
      const result = await loadInputFields(
        "actions",
        selectedAction,
        activeFile,
        ensureRunner,
        append,
        timeout,
        authData,
        configData
      );
      setInputFields(result);
      append("info", ["Input schema loaded"]);
    } catch (err) {
      append("error", [String(err)]);
    } finally {
      setIsConfigFieldsLoading(false);
      setIsInputFieldsLoading(false);
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
    append("info", [`Starting action test for: ${selectedAction}: ${testTab}...`]);

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
        parsedActionData = JSON.parse(inputData);
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
      const result = await runner.run(
        `actions.${selectedAction}.${
          testTab === "execute"
            ? "execute"
            : `${
                testTab === "config" ? "config_fields" : testTab === "input" ? "input_schema" : "output_schema"
              }.fields`
        }`,
        context,
        {
          proxyFetch: true,
          timeoutMs: timeout * 1000,
          operationData: {
            appId: activeFile.name,
            operationKey: selectedAction,
          },
        },
        testTab === "config" || testTab === "input"
      );

      setTestResult({ success: true, result });
      append("info", [`Action ${selectedAction}: ${testTab} executed successfully:`, result]);
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
      loadAvailableActions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  useEffect(() => {
    if (selectedConnection) {
      setAuthData(JSON.stringify(selectedConnection?.fields));
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (selectedAction) {
      loadConfigAndInputFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAction, authData]);

  useEffect(() => {
    if (configFields) {
      const isAllConfigDataCovered = configFields?.every((field) => {
        const parsedConfigData = JSON.parse(configData);
        return field.name in parsedConfigData && parsedConfigData[field.name];
      });
      if (!isAllConfigDataCovered) {
        setInputFields([]);
        setInputData("{}");
      } else {
        loadInputFieldsWithConfigData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configData, configFields]);

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
                {Object.keys(availableActions || {}).map((action) => (
                  <SelectItem
                    className="text-xs text-gray-300 bg-grey-500 border border-slate-700 hover:bg-gray-700 hover:text-white cursor-pointer"
                    key={action}
                    value={action}
                  >
                    {availableActions?.[action].title || availableActions?.[action].name || action}
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

          {testTab !== "config" && selectedAction && (
            <InputFields
              selectedAction={selectedAction}
              hasConfigFields={availableActions?.[selectedAction]?.has_config_fields}
              isInputDataManual={isInputDataManual}
              setIsInputDataManual={setIsInputDataManual}
              configData={configData}
              setConfigData={setConfigData}
              configFields={configFields}
              inputData={inputData}
              setInputData={setInputData}
              isConfigFieldsLoading={isConfigFieldsLoading}
              inputFields={inputFields}
              isInputFieldsLoading={isInputFieldsLoading}
              testTab={testTab}
            />
          )}

          <Button
            onClick={handleTestAction}
            disabled={isLoading || !activeFile || !selectedAction}
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
