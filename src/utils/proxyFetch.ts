/**
 * Proxies fetch requests through the Next.js API route to avoid CORS issues
 * in production deployments.
 *
 * In development (localhost), it tries direct fetch first and falls back to proxy if CORS fails.
 * In production, it always uses the proxy to avoid CORS issues.
 */
export async function proxyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // Server-side: use direct fetch (no CORS restrictions)
    return fetch(url, options);
  }

  // Check if we're in development (localhost)
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (isDevelopment) {
    // In development, try direct fetch first
    try {
      const response = await fetch(url, options);
      // If the response is ok, return it
      if (response.ok || response.status < 500) {
        return response;
      }
    } catch (error: any) {
      // If direct fetch fails (likely CORS), fall back to proxy
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        console.warn("Direct fetch failed (likely CORS), using proxy:", error.message);
      } else {
        // Re-throw non-CORS errors
        throw error;
      }
    }
  }

  // In production or if direct fetch fails, use proxy
  try {
    const proxyUrl = "/api/proxy";
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Proxy request failed" }));
      throw new Error(errorData.error || `Proxy request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Create a Response-like object that matches the fetch API
    const responseText = data.text || "";
    const responseHeaders = new Headers();

    // Add headers from the proxied response
    if (data.headers) {
      Object.entries(data.headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          responseHeaders.set(key, value);
        }
      });
    }

    return {
      ok: data.ok,
      status: data.status,
      statusText: data.statusText || "",
      headers: responseHeaders,
      text: async () => responseText,
      json: async () => {
        try {
          return JSON.parse(responseText);
        } catch (e) {
          throw new Error("Invalid JSON response: " + (e as Error).message);
        }
      },
      blob: async () => new Blob([responseText]),
      arrayBuffer: async () => {
        const encoder = new TextEncoder();
        return encoder.encode(responseText).buffer;
      },
      clone: function () {
        return this;
      },
      redirected: false,
      type: "basic" as ResponseType,
      url: url,
      body: null,
      bodyUsed: false,
    } as Response;
  } catch (error) {
    // If proxy also fails, throw the error
    throw error;
  }
}
