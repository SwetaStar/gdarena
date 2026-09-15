export type FeedArticle = {
  title: string;
  link: string;
  publishedAt: string | null;
  snippet: string;
};

export type FeedResult = {
  id: string;
  name: string;
  url: string;
  paywalled: boolean;
  items: FeedArticle[] | null;
  error: string | null;
};

/** An article the brief view can render — from a feed, or from an uploaded PDF. */
export type SelectedArticle =
  | { source: "feed"; title: string; link: string; sourceName: string; text: string }
  | { source: "pdf"; title: string; text: string };
