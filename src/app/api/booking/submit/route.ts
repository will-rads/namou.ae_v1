import { NextRequest, NextResponse } from "next/server";

interface BookingPayload {
  sourcePage: string;
  sourceAction: string;
  name: string;
  scheduled_day: string;
  scheduled_time: string;
  meeting_type: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  let body: BookingPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.sourcePage !== "/cta" || body.sourceAction !== "booking-confirm") {
    return NextResponse.json({ error: "Forbidden: invalid source" }, { status: 403 });
  }

  if (!body.scheduled_day || !body.scheduled_time || !body.meeting_type) {
    return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_BOOKING_WEBHOOK_URL;
  const webhookAuth = process.env.N8N_BOOKING_AUTH;

  if (!webhookUrl || !webhookAuth) {
    console.error("Missing N8N_BOOKING_WEBHOOK_URL or N8N_BOOKING_AUTH env vars");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Strip source markers, forward everything else
  const outbound: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key !== "sourcePage" && key !== "sourceAction") {
      outbound[key] = value;
    }
  }

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
      console.error(`n8n booking webhook returned ${upstream.status}: ${text}`);
      return NextResponse.json(
        { error: `Upstream error (${upstream.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("n8n booking webhook timed out after 15s");
      return NextResponse.json({ error: "Webhook timeout" }, { status: 504 });
    }
    console.error("n8n booking webhook fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach webhook" }, { status: 502 });
  }
}
