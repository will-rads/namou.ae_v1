#!/usr/bin/env node
/**
 * Reads src/data/plots.csv and writes src/data/plotsCsv.ts
 * Run: node scripts/sync-csv.js
 */
const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "src", "data", "plots.csv");
const tsPath = path.join(__dirname, "..", "src", "data", "plotsCsv.ts");

const csv = fs.readFileSync(csvPath, "utf8").trim();

const ts = `// Auto-generated from plots.csv — re-run \`node scripts/sync-csv.js\` after editing plots.csv
// Or edit this string directly if you prefer.
//
// To update: edit plots.csv in Excel/Sheets, then run the sync script,
// or paste the CSV content between the backticks below.

export default \`${csv.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;
`;

fs.writeFileSync(tsPath, ts, "utf8");
console.log(`Synced ${csvPath} → ${tsPath}`);
