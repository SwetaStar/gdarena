#!/usr/bin/env node
// pdf.js requires its worker file to be served as a static asset, and the
// version MUST match the installed pdfjs-dist exactly or it throws at
// runtime. Copying into public/ on every install (see "postinstall" in
// package.json) keeps them in sync automatically, including on Vercel.
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(
  process.cwd(),
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
const dest = resolve(process.cwd(), "public/pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn(`pdfjs-dist worker not found at ${src} — skipping copy.`);
  process.exit(0);
}

copyFileSync(src, dest);
console.log("✓ Copied pdf.worker.min.mjs to public/");
