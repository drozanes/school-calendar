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
    const ev9 = row[8]?.trim();
    const ev10 = row[9]?.trim();
    const ev11 = row[10]?.trim();
    const ev12 = row[11]?.trim();
    
    if (ev9 && !ev10 && !ev11 && !ev12) {
      // Must have "ט" as a standalone word or "ט" followed by 1-6
      const isSpecificallyGrade9 = /(?:^|\s)ט['"״]?(?:\s*[1-6]|\s|$)/.test(ev9);
      console.log(`[${row[2]}] Text: "${ev9}"`);
      console.log(`  -> Treat as ${isSpecificallyGrade9 ? 'Grade 9' : 'ALL GRADES'}`);
    }
  }
}
run();
