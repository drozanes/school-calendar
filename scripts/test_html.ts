async function run() {
  const url = process.env.GOOGLE_SHEETS_URL || "";
  if (!url) {
    console.error("Please set GOOGLE_SHEETS_URL environment variable.");
    process.exit(1);
  }
  const res = await fetch(url);
  const text = await res.text();
  const index = text.indexOf("חרבות ברזל");
  if (index !== -1) {
    console.log(text.substring(index - 50, index + 50));
  } else {
    console.log("Not found");
  }
}
run();
