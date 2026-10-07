import { parse } from "csv-parse/sync";
const text = "11:00 שיעור פתיחה הרב לפיד\nט2 גיבוש (ערב)";
const grade = "ט";
const regex = new RegExp(`${grade}([1-6])`, "g");
let match;
while ((match = regex.exec(text)) !== null) {
  console.log("Matched class:", parseInt(match[1]));
}
