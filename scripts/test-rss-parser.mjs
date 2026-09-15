import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  },
});

const feeds = [
  ["Reuters (via Google News)", "https://news.google.com/rss/search?q=site:reuters.com+business&hl=en-IN&gl=IN&ceid=IN:en"],
  ["BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"],
  ["The Hindu BusinessLine", "https://www.thehindubusinessline.com/economy/feeder/default.rss"],
  ["PIB Press Releases", "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"],
  ["RBI Press Releases", "https://www.rbi.org.in/pressreleases_rss.xml"],
  ["SEBI Press Releases", "https://www.sebi.gov.in/sebirss.xml"],
];

for (const [name, url] of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const first = feed.items[0];
    console.log(`\n=== ${name} ===`);
    console.log("item count:", feed.items.length);
    console.log("first item title:", first?.title);
    console.log("first item pubDate/isoDate:", first?.pubDate, "/", first?.isoDate);
    console.log(
      "contentSnippet len:",
      (first?.contentSnippet || first?.content || first?.summary || "").length
    );
  } catch (err) {
    console.log(`\n=== ${name} ===`);
    console.log("ERROR:", err.message);
  }
}
