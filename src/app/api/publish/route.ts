import { NextRequest, NextResponse } from "next/server";

// Configure route timeout to 6 minutes (360 seconds)
// This allows the route to handle long-running publish operations
export const maxDuration = 300; // 5 mins in seconds. Vercel limit for hobby plan is between 1 and 300

const DEPLOY_ENV_MAP = {
  PreStaging: "https://container.prestaging.us.konnectify.dev",
  Staging: "https://container.staging.us.konnectify.dev",
  Production: "https://container.us.konnectifyapp.co",
} as const;

type DeploymentEnv = keyof typeof DEPLOY_ENV_MAP;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deploymentEnv, deployFields } = body as {
      deploymentEnv?: DeploymentEnv;
      deployFields?: Record<string, any>;
    };

    if (!deploymentEnv || !(deploymentEnv in DEPLOY_ENV_MAP)) {
      return NextResponse.json(
        { error: "Invalid deployment environment" },
        { status: 400 },
      );
    }

    if (!deployFields || typeof deployFields !== "object") {
      return NextResponse.json(
        { error: "Missing deploy fields" },
        { status: 400 },
      );
    }

    const requiredFields = [
      "appId",
      "appVersion",
      "appName",
      "appCode",
      "commitMessage",
    ];
    const hasAllFields = requiredFields.every(
      (field) =>
        typeof deployFields[field] === "string" &&
        deployFields[field].trim() !== "",
    );

    if (!hasAllFields) {
      return NextResponse.json(
        { error: "Missing required deploy field values" },
        { status: 400 },
      );
    }

    const envUrl = DEPLOY_ENV_MAP[deploymentEnv];
    const targetUrl = `${envUrl}/ui/apps/${deployFields.appId}/publish-app`;

    // Create an AbortController with a 10-minute timeout (360000ms)
    // This gives us buffer beyond the expected 5-minute max deployment time
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deployFields),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await upstreamResponse.text();

      let parsedResponse: any = responseText;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        // Non-JSON response; leave as text
      }

      if (!upstreamResponse.ok) {
        const errorMessage =
          typeof parsedResponse === "string"
            ? parsedResponse || "Publish request failed"
            : parsedResponse?.error ||
              parsedResponse?.message ||
              "Publish request failed";

        return NextResponse.json(
          { error: errorMessage },
          { status: upstreamResponse.status },
        );
      }

      return NextResponse.json(
        {
          data: parsedResponse,
        },
        { status: upstreamResponse.status },
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout/abort errors
      if (fetchError.name === "AbortError" || controller.signal.aborted) {
        return NextResponse.json(
          {
            error:
              "Request timeout: The publish operation is taking longer than expected. Please check the deployment status manually.",
          },
          { status: 504 },
        );
      }

      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
