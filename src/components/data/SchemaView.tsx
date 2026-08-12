export type SchemaTable = {
  table: string;
  columns: { column: string; type: string; nullable: boolean }[];
  primary_key: string[];
  foreign_keys: { column: string; references: string }[];
  row_count: number;
};

/** Compact schema card produced by the get_schema tool. */
export function SchemaView({ tables }: { tables: SchemaTable[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tables.map((table) => (
        <div key={table.table} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-mono text-sm font-semibold text-foreground">{table.table}</h4>
            <span className="text-xs text-muted-foreground">
              {table.row_count.toLocaleString()} rows
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {table.columns.map((column) => (
              <li key={column.column} className="flex justify-between gap-3 text-xs">
                <span className="font-mono text-foreground">
                  {column.column}
                  {table.primary_key.includes(column.column) ? " ·pk" : ""}
                </span>
                <span className="text-muted-foreground">{column.type}</span>
              </li>
            ))}
          </ul>
          {table.foreign_keys.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              → {table.foreign_keys.map((fk) => `${fk.column} → ${fk.references}`).join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
