import {
  BarChart3,
  Database,
  Lightbulb,
  Network,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { ChartView, type ChartSpec } from "@/components/data/ChartView";
import { InsightsView, type Insights } from "@/components/data/InsightsView";
import { MermaidView } from "@/components/data/MermaidView";
import { QueryResultView, type QueryResult } from "@/components/data/QueryResultView";
import { SchemaView, type SchemaTable } from "@/components/data/SchemaView";

const META: Record<string, { label: string; Icon: LucideIcon }> = {
  get_schema: { label: "Inspecting schema", Icon: Database },
  execute_query: { label: "Running SQL query", Icon: Terminal },
  generate_chart: { label: "Building chart", Icon: BarChart3 },
  generate_flowchart: { label: "Drawing diagram", Icon: Network },
  explain_data: { label: "Explaining results", Icon: Lightbulb },
};

type Failed = { ok: false; error: string };

function isFailed(output: unknown): output is Failed {
  return typeof output === "object" && output !== null && (output as { ok?: boolean }).ok === false;
}

function renderOutput(toolName: string, output: unknown) {
  if (isFailed(output)) {
    return <p className="text-sm text-destructive">{output.error}</p>;
  }

  switch (toolName) {
    case "get_schema":
      return <SchemaView tables={(output as { tables: SchemaTable[] }).tables} />;
    case "execute_query":
      return <QueryResultView result={output as QueryResult} />;
    case "generate_chart":
      return <ChartView spec={output as ChartSpec} />;
    case "generate_flowchart": {
      const value = output as { mermaid: string; title: string };
      return <MermaidView code={value.mermaid} title={value.title} />;
    }
    case "explain_data":
      return <InsightsView data={output as Insights} />;
    default:
      return null;
  }
}

/** Renders one agent tool invocation: collapsed params + a rich, domain-specific result. */
export function ToolPartView({ part }: { part: ToolPart }) {
  const toolName =
    part.type === "dynamic-tool" ? part.toolName : part.type.replace(/^tool-/, "");
  const meta = META[toolName] ?? { label: toolName, Icon: Terminal };
  const done = part.state === "output-available";

  return (
    <div className="w-full">
      <Tool defaultOpen={false}>
        <ToolHeader
          type={part.type as never}
          state={part.state as never}
          title={meta.label}
          className="[&_svg]:shrink-0"
        />
        <ToolContent>
          <ToolInput input={part.input} />
          {part.state === "output-error" && (
            <ToolOutput errorText={part.errorText} output={undefined} />
          )}
        </ToolContent>
      </Tool>

      {done && <div className="-mt-2 mb-4">{renderOutput(toolName, part.output)}</div>}
    </div>
  );
}

export { META as toolMeta };
