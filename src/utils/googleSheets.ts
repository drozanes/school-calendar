import { parse } from "csv-parse/sync";

export type Track = "פנמצ" | "תורת עציון" | "אור עציון" | "כללי";

export interface ScheduleEvent {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  hebrewDate: string;
  grade: "ט" | "י" | "יא" | "יב" | "כללי";
  type: "מבחן" | "אירוע";
  text: string;
  specificClasses: number[]; // Empty means it applies to all classes in the grade
  tracks: Track[];
}

const SHEET_URL = process.env.GOOGLE_SHEETS_URL;

const parseDateStr = (dateStr: string): string | null => {
  if (!dateStr || !dateStr.includes("/")) return null;
  const [day, month] = dateStr.split("/").map(Number);
  if (!day || !month) return null;

  // Dynamically determine academic year based on current system date:
  // An academic year runs from August of baseYear to July of baseYear + 1.
  const now = new Date();
  const currentYear = now.getFullYear();
  const baseYear = now.getMonth() >= 7 ? currentYear : currentYear - 1;
  const year = month >= 8 ? baseYear : baseYear + 1;

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

const determineTracks = (text: string, isCol12: boolean = false): Track[] => {
  if (isCol12) return ["תורת עציון"];
  
  const tracks = new Set<Track>();
  
  if (text.includes('תוצ') || text.includes('תו"צ') || text.includes('תו״צ') || text.includes('תורת עציון')) {
    tracks.add("תורת עציון");
  }
  
  // "אור עציון כולל גם את הפנמצ" - if explicitly "אור עציון" or "אוע", it applies to both
  if (text.includes('אור עציון') || text.includes('אוע') || text.includes('או"ע') || text.includes('או״ע')) {
    tracks.add("אור עציון");
    tracks.add("פנמצ");
  }
  
  // If it just says פנימיה, it is ONLY for אור עציון, not פנמצ
  if (text.includes('פנימיה')) {
    tracks.add("אור עציון");
  }

  // If it specifically mentions פנמצ, add it
  if (text.includes('פנמצ') || text.includes('פנמ"צ') || text.includes('פנמ״צ')) {
    tracks.add("פנמצ");
  }

  if (tracks.size === 0) {
    return ["כללי"]; // If no specific keyword, applies to all tracks
  }
  
  return Array.from(tracks);
};

const parseCsvRows = (
  records: string[][],
  events: ScheduleEvent[],
  hebrewDates: Record<string, string>,
  idCounter: { current: number }
) => {
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
    
    if (hebrewDate) {
      hebrewDates[date] = hebrewDate;
    }

    const processCell = (
      text: string,
      grade: "ט" | "י" | "יא" | "יב" | "כללי",
      type: "מבחן" | "אירוע",
      isCol12: boolean = false
    ) => {
      if (!text) return;
      // Split by newlines or periods followed by whitespace to separate multiple events in one cell
      const lines = text.split(/\n|\.\s+/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const specificClasses = grade !== "כללי" ? extractClasses(line) : [];
        const tracks = determineTracks(line, isCol12);
        
        events.push({
          id: `evt-${idCounter.current++}`,
          date,
          dayOfWeek,
          hebrewDate,
          grade,
          type,
          text: line,
          specificClasses,
          tracks,
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
    
    // תורת עציון (Column 12)
    const toratEtzion = row[12]?.trim();
    if (toratEtzion) {
      processCell(toratEtzion, "כללי", "אירוע", true);
    }
  }
};

export const fetchScheduleData = async (): Promise<{events: ScheduleEvent[], hebrewDates: Record<string, string>}> => {
  if (!SHEET_URL) {
    console.warn("GOOGLE_SHEETS_URL environment variable is missing.");
    return { events: [], hebrewDates: {} };
  }

  // Construct URLs for both semester tabs
  let urls = [SHEET_URL];
  try {
    const urlA = new URL(SHEET_URL);
    urlA.searchParams.set("sheet", "מחצית א");
    const urlB = new URL(SHEET_URL);
    urlB.searchParams.set("sheet", "מחצית ב");
    urls = [urlA.toString(), urlB.toString()];
  } catch (err) {
    console.warn("Could not construct dual semester URLs, using single SHEET_URL", err);
  }

  const events: ScheduleEvent[] = [];
  const hebrewDates: Record<string, string> = {};
  const idCounter = { current: 1 };

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { next: { revalidate: 300 } });
        if (!response.ok) {
          console.warn(`Failed to fetch sheet from ${url}: ${response.statusText}`);
          return;
        }
        const csvText = await response.text();
        const records = parse(csvText, { skip_empty_lines: true });
        parseCsvRows(records, events, hebrewDates, idCounter);
      } catch (err) {
        console.error(`Error processing sheet from ${url}:`, err);
      }
    })
  );

  return { events, hebrewDates };
};
