async function run() {
  const url = "https://docs.google.com/spreadsheets/d/1DcWGKiT67LbuzgzOAB2J7WHJL0V-EC8gFOG7VLEj_yg/pubhtml?gid=0&single=true";
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
