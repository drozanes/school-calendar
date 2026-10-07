import { parse } from "csv-parse/sync";

export interface ScheduleEvent {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  hebrewDate: string;
  grade: "ט" | "י" | "יא" | "יב" | "כללי";
  type: "מבחן" | "אירוע";
  text: string;
  specificClasses: number[]; // Empty means it applies to all classes in the grade
}

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1DcWGKiT67LbuzgzOAB2J7WHJL0V-EC8gFOG7VLEj_yg/gviz/tq?tqx=out:csv&sheet=מחצית%20א";

const parseDateStr = (dateStr: string): string | null => {
  if (!dateStr || !dateStr.includes("/")) return null;
  const [day, month] = dateStr.split("/").map(Number);
  if (!day || !month) return null;
  // Assume August to December is 2026, January to July is 2027
  const year = month >= 8 ? 2026 : 2027;
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const extractClasses = (text: string, grade: string): number[] => {
  const classes: number[] = [];
  // Match the grade followed by optional quotes/geresh and space, then a number 1-6 (e.g., "ט2", "יב 1", "י'2")
  const regex = new RegExp(`${grade}['"״]?\\s*([1-6])`, "g");
  let match;
  while ((match = regex.exec(text)) !== null) {
    classes.push(parseInt(match[1]));
  }
  return classes;
};

export const fetchScheduleData = async (): Promise<ScheduleEvent[]> => {
  const response = await fetch(SHEET_URL, { next: { revalidate: 300 } }); // Cache for 5 mins
  const csvText = await response.text();

  const records = parse(csvText, {
    skip_empty_lines: true,
  });

  const events: ScheduleEvent[] = [];
  let eventIdCounter = 1;

  for (const row of records) {
    const dayOfWeek = row[0]?.trim();
    const hebrewDate = row[1]?.trim();
    const dateStr = row[2]?.trim();

    // Check if it's a valid data row (has a known day of week)
    if (!["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"].includes(dayOfWeek)) {
      continue;
    }

    const date = parseDateStr(dateStr);
    if (!date) continue;

    const processCell = (
      text: string,
      grade: "ט" | "י" | "יא" | "יב" | "כללי",
      type: "מבחן" | "אירוע"
    ) => {
      if (!text) return;
      // Split by newlines so multiple events in one cell become distinct events
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const specificClasses = grade !== "כללי" ? extractClasses(line, grade) : [];
        events.push({
          id: `evt-${eventIdCounter++}`,
          date,
          dayOfWeek,
          hebrewDate,
          grade,
          type,
          text: line,
          specificClasses,
        });
      }
    };

    // Tests (מבחנים)
    processCell(row[3], "ט", "מבחן");
    processCell(row[4], "י", "מבחן");
    processCell(row[5], "יא", "מבחן");
    processCell(row[6], "יב", "מבחן");

    // Events (אירועים)
    processCell(row[8], "ט", "אירוע");
    processCell(row[9], "י", "אירוע");
    processCell(row[10], "יא", "אירוע");
    processCell(row[11], "יב", "אירוע");
  }

  return events;
};
