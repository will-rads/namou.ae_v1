import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "spreadsheet-override.json");

/** GET — return the current spreadsheet override rows (or null if none). */
export async function GET() {
  try {
    if (!existsSync(FILE_PATH)) return NextResponse.json(null);
    const data = await readFile(FILE_PATH, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json(null);
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
