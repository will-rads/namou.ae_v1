import { NextResponse } from "next/server";

/** Server-side resolver for shortened Google Maps URLs.
 *  Follows the HTTP redirect and extracts coordinates from the full URL. */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    if (!url.includes("maps.app.goo.gl") && !url.includes("goo.gl/maps")) {
      return NextResponse.json({ error: "Not a shortened Google Maps URL" }, { status: 400 });
    }

    // Follow the redirect (manual = don't follow, just get Location header)
    const res = await fetch(url, { redirect: "manual" });
    let fullUrl = res.headers.get("location") || "";

    // Sometimes there's a chain — follow one more redirect if needed
    if (fullUrl && !fullUrl.includes("@") && !fullUrl.includes("!3d")) {
      try {
        const res2 = await fetch(fullUrl, { redirect: "manual" });
        const loc2 = res2.headers.get("location");
        if (loc2) fullUrl = loc2;
      } catch { /* use first redirect */ }
    }

    if (!fullUrl) {
      return NextResponse.json({ error: "No redirect found" }, { status: 422 });
    }

    // Extract coordinates: @lat,lng
    const atMatch = fullUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return NextResponse.json({
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
        fullUrl,
      });
    }

    // Extract coordinates: !3d...!4d...
    const d3 = fullUrl.match(/!3d(-?\d+\.?\d*)/);
    const d4 = fullUrl.match(/!4d(-?\d+\.?\d*)/);
    if (d3 && d4) {
      return NextResponse.json({
        lat: parseFloat(d3[1]),
        lng: parseFloat(d4[1]),
        fullUrl,
      });
    }

    return NextResponse.json({ error: "Could not extract coordinates", fullUrl }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}
