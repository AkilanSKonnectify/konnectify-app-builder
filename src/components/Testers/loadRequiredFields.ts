import { ensureEsbuildInitialized } from "@/hooks/useEsbuild";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { PollTrigger, StaticWebhookTrigger, WebhookTrigger } from "@/types/konnectify-dsl";
import { FileData } from "@/types/localStorage";

export async function loadConfigFields(
  trigger: StaticWebhookTrigger | WebhookTrigger | PollTrigger | undefined,
  activeFile: FileData | undefined,
  ensureRunner: () => Promise<SandboxRunner>,
  append: any,
  timeout: number,
  authData: any = {}
) {
  if (!activeFile?.content || !trigger) return;

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
    const result = await runner.run(`triggers.${trigger.name}.config_fields.fields`, context, {
      proxyFetch: true,
      timeoutMs: timeout * 1000,
      operationData: {
        appId: activeFile.name,
        triggerKey: trigger,
      },
    });

    return result;
  } catch (err) {
    throw new Error("Failed to load config fields: " + String(err));
  }
}

export async function loadInputFields(
  trigger: StaticWebhookTrigger | WebhookTrigger | PollTrigger | undefined,
  activeFile: FileData | undefined,
  ensureRunner: () => Promise<SandboxRunner>,
  append: any,
  timeout: number,
  authData: any,
  configData: any = {}
) {
  if (!activeFile?.content) return;

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
    const result = await runner.run(`triggers.${trigger}.input_schema.fields`, context, {
      proxyFetch: true,
      timeoutMs: timeout * 1000,
      operationData: {
        appId: activeFile.name,
        triggerKey: trigger,
      },
    });

    return result;
  } catch (err) {
    throw new Error("Failed to load input fields: " + String(err));
  }
}
