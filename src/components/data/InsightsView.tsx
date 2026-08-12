export type Insights = {
  title: string;
  summary: string;
  insights: string[];
  recommendations: string[];
};

/** Structured insight card produced by the explain_data tool. */
export function InsightsView({ data }: { data: Insights }) {
  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
      <h3 className="text-sm font-semibold text-foreground">{data.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{data.summary}</p>

      {data.insights.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key findings
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
            {data.insights.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {data.recommendations.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendations
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
            {data.recommendations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
