import { NextResponse } from "next/server";
import { readRowsOrSeed, writeRows, deleteRows } from "@/lib/store";

/** GET — return the current backend-managed rows.
 *  If nothing is stored yet, auto-seeds from ORIGINAL_SPREADSHEET_ROWS. */
export async function GET() {
  try {
    const rows = await readRowsOrSeed();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to read" }, { status: 500 });
  }
}

/** POST — persist spreadsheet rows to persistent storage. */
export async function POST(request: Request) {
  try {
    const rows = await request.json();
    await writeRows(rows);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

/** DELETE — remove stored rows (next GET will re-seed from defaults). */
export async function DELETE() {
  try {
    await deleteRows();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
}
