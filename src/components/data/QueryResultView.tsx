export type QueryResult = {
  sql: string;
  explanation: string;
  columns: string[];
  row_count: number;
  rows: Record<string, unknown>[];
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** SQL transparency card + tabular results for the execute_query tool. */
export function QueryResultView({ result }: { result: QueryResult }) {
  const preview = result.rows.slice(0, 25);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Generated SQL
        </p>
        <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-foreground">
          <code>{result.sql}</code>
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">{result.explanation}</p>
      </div>

      {preview.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-muted/60">
              <tr>
                {result.columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, index) => (
                <tr key={index} className="border-t border-border">
                  {result.columns.map((column) => (
                    <td key={column} className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {result.row_count} row{result.row_count === 1 ? "" : "s"} returned
        {result.row_count > preview.length ? ` · showing first ${preview.length}` : ""}
      </p>
    </div>
  );
}
