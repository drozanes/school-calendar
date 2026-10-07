import { parse } from "csv-parse/sync";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1DcWGKiT67LbuzgzOAB2J7WHJL0V-EC8gFOG7VLEj_yg/gviz/tq?tqx=out:csv&sheet=%D7%9E%D7%97%D7%A6%D7%99%D7%AA%20%D7%90";

async function run() {
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  const records = parse(csvText, { skip_empty_lines: true });
  
  for (const row of records) {
    for (let i = 0; i < row.length; i++) {
      if (row[i].includes("נח")) {
        console.log(`Found "נח" in row ${row[2]}, column ${i}: ${row[i]}`);
      }
    }
  }
}
run();
