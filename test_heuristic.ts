import { parse } from "csv-parse/sync";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1DcWGKiT67LbuzgzOAB2J7WHJL0V-EC8gFOG7VLEj_yg/gviz/tq?tqx=out:csv&sheet=%D7%9E%D7%97%D7%A6%D7%99%D7%AA%20%D7%90";

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
      const isSpecificallyGrade9 = /ט['"״]?\s*[1-6]?/.test(ev9);
      console.log(`[${row[2]}] Text: "${ev9}"`);
      console.log(`  -> Treat as ${isSpecificallyGrade9 ? 'Grade 9' : 'ALL GRADES'}`);
    }
  }
}
run();
