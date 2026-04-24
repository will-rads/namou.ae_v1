import { NextRequest, NextResponse } from "next/server";

interface OfferPayload {
  sourcePage: string;
  sourceAction: string;
  agreement_type: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  // Parse body
  let body: OfferPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Source validation — reject unless explicitly from /offer popup submit
  if (body.sourcePage !== "/offer" || body.sourceAction !== "offer-popup-submit") {
    return NextResponse.json({ error: "Forbidden: invalid source" }, { status: 403 });
  }

  if (!body.agreement_type) {
    return NextResponse.json({ error: "Missing agreement_type" }, { status: 400 });
  }

  // Env vars
  const webhookUrl = process.env.N8N_OFFER_WEBHOOK_URL;
  const webhookAuth = process.env.N8N_OFFER_AUTH;

  if (!webhookUrl || !webhookAuth) {
    console.error("Missing N8N_OFFER_WEBHOOK_URL or N8N_OFFER_AUTH env vars");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Build outbound payload — strip source markers, forward everything else
  const outbound: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key !== "sourcePage" && key !== "sourceAction") {
      outbound[key] = value;
    }
  }

  // Forward to n8n webhook
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        auth: webhookAuth,
      },
      body: JSON.stringify(outbound),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error(`n8n webhook returned ${upstream.status}: ${text}`);
      return NextResponse.json(
        { error: `Upstream error (${upstream.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("n8n webhook timed out after 15s");
      return NextResponse.json({ error: "Webhook timeout" }, { status: 504 });
    }
    console.error("n8n webhook fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach webhook" }, { status: 502 });
  }
}
