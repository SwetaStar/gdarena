// Per-source accent colors for the "subtle accent" treatment in the News
// list and feed pills. Every color below was checked against real
// evidence (the source's actual logo image, viewed directly, or an exact
// hex pulled from their own page CSS) — not guessed from memory. Sources
// not listed here (including PIB, where no reliable signal could be
// found) get no accent at all rather than an invented color.
const BRAND_COLORS: { pattern: RegExp; hex: string }[] = [
  // Mint — amber-orange, confirmed from their actual logo image.
  { pattern: /livemint\.com/i, hex: "#F0A202" },
  // Reuters — red-orange, confirmed from their dot-mark logo (matches
  // both a direct reuters.com feed and our Google News proxy feed, which
  // is scoped to reuters.com content).
  { pattern: /reuters\.com/i, hex: "#FF6B00" },
  // BBC — black, confirmed: their logo is the iconic monochrome blocks.
  { pattern: /bbc\.(co\.uk|com)/i, hex: "#000000" },
  // The Hindu / Hindu BusinessLine — near-black, confirmed: their "TH"
  // mark and masthead are monochrome, no distinct brand hue.
  { pattern: /thehindu\.com|thehindubusinessline\.com/i, hex: "#1A1A1A" },
  // Business Standard — crimson red, confirmed from their "BS" logo image.
  { pattern: /business-standard\.com/i, hex: "#C8102E" },
  // Economic Times — dark maroon-red, confirmed from their "ET" logo
  // image and corroborated by #c00 appearing repeatedly in their own CSS.
  { pattern: /economictimes\.indiatimes\.com/i, hex: "#8B1A1A" },
  // CNBC-TV18 — blue, confirmed from their logo image.
  { pattern: /cnbctv18\.com/i, hex: "#1656A3" },
  // NDTV Profit — teal, confirmed from their logo image.
  { pattern: /ndtvprofit\.com|feedburner\.com\/ndtvprofit/i, hex: "#0E7C6B" },
  // Times of India — red, confirmed: #e21b22 appears 8 times in their own
  // page CSS (buttons, highlights, masthead accents).
  { pattern: /timesofindia\.indiatimes\.com/i, hex: "#E21B22" },
  // RBI — gold/olive, confirmed from their official seal image.
  { pattern: /rbi\.org\.in/i, hex: "#9C7A29" },
  // SEBI — navy, confirmed: #154063 found directly in their page CSS.
  { pattern: /sebi\.gov\.in/i, hex: "#154063" },
];

export function getFeedBrandColor(url: string): string | null {
  for (const { pattern, hex } of BRAND_COLORS) {
    if (pattern.test(url)) return hex;
  }
  return null;
}
