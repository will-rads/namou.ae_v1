import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { ORIGINAL_SPREADSHEET_ROWS } from "@/data/spreadsheetData";

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "spreadsheet-override.json");

/** GET — return the current backend-managed rows.
 *  If no data file exists yet, seed it from the initial rows so the
 *  server-managed data pipeline is always the source of truth. */
export async function GET() {
  try {
    if (!existsSync(FILE_PATH)) {
      // Auto-seed the file on first access
      if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
      const seed = JSON.stringify(ORIGINAL_SPREADSHEET_ROWS);
      await writeFile(FILE_PATH, seed, "utf-8");
      return NextResponse.json(ORIGINAL_SPREADSHEET_ROWS);
    }
    const data = await readFile(FILE_PATH, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json(ORIGINAL_SPREADSHEET_ROWS);
  }
}

/** POST — persist spreadsheet rows to the server-side JSON file. */
export async function POST(request: Request) {
  try {
    const rows = await request.json();
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE_PATH, JSON.stringify(rows), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

/** DELETE — remove the override file (resets to built-in defaults). */
export async function DELETE() {
  try {
    if (existsSync(FILE_PATH)) await unlink(FILE_PATH);
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
