import { parse } from "csv-parse/sync";

const SHEET_URL = process.env.GOOGLE_SHEETS_URL || "";
if (!SHEET_URL) {
  console.error("Please set GOOGLE_SHEETS_URL environment variable.");
  process.exit(1);
}

async function run() {
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  const records = parse(csvText, { skip_empty_lines: true });
  
  for (const row of records) {
    if (row[2] && row[2].trim() === "14/10") {
      console.log("Found row for 14/10:");
      console.dir(row, {depth: null});
    }
  }
}
run();
