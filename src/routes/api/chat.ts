/**
 * Streaming chat endpoint for the Data Converse agent.
 * Exposes five custom tools to the LLM: get_schema, execute_query,
 * generate_chart, generate_flowchart and explain_data.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";

import {
  createLovableResponsesProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import {
  bearerFromRequest,
  createUserClient,
  saveMessage,
  touchThread,
} from "@/lib/chat-store.server";
import { getDatabaseSchema, runReadOnlyQuery } from "@/lib/db.server";


const SYSTEM_PROMPT = `You are Data Converse, a data analyst agent for an e-commerce PostgreSQL database.

Available tables (public schema): customers, products, orders, order_items, inventory.
Revenue is computed as SUM(order_items.quantity * order_items.unit_price). Orders have a status
column ('completed', 'pending', 'cancelled', 'refunded'); exclude cancelled/refunded from revenue
unless the user asks otherwise.

How to work:
1. Call get_schema whenever you are unsure about tables, columns or relationships (and always before
   drawing an ER diagram).
2. Write a single read-only SELECT/WITH statement and run it with execute_query. Always pass a short
   plain-English "explanation" of what the SQL does — the UI shows the SQL to the user for transparency.
3. When the result is comparative, temporal, proportional or correlational, call generate_chart
   (bar / line / pie / scatter / area) with the exact rows you want plotted, as a JSON array string.
4. For structure or process questions call generate_flowchart with valid Mermaid source
   (erDiagram for ER diagrams, flowchart TD for process flows, flowchart TD for decision trees).
5. Call explain_data to deliver the key insights whenever you have produced data or a visualization.
6. Finish with a short conversational summary in markdown. Never dump large raw tables in your text —
   the tool results are already rendered in the UI.

Error handling: if a query fails, read the error, fix the SQL and retry once or twice; if it still
fails, explain the limitation plainly. Never invent numbers — every figure must come from a query.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown; threadId?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const token = bearerFromRequest(request);
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        if (!token || !threadId) return new Response("Unauthorized", { status: 401 });

        const supabase = createUserClient(token);
        const { data: claims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const { data: thread } = await supabase
          .from("threads")
          .select("id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });


        const initialRunId = getLovableAiGatewayRunId(request);
        const { provider, runIdFetch } = createLovableResponsesProvider(apiKey, initialRunId);

        const tools = {
          get_schema: tool({
            description:
              "Retrieve the database schema: tables, columns, types, primary keys, foreign keys and row counts.",
            inputSchema: z.object({}),
            execute: async () => await getDatabaseSchema(),
          }),

          execute_query: tool({
            description:
              "Execute a single read-only SQL SELECT/WITH query against the database and return rows as JSON.",
            inputSchema: z.object({
              sql: z.string().describe("A single read-only SQL SELECT or WITH statement."),
              explanation: z
                .string()
                .describe("One or two sentences explaining what the query does, in plain English."),
            }),
            execute: async ({ sql, explanation }) => {
              try {
                const rows = await runReadOnlyQuery(sql);
                const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
                return {
                  ok: true as const,
                  sql,
                  explanation,
                  columns,
                  row_count: rows.length,
                  rows: rows.slice(0, 200),
                };
              } catch (error) {
                return {
                  ok: false as const,
                  sql,
                  explanation,
                  error: error instanceof Error ? error.message : "Query failed",
                };
              }
            },
          }),

          generate_chart: tool({
            description:
              "Render a chart in the chat. Provide the already-aggregated rows to plot as a JSON array string.",
            inputSchema: z.object({
              chart_type: z.enum(["bar", "line", "pie", "scatter", "area"]),
              title: z.string(),
              x_key: z.string().describe("Field name used for the category / x axis (or pie label)."),
              y_keys: z
                .array(z.string())
                .describe("Numeric field names to plot (pie charts use the first one)."),
              data_json: z
                .string()
                .describe('JSON array of row objects, e.g. [{"name":"A","revenue":120}]'),
            }),
            execute: async ({ chart_type, title, x_key, y_keys, data_json }) => {
              try {
                const data = JSON.parse(data_json) as unknown;
                if (!Array.isArray(data) || data.length === 0) {
                  return { ok: false as const, error: "data_json must be a non-empty JSON array." };
                }
                return { ok: true as const, chart_type, title, x_key, y_keys, data };
              } catch {
                return { ok: false as const, error: "data_json is not valid JSON." };
              }
            },
          }),

          generate_flowchart: tool({
            description:
              "Render a Mermaid diagram in the chat: ER diagram, process flow or decision tree.",
            inputSchema: z.object({
              kind: z.enum(["er_diagram", "process_flow", "decision_tree"]),
              title: z.string(),
              mermaid: z
                .string()
                .describe(
                  "Valid Mermaid source, e.g. 'erDiagram\\n  CUSTOMERS ||--o{ ORDERS : places' or 'flowchart TD\\n  A[Start] --> B[Next]'.",
                ),
            }),
            execute: async ({ kind, title, mermaid }) => {
              if (!mermaid.trim()) return { ok: false as const, error: "Mermaid source is empty." };
              return { ok: true as const, kind, title, mermaid: mermaid.trim() };
            },
          }),

          explain_data: tool({
            description:
              "Present structured insights about the data you retrieved: a summary, key findings and recommendations.",
            inputSchema: z.object({
              title: z.string(),
              summary: z.string(),
              insights: z.array(z.string()),
              recommendations: z.array(z.string()),
            }),
            execute: async (input) => ({ ok: true as const, ...input }),
          }),
        };

        try {
          const result = streamText({
            model: provider.responses("openai/gpt-5.6-sol"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            tools,
            stopWhen: stepCountIs(50),
            abortSignal: request.signal,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          });

          const incoming = body.messages as UIMessage[];
          const lastUser = [...incoming].reverse().find((m) => m.role === "user");
          const firstUser = incoming.find((m) => m.role === "user");
          if (lastUser) await saveMessage(supabase, userId, threadId, lastUser);
          await touchThread(supabase, threadId, firstUser);

          const response = result.toUIMessageStreamResponse({
            originalMessages: incoming,
            sendReasoning: true,
            onFinish: async ({ responseMessage }) => {
              await saveMessage(supabase, userId, threadId, responseMessage);
              await touchThread(supabase, threadId, undefined);
            },
            onError: (error) =>
              error instanceof Error ? error.message : "The assistant hit an unexpected error.",
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          });


          return withLovableAiGatewayRunIdHeader(response, runIdFetch);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response("Request cancelled", { status: 499 });
          }
          const message = error instanceof Error ? error.message : "Unexpected error";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
