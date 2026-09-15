// Known paywalled Indian/global business sources. Matched against the feed
// name and URL host so it works whether a user's custom feed is labelled
// "Mint" or "livemint.com".
const PAYWALLED_PATTERNS = [
  "mint",
  "livemint",
  "economictimes",
  "\\bet\\b",
  "bloomberg",
];

const PAYWALLED_REGEX = new RegExp(PAYWALLED_PATTERNS.join("|"), "i");

export function isPaywalledSource(name: string, url: string): boolean {
  return PAYWALLED_REGEX.test(name) || PAYWALLED_REGEX.test(url);
}
