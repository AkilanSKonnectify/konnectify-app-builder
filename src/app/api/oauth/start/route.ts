import { NextRequest, NextResponse } from "next/server";
import { ServerSandboxRunner } from "@/lib/serverSandboxRunner";

// In-memory store for OAuth sessions (in production, use Redis or database)
const oauthSessions = new Map<
  string,
  {
    connectorCode: string;
    credentials: any;
    redirectUri: string;
    fileId: string;
    timestamp: number;
  }
>();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [state, session] of (oauthSessions as any).entries()) {
    if (session.timestamp < oneHourAgo) {
      oauthSessions.delete(state);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectorCode, fileId, credentials } = body;

    if (!connectorCode || !fileId) {
      return NextResponse.json({ error: "connectorCode and fileId are required" }, { status: 400 });
    }

    // Load connector in sandbox to extract OAuth config
    // Use ServerSandboxRunner for server-side execution
    const runner = new ServerSandboxRunner();
    try {
      await runner.loadConnector(connectorCode);

      // Get connection config
      const connection = await runner.run("connection", {}, { timeoutMs: 5000 });
      // Handle both direct return and wrapped return
      const connectionValue = connection?.value || connection;
      const authConfig = connectionValue?.auth;

      if (!authConfig || authConfig.type !== "oauth2") {
        runner.dispose();
        return NextResponse.json({ error: "Connector does not use OAuth2 authentication" }, { status: 400 });
      }

      //   // Extract OAuth configuration
      //   const clientId = credentials?.client_id || authConfig.client_id?.replace(/\{\{client_id\}\}/g, "") || "";
      //   const clientSecret =
      //     credentials?.client_secret || authConfig.client_secret?.replace(/\{\{client_secret\}\}/g, "") || "";
      const authorizationUrl = authConfig.authorization_url || "";
      const tokenUrl = authConfig.token_url || "";

      //   if (!clientId || !clientSecret) {
      //     runner.dispose();
      //     return NextResponse.json({ error: "Client ID and Client Secret are required" }, { status: 400 });
      //   }

      // Generate state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Get redirect URI (use current origin + /api/oauth/redirect)
      const origin = request.headers.get("origin") || request.nextUrl.origin;
      const redirectUri = `${origin}/api/oauth/redirect`;

      // Store session
      oauthSessions.set(state, {
        connectorCode,
        redirectUri,
        fileId,
        timestamp: Date.now(),
        credentials,
      });

      // Build authorization URL
      let authUrl = authorizationUrl
        .replace(/\{\{(.*?)\}\}/g, (_: string, key: string) => {
          return credentials[key.trim()] ?? `{{${key}}}`; // keeps original if not found
        })
        .replace(/\{\{redirect_uri\}\}/g, encodeURIComponent(redirectUri));

      if (authUrl.includes("{{client_id}}"))
        return NextResponse.json({ error: "Client ID is required" }, { status: 400 });

      // Add state parameter if not already present
      if (!authUrl.includes("state=")) {
        const separator = authUrl.includes("?") ? "&" : "?";
        authUrl += `${separator}state=${encodeURIComponent(state)}`;
      }

      runner.dispose();

      return NextResponse.json({
        authUrl,
        state,
      });
    } catch (error: any) {
      runner.dispose();
      return NextResponse.json({ error: `Failed to process connector: ${error.message}` }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to start OAuth flow" }, { status: 500 });
  }
}

// Export function to get session (for redirect handler)
export function getOAuthSession(state: string) {
  return oauthSessions.get(state);
}

export function deleteOAuthSession(state: string) {
  oauthSessions.delete(state);
}
