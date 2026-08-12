import { BarChart3, Network, Table2, TrendingUp } from "lucide-react";

import logo from "@/assets/logo.png";

const SUGGESTIONS = [
  {
    icon: TrendingUp,
    title: "Top revenue products",
    prompt: "What are the top 5 products by revenue? Show a bar chart and explain the results.",
  },
  {
    icon: BarChart3,
    title: "Monthly sales trend",
    prompt: "Show monthly revenue over time as a line chart and tell me what the trend looks like.",
  },
  {
    icon: Network,
    title: "Database ER diagram",
    prompt: "Draw an ER diagram of the database showing all tables and their relationships.",
  },
  {
    icon: Table2,
    title: "Inventory risk",
    prompt:
      "Which products are at risk of stocking out relative to their sales velocity? Use a chart and give recommendations.",
  },
];

/** First-run screen: agent identity plus one-tap example questions. */
export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <img src={logo} alt="" width={72} height={72} className="size-16" />
      <h2 className="mt-4 font-display text-2xl font-semibold">Ask your data anything</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        I inspect the schema, write and run read-only SQL, then answer with charts, diagrams and
        plain-English insights.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => onPick(prompt)}
            className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <span className="text-sm font-semibold text-card-foreground">{title}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
