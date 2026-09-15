#!/usr/bin/env node
// Applies a .sql file directly to the Supabase Postgres database, so you
// never have to paste SQL into the dashboard's SQL editor.
//
// Usage:
//   npm run db:migrate -- supabase/migrations/0001_init.sql
//
// Reads the connection string from SUPABASE_DB_URL in .env.local — never
// commit that value (.env.local is already git-ignored).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("Usage: npm run db:migrate -- <path-to-sql-file>");
    process.exit(1);
  }

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error(
      "Missing SUPABASE_DB_URL in .env.local. See README for where to find it in the Supabase dashboard."
    );
    process.exit(1);
  }

  const sql = readFileSync(resolve(process.cwd(), sqlPath), "utf8");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log(`Connected. Applying ${sqlPath} ...`);

  try {
    await client.query(sql);
    console.log("✓ Applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
