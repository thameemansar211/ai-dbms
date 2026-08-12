/**
 * Database access layer used by the agent tools.
 * Runs server-side with the public (anon) key, so RLS + the read-only SQL
 * guard in the database are the security boundary.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_TABLES = ["customers", "products", "orders", "order_items", "inventory"] as const;

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (cached) return cached;
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Database configuration is missing.");

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // sb_publishable_ keys are opaque, not JWTs: send them only as `apikey`.
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  return cached;
}

export type QueryRow = Record<string, unknown>;

/** Execute a read-only SQL statement through the database's guarded RPC. */
export async function runReadOnlyQuery(sql: string): Promise<QueryRow[]> {
  const { data, error } = await client().rpc("execute_readonly_sql", { query_text: sql });
  if (error) throw new Error(error.message);
  return (data ?? []) as QueryRow[];
}

export type ColumnInfo = {
  column: string;
  type: string;
  nullable: boolean;
  default: string | null;
};

export type TableInfo = {
  table: string;
  columns: ColumnInfo[];
  primary_key: string[];
  foreign_keys: { column: string; references: string }[];
  row_count: number;
};

/** Introspect the public schema: columns, keys, relationships and row counts. */
export async function getDatabaseSchema(): Promise<{ database: string; tables: TableInfo[] }> {
  const tableList = DEMO_TABLES.map((t) => `'${t}'`).join(", ");

  const columns = (await runReadOnlyQuery(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN (${tableList})
    ORDER BY table_name, ordinal_position
  `)) as Array<Record<string, string | null>>;

  const keys = (await runReadOnlyQuery(`
    SELECT tc.constraint_type, tc.table_name, kcu.column_name,
           ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name IN (${tableList})
      AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
  `)) as Array<Record<string, string | null>>;

  const counts = (await runReadOnlyQuery(
    DEMO_TABLES.map((t) => `SELECT '${t}' AS table_name, count(*) AS n FROM public.${t}`).join(
      " UNION ALL ",
    ),
  )) as Array<{ table_name: string; n: number }>;

  const tables: TableInfo[] = DEMO_TABLES.map((table) => ({
    table,
    columns: columns
      .filter((c) => c["table_name"] === table)
      .map((c) => ({
        column: String(c["column_name"]),
        type: String(c["data_type"]),
        nullable: c["is_nullable"] === "YES",
        default: c["column_default"] ?? null,
      })),
    primary_key: keys
      .filter((k) => k["table_name"] === table && k["constraint_type"] === "PRIMARY KEY")
      .map((k) => String(k["column_name"])),
    foreign_keys: keys
      .filter((k) => k["table_name"] === table && k["constraint_type"] === "FOREIGN KEY")
      .map((k) => ({
        column: String(k["column_name"]),
        references: `${k["foreign_table"]}.${k["foreign_column"]}`,
      })),
    row_count: Number(counts.find((c) => c.table_name === table)?.n ?? 0),
  }));

  return { database: "Lovable Cloud (PostgreSQL) — e-commerce demo", tables };
}
