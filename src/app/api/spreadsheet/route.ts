import { NextResponse } from "next/server";
import { readRowsOrSeed, writeRows, deleteRows } from "@/lib/store";

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
    await writeRows(rows);
    return NextResponse.json({ ok: true });
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
