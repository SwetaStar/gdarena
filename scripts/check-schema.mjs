#!/usr/bin/env node
// One-off verification helper: confirms the migration actually landed
// (tables, RLS policies, trigger). Not part of the app.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2] ?? "";
  }
}
loadEnvLocal();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const tables = await client.query(`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`);
console.log(
  "Tables:",
  tables.rows.map((r) => r.table_name)
);

const policies = await client.query(`
  select tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname
`);
console.log("Policies:");
for (const p of policies.rows) console.log(` - ${p.tablename}: ${p.policyname}`);

const trigger = await client.query(`
  select tgname from pg_trigger where tgname = 'on_auth_user_created'
`);
console.log("Trigger present:", trigger.rows.length > 0);

await client.end();
