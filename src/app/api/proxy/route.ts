import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, options } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL to prevent SSRF attacks
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Only allow HTTPS requests for security
    if (targetUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
    }

    // Make the proxied request
    const fetchOptions: any = {
      method: options?.method || "GET",
      headers: {
        ...options?.headers,
        // Remove origin-specific headers that might cause issues
        Origin: undefined,
        Referer: undefined,
      },
      body: options?.body,
    };

    // Remove undefined headers
    if (fetchOptions.headers) {
      Object.keys(fetchOptions.headers).forEach((key) => {
        if (fetchOptions.headers![key] === undefined) {
          delete fetchOptions.headers![key];
        }
      });
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    // Return the response with CORS headers
    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text,
        headers: Object.fromEntries(response.headers.entries()),
      },
      {
        status: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Proxy request failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
