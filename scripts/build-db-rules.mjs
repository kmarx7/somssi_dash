import { readFile, writeFile } from "node:fs/promises";
import { domains, fieldsFor } from "../apps/web/lib/operations/domains.ts";
// --check verifies that committed database and app input rules cannot silently diverge.
const path = new URL(
  "../supabase/migrations/20261029060302_somssi_operations.sql",
  import.meta.url,
);
const marker = "-- GENERATED DOMAIN RULES: scripts/build-db-rules.mjs\n";
const rows = Object.entries(domains)
  .map(
    ([kind, domain]) =>
      `('${kind}', '${JSON.stringify(fieldsFor(kind)).replaceAll("'", "''")}'::jsonb, ${!!domain.immutable})`,
  )
  .join(",\n");
const suffix =
  marker +
  "insert into somssi_private.kind_rules(kind,fields,immutable) values\n" +
  rows +
  ";\n";
const current = await readFile(path, "utf8");
const next = current.split(marker)[0] + suffix;
if (process.argv.includes("--check")) {
  if (current !== next) throw new Error("Database input rules are stale");
} else await writeFile(path, next);
