import { ensureEsbuildInitialized } from "@/hooks/useEsbuild";
import { SandboxRunner } from "@/lib/sandboxRunner";
import { Field } from "@/types/konnectify-dsl";
import { FileData } from "@/types/localStorage";

export async function loadConfigFields(
  eventType: "triggers" | "actions",
  event: string | undefined,
  activeFile: FileData | undefined,
  ensureRunner: () => Promise<SandboxRunner>,
  append: any,
  timeout: number,
  authData: any
) {
  if (!activeFile?.content || !event) return;

  try {
    await ensureEsbuildInitialized();
    const runner = await ensureRunner();
    await runner.loadConnector(activeFile.content);

    // Parse input data
    let parsedAuth = {};
    let parsedEventData = {};
    let parsedConfig = {};

    try {
      parsedAuth = JSON.parse(authData);
    } catch (e) {
      append("warn", ["Invalid JSON in input data, using empty objects"]);
    }

    // Build context for event
    const context = {
      auth: parsedAuth,
      payload: {
        data: parsedEventData,
        config_fields: parsedConfig,
      },
    };

    // Run event config_fields.fields function
    const result: Field[] = await runner.run(
      `${eventType}.${event}.config_fields.fields`,
      context,
      {
        proxyFetch: true,
        timeoutMs: timeout * 1000,
        operationData: {
          appId: activeFile.name,
          operationKey: event,
        },
      },
      true
    );

    // result.forEach((field) => {
    //   if ("pick_list" in field) {
    //     if (typeof field?.pick_list === "function") {
    //       const pick_list = await field.pick_list(context as any);
    //       field.pick_list = pick_list as any;
    //     }
    //   }
    // });

    return result;
  } catch (err) {
    throw new Error("Failed to load config fields: " + String(err));
  }
}

export async function loadInputFields(
  eventType: "triggers" | "actions",
  event: string | undefined,
  activeFile: FileData | undefined,
  ensureRunner: () => Promise<SandboxRunner>,
  append: any,
  timeout: number,
  authData: any,
  configData: any = "{}"
) {
  if (!activeFile?.content || !event) return;

  try {
    await ensureEsbuildInitialized();
    const runner = await ensureRunner();
    await runner.loadConnector(activeFile.content);

    // Parse input data
    let parsedAuth = {};
    let parsedEventData = {};
    let parsedConfig = {};

    try {
      parsedAuth = JSON.parse(authData);
      parsedConfig = JSON.parse(configData);
    } catch (e) {
      append("warn", ["Invalid JSON in input data, using empty objects"]);
    }

    // Build context for event
    const context = {
      auth: parsedAuth,
      payload: {
        data: parsedEventData,
        config_fields: parsedConfig,
      },
    };

    // Run event input_schema.fields function
    const result = await runner.run(`${eventType}.${event}.input_schema.fields`, context, {
      proxyFetch: true,
      timeoutMs: timeout * 1000,
      operationData: {
        appId: activeFile.name,
        operationKey: event,
      },
    });

    return result;
  } catch (err) {
    throw new Error("Failed to load input fields: " + String(err));
  }
}
