import { fetchScheduleData } from "./src/utils/googleSheets";

async function test() {
  const events = await fetchScheduleData();
  const noah = events.filter(e => e.text.includes("נח"));
  console.dir(noah, {depth: null});
}
test();
