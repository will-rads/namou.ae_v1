import { NextResponse } from "next/server";
import { readRowsOrSeed, deleteRows } from "@/lib/store";

export const dynamic = "force-dynamic";

function safeMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

/** GET — return the current backend-managed rows.
 *  If nothing is stored yet, auto-seeds from ORIGINAL_SPREADSHEET_ROWS. */
export async function GET() {
  try {
    const rows = await readRowsOrSeed();
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[spreadsheet GET]", e);
    return NextResponse.json({ error: "Failed to read", details: safeMessage(e) }, { status: 500 });
  }
}

/** POST — persist spreadsheet rows to persistent storage. */
export async function POST(request: Request) {
  try {
    const rows = await request.json();
    // Write and capture diagnostic info
    const { put, list, head } = await import("@vercel/blob");
    const blob = await put("spreadsheet-override.json", JSON.stringify(rows), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    // Diagnostic: what did put return, what does list see, what does head see
    let listCount = -1;
    let listFirst = "";
    let headOk = false;
    let headErr = "";
    try {
      const { blobs } = await list({ prefix: "spreadsheet-override.json", limit: 5 });
      listCount = blobs.length;
      listFirst = blobs[0]?.pathname ?? "(none)";
    } catch (e) { listFirst = safeMessage(e); }
    try {
      await head(blob.url);
      headOk = true;
    } catch (e) { headErr = safeMessage(e); }
    return NextResponse.json({
      ok: true,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      listCount,
      listFirst,
      headOk,
      headErr: headErr || undefined,
      useBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 12) + "...",
    });
  } catch (e) {
    console.error("[spreadsheet POST]", e);
    return NextResponse.json({ error: "Failed to save", details: safeMessage(e) }, { status: 500 });
  }
}

/** DELETE — remove stored rows (next GET will re-seed from defaults). */
export async function DELETE() {
  try {
    await deleteRows();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[spreadsheet DELETE]", e);
    return NextResponse.json({ error: "Failed to reset", details: safeMessage(e) }, { status: 500 });
  }
}
