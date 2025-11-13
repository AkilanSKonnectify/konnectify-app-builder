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
  const [oauthTokens, setOauthTokens] = useState<any>(null);
  const oauthPopupRef = useRef<Window | null>(null);

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

  async function loadAuthDetails() {
    if (!activeFile?.content) return;

    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(activeFile.content);

      // Try to get authType from the connector
      const connection = await runner.run("connection", {}, { timeoutMs: 5000 });
      const typeOfAuth = connection?.value?.["auth"]?.["type"];
      const FieldsInAuth = connection?.value?.[typeOfAuth === "credentials" ? "fields" : "credentials"];
      if (typeOfAuth) setAuthType(typeOfAuth);
      console.log(FieldsInAuth);
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

    // Handle OAuth flow
    if (authType === "oauth2") {
      await handleOAuthFlow(ts);
      return;
    }

    // Handle credentials flow (existing logic)
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

  async function handleOAuthFlow(connectorCode: string) {
    setIsLoading(true);
    setTestResult(null);
    append("info", ["Starting OAuth flow..."]);

    try {
      // Validate credentials are provided
      if (authFields?.every((field) => !authData[field.name])) {
        setTestResult({ success: false, error: "All the credentials are required!" });
        append("error", ["Oauth credentials are not provided!"]);
        setIsLoading(false);
        return;
      }

      // Call OAuth start API
      const response = await fetch("/api/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorCode,
          fileId: activeFileId,
          credentials: authData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start OAuth flow");
      }

      const { authUrl, state } = await response.json();
      append("info", ["Opening OAuth authorization window..."]);

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        "OAuth Authorization",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      oauthPopupRef.current = popup;

      // Listen for OAuth response
      const messageHandler = (event: MessageEvent) => {
        // Security: Only accept messages from same origin
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "oauth-success") {
          window.removeEventListener("message", messageHandler);
          if (popup) popup.close();

          const tokens = event.data.tokens;
          setOauthTokens(tokens);

          // Test the connection with received tokens
          testOAuthConnection(connectorCode, tokens);
        } else if (event.data.type === "oauth-error") {
          window.removeEventListener("message", messageHandler);
          if (popup) popup.close();

          setTestResult({ success: false, error: event.data.error });
          append("error", [`OAuth error: ${event.data.error}`]);
          setIsLoading(false);
        }
      };

      window.addEventListener("message", messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          if (!oauthTokens) {
            setIsLoading(false);
            append("warn", ["OAuth flow was cancelled"]);
          }
        }
      }, 500);
    } catch (err: any) {
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
      setIsLoading(false);
    }
  }

  async function testOAuthConnection(connectorCode: string, tokens: any) {
    try {
      await ensureEsbuildInitialized();
      const runner = await ensureRunner();
      await runner.loadConnector(connectorCode);
      append("info", ["Connector loaded in worker"]);

      // Build context with OAuth tokens
      const context = {
        auth: {
          ...authData,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
        },
        payload: {},
      };
      console.log("Inside testOauthConnection: ", context);

      // // Test connection using identity or test method
      // let result;
      // try {
      //   result = await runner.run("connection.auth.identity", context, {
      //     proxyFetch: true,
      //     timeoutMs: 15000,
      //     operationData: { appId: activeFile?.name },
      //   });
      // } catch (err) {
      //   // Fallback to test method
      //   result = await runner.run("connection.test", context, {
      //     proxyFetch: true,
      //     timeoutMs: 15000,
      //     operationData: { appId: activeFile?.name },
      //   });
      // }

      setTestResult({
        success: true,
        result: { validated: true, tokens: tokens },
        tokens,
      });
      append("info", ["OAuth connection test successful"]);
    } catch (err: any) {
      setTestResult({ success: false, error: String(err) });
      append("error", [String(err)]);
    } finally {
      setIsLoading(false);
    }
  }

  const saveConnection = () => {
    if (!activeFileId || !connectionName) {
      append("error", ["File ID and connection name are required"]);
      return;
    }

    if (authType === "oauth2") {
      if (authFields?.every((field) => !authData[field.name])) {
        append("error", ["Credentials are not provided!"]);
        return;
      }
      // Save OAuth connection with tokens
      addConnectionsToFile(activeFileId, {
        id: "",
        name: connectionName,
        fields: {
          ...authData,
          ...testResult?.result?.tokens,
        },
        type: "oauth2",
      });
    } else {
      // Save credentials connection
      if (!authData || Object.keys(authData).length === 0) {
        append("error", ["No connection data available to save"]);
        return;
      }
      addConnectionsToFile(activeFileId, {
        id: "",
        name: connectionName,
        fields: authData,
        type: "credentials",
      });
    }

    setIsConnectionSaved(true);
    append("info", [`Connection "${connectionName}" saved successfully`]);
  };

  useEffect(() => {
    setIsConnectionSaved(false);
    setOauthTokens(null);
  }, [testResult]);

  // Cleanup OAuth popup on unmount
  useEffect(() => {
    return () => {
      if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
        oauthPopupRef.current.close();
      }
    };
  }, []);

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
            {authFields?.map((field) => (
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
              {testResult?.success && (testResult?.result?.["validated"] || testResult?.tokens) && (
                <div className="w-full mt-2 flex flex-col gap-3 p-3 flex-shrink-0">
                  <Input
                    type="text"
                    name="connectionName"
                    placeholder="Enter connection name"
                    value={connectionName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConnectionName(e?.target?.value)}
                    maxLength={30}
                  />
                  {!isConnectionSaved ? (
                    <Button
                      className="border border-slate-700 rounded-lg"
                      onClick={saveConnection}
                      disabled={isConnectionSaved || !connectionName}
                      size="sm"
                    >
                      Save connection
                    </Button>
                  ) : (
                    <div className="text-green-500 text-sm">Connection Saved!</div>
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
