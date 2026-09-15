// One-click "suggested sources" shown alongside the manual add-feed form.
// Every URL here was live-verified (real RSS/XML, with a pubDate from
// today) before being added — see chat history for the verification run.
// Moneycontrol's feeds looked valid but served ~2-year-old items; Financial
// Express's /feed/ URLs just redirect to HTML — both excluded.
export const SUGGESTED_FEEDS: { name: string; url: string }[] = [
  { name: "Mint — News", url: "https://www.livemint.com/rss/news" },
  { name: "Mint — Markets", url: "https://www.livemint.com/rss/markets" },
  {
    name: "Economic Times — Top Stories",
    url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
  },
  {
    name: "Economic Times — Markets",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
  },
  {
    name: "Business Standard — Latest",
    url: "https://www.business-standard.com/rss/latest.rss",
  },
  {
    name: "CNBC-TV18 — Business",
    url: "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml",
  },
  { name: "NDTV Profit — Latest", url: "https://feeds.feedburner.com/ndtvprofit-latest" },
  {
    name: "The Hindu — National",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
  },
  {
    name: "Times of India — Business",
    url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms",
  },
];
