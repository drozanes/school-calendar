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

const extractClasses = (text: string): number[] => {
  const classes = new Set<number>();
  // Match any isolated digit from 1-6
  const regex = /(?<!\d)([1-6])(?!\d)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    classes.add(parseInt(match[1]));
  }
  return Array.from(classes);
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
      // Split by newlines or periods followed by whitespace to separate multiple events in one cell
      const lines = text.split(/\n|\.\s+/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const specificClasses = grade !== "כללי" ? extractClasses(line) : [];
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
    const test9 = row[3]?.trim();
    const test10 = row[4]?.trim();
    const test11 = row[5]?.trim();
    const test12 = row[6]?.trim();

    if (test9 && !test10 && !test11 && !test12 && !/(?:^|\s)ט['"״]?(?:\s*[1-6]|\s|$)/.test(test9)) {
      processCell(test9, "כללי", "מבחן");
    } else {
      processCell(test9, "ט", "מבחן");
      processCell(test10, "י", "מבחן");
      processCell(test11, "יא", "מבחן");
      processCell(test12, "יב", "מבחן");
    }

    // Events (אירועים)
    const ev9 = row[8]?.trim();
    const ev10 = row[9]?.trim();
    const ev11 = row[10]?.trim();
    const ev12 = row[11]?.trim();

    if (ev9 && !ev10 && !ev11 && !ev12 && !/(?:^|\s)ט['"״]?(?:\s*[1-6]|\s|$)/.test(ev9)) {
      processCell(ev9, "כללי", "אירוע");
    } else {
      processCell(ev9, "ט", "אירוע");
      processCell(ev10, "י", "אירוע");
      processCell(ev11, "יא", "אירוע");
      processCell(ev12, "יב", "אירוע");
    }
  }

  return events;
};
