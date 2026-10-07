import { fetchScheduleData } from "./src/utils/googleSheets";

async function test() {
  const events = await fetchScheduleData();
  const oct14 = events.filter(e => e.date === "2026-10-14" && e.grade === "י");
  console.log("Events for Oct 14, Grade י:");
  console.dir(oct14, {depth: null});
}
test();
