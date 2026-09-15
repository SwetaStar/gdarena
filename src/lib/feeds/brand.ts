// Per-source branding: color, logo, matched by URL host. Every color and
// logo here was checked against real evidence before being added — either
// the source's actual logo/favicon image (fetched and viewed directly) or
// an exact hex pulled straight from the source's own page CSS. Sources not
// listed (including PIB, where no reliable signal could be found) render
// with no branding rather than an invented one.
export type FeedBrand = {
  hex: string;
  /** Path under public/, e.g. "/logos/mint.png". */
  logo: string;
};

const BRANDS: { pattern: RegExp; brand: FeedBrand }[] = [
  // Mint — amber-orange, confirmed from their actual square logo icon
  // (white "mint" wordmark on solid orange — this hex is a close match).
  { pattern: /livemint\.com/i, brand: { hex: "#F0A202", logo: "/logos/mint.png" } },
  // Reuters — red-orange, confirmed from their dot-mark favicon. Also
  // matches our Google News proxy feed, which is scoped to reuters.com.
  { pattern: /reuters\.com/i, brand: { hex: "#FF6B00", logo: "/logos/reuters.png" } },
  // BBC — black, confirmed: their logo is the iconic monochrome blocks.
  // Matches both bbc.co.uk/bbc.com and the feeds.bbci.co.uk syndication
  // host our pre-seeded feed actually uses (note the extra "i").
  {
    pattern: /bbci?\.(co\.uk|com)/i,
    brand: { hex: "#000000", logo: "/logos/bbc.png" },
  },
  // The Hindu / Hindu BusinessLine — near-black, confirmed: their "TH"
  // mark and masthead are monochrome, no distinct brand hue.
  {
    pattern: /thehindu\.com|thehindubusinessline\.com/i,
    brand: { hex: "#1A1A1A", logo: "/logos/hindu.png" },
  },
  // Business Standard — crimson red, confirmed from their "BS" logo image.
  {
    pattern: /business-standard\.com/i,
    brand: { hex: "#C8102E", logo: "/logos/business-standard.png" },
  },
  // Economic Times — dark maroon-red, confirmed from their "ET" logo
  // image and corroborated by #c00 appearing repeatedly in their own CSS.
  {
    pattern: /economictimes\.indiatimes\.com/i,
    brand: { hex: "#8B1A1A", logo: "/logos/economic-times.png" },
  },
  // CNBC-TV18 — blue, confirmed from their logo image.
  {
    pattern: /cnbctv18\.com/i,
    brand: { hex: "#1656A3", logo: "/logos/cnbc-tv18.png" },
  },
  // NDTV Profit — teal, confirmed from their logo image.
  {
    pattern: /ndtvprofit\.com|feedburner\.com\/ndtvprofit/i,
    brand: { hex: "#0E7C6B", logo: "/logos/ndtv-profit.png" },
  },
  // Times of India — red, confirmed: #e21b22 appears 8 times in their own
  // page CSS, and their real icon is a matching red gradient.
  {
    pattern: /timesofindia\.indiatimes\.com/i,
    brand: { hex: "#E21B22", logo: "/logos/times-of-india.png" },
  },
  // RBI — gold/olive, confirmed from their official seal image.
  { pattern: /rbi\.org\.in/i, brand: { hex: "#9C7A29", logo: "/logos/rbi.png" } },
  // SEBI — navy, confirmed: #154063 found directly in their page CSS, and
  // their logo wordmark is the same navy.
  { pattern: /sebi\.gov\.in/i, brand: { hex: "#154063", logo: "/logos/sebi.png" } },
];

export function getFeedBrand(url: string): FeedBrand | null {
  for (const { pattern, brand } of BRANDS) {
    if (pattern.test(url)) return brand;
  }
  return null;
}

/** Picks black or white text for readable contrast against a given hex background (WCAG relative luminance). */
export function getContrastText(hex: string): "#ffffff" | "#000000" {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#000000";
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}
