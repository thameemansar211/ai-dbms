import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartSpec = {
  chart_type: "bar" | "line" | "pie" | "scatter" | "area";
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, unknown>[];
};

const SERIES = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const color = (index: number): string => SERIES[index % SERIES.length] ?? "#888888";

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.6rem",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
};

/** Renders a chart spec produced by the agent's generate_chart tool. */
export function ChartView({ spec }: { spec: ChartSpec }) {
  const { chart_type, x_key, y_keys, data } = spec;

  const numeric = data.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const key of y_keys) {
      const value = row[key];
      next[key] = typeof value === "string" ? Number(value) : value;
    }
    return next;
  });

  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-3 text-sm font-semibold text-card-foreground">
        {spec.title}
      </figcaption>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart_type === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={numeric}
                dataKey={y_keys[0] ?? "value"}
                nameKey={x_key}
                innerRadius={50}
                outerRadius={100}
                paddingAngle={2}
              >
                {numeric.map((_, index) => (
                  <Cell key={index} fill={color(index)} />
                ))}
              </Pie>
            </PieChart>
          ) : chart_type === "line" ? (
            <LineChart data={numeric}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={x_key} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {y_keys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color(index)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : chart_type === "area" ? (
            <AreaChart data={numeric}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={x_key} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {y_keys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color(index)}
                  fill={color(index)}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : chart_type === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={x_key} type="number" {...axisProps} />
              <YAxis dataKey={y_keys[0] ?? "value"} type="number" {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={numeric} fill={color(0)} />
            </ScatterChart>
          ) : (
            <BarChart data={numeric}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={x_key} {...axisProps} interval={0} angle={-12} height={50} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {y_keys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={color(index)}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
