import { NextRequest, NextResponse } from "next/server";
import { getOAuthSession, deleteOAuthSession } from "../start/route";
import { ServerSandboxRunner } from "@/lib/serverSandboxRunner";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    const errorMsg = errorDescription || error;
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1e1e1e;
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .error {
              color: #ff6b6b;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <h2>OAuth Error</h2>
              <p>${errorMsg}</p>
            </div>
            <p>You can close this window.</p>
          </div>
          <script>
            window.opener?.postMessage({
              type: 'oauth-error',
              error: '${errorMsg}'
            }, '*');
            setTimeout(() => window.close(), 60000);
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Validate state and code
  if (!state || !code) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1e1e1e;
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .error {
              color: #ff6b6b;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <h2>OAuth Error</h2>
              <p>Missing authorization code or state parameter</p>
            </div>
            <p>You can close this window.</p>
          </div>
          <script>
            window.opener?.postMessage({
              type: 'oauth-error',
              error: 'Missing authorization code or state parameter'
            }, '*');
            setTimeout(() => window.close(), 60000);
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Get session
  const session = getOAuthSession(state);
  if (!session) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1e1e1e;
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .error {
              color: #ff6b6b;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <h2>OAuth Error</h2>
              <p>Invalid or expired OAuth session</p>
            </div>
            <p>You can close this window.</p>
          </div>
          <script>
            window.opener?.postMessage({
              type: 'oauth-error',
              error: 'Invalid or expired OAuth session'
            }, '*');
            setTimeout(() => window.close(), 60000);
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Exchange code for tokens using connector's authorize method
  try {
    // Use ServerSandboxRunner for server-side execution
    const runner = new ServerSandboxRunner();

    try {
      await runner.loadConnector(session.connectorCode);

      // Create context for authorize method
      const context = {
        auth: {
          code,
          ...session.credentials,
          redirect_uri: session.redirectUri,
        },
        payload: {},
      };

      console.log(context);

      // Call the connector's authorize method
      const tokens = await runner.run("connection.auth.authorize", context, {
        proxyFetch: true,
        timeoutMs: 30000,
        operationData: { appId: session.fileId },
      });

      console.log("Oauth tokens: ", tokens);

      // Clean up session
      deleteOAuthSession(state);

      runner.dispose();

      // Return success page that posts message to opener
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Success</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1e1e1e;
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 20px;
              }
              .success {
                color: #51cf66;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">
                <h2>✓ Authorization Successful</h2>
                <p>You can close this window.</p>
              </div>
            </div>
            <script>
              window.opener?.postMessage({
                type: 'oauth-success',
                tokens: ${JSON.stringify(tokens?.value || tokens)},
                fileId: '${session.fileId}'
              }, '*');
              setTimeout(() => window.close(), 1000);
            </script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    } catch (error: any) {
      runner.dispose();
      deleteOAuthSession(state);
      console.log(error);

      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #1e1e1e;
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 20px;
              }
              .error {
                color: #ff6b6b;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">
                <h2>OAuth Error</h2>
                <p>Failed to exchange authorization code: ${error.message || String(error)}</p>
              </div>
              <p>You can close this window.</p>
            </div>
            <script>
              window.opener?.postMessage({
                type: 'oauth-error',
                error: '${error.message || String(error)}'
              }, '*');
              setTimeout(() => window.close(), 60000);
            </script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  } catch (error: any) {
    deleteOAuthSession(state);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1e1e1e;
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .error {
              color: #ff6b6b;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <h2>OAuth Error</h2>
              <p>${error.message || String(error)}</p>
            </div>
            <p>You can close this window.</p>
          </div>
          <script>
            window.opener?.postMessage({
              type: 'oauth-error',
              error: '${error.message || String(error)}'
            }, '*');
            setTimeout(() => window.close(), 60000);
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
