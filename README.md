# Data Converse — Conversational AI Data Assistant

Ask questions about your data in plain English. Data Converse inspects the database schema,
writes and runs read-only SQL, and answers with charts, diagrams and plain-language insights —
always showing the exact query it ran.

## What it does

- **Understands natural language** — "Which products are at risk of stocking out?" becomes a real SQL query.
- **Queries a live database** — PostgreSQL (Lovable Cloud), read-only, guarded at the database level.
- **Generates visualizations** — bar, line, area, pie and scatter charts rendered with Recharts.
- **Generates diagrams** — ER diagrams, process flows and decision trees rendered with Mermaid.
- **Explains results** — structured summaries, key findings and recommendations.
- **Streams responses** — token-by-token streaming with visible reasoning and tool activity.
- **Remembers the conversation** — a single conversation persisted in the browser (`localStorage`),
  resettable with "New conversation".

## Agent tools

| Tool | Purpose |
| --- | --- |
| `get_schema` | Introspects tables, columns, types, primary/foreign keys and row counts. |
| `execute_query` | Runs one read-only `SELECT`/`WITH` statement and returns rows plus the SQL used. |
| `generate_chart` | Renders a bar / line / area / pie / scatter chart from aggregated rows. |
| `generate_flowchart` | Renders a Mermaid ER diagram, process flow or decision tree. |
| `explain_data` | Returns a structured insight card: summary, key findings, recommendations. |

The model runs a multi-step loop: it may inspect the schema, run a query, fix a failing query,
chart the result and explain it — all inside one answer.

## Architecture

```
Browser (React 19 + TanStack Start)
  └── ChatWindow  ─ useChat / AI SDK UI ─ streams from  POST /api/chat
                                                          │
                                              streamText + 5 tools
                                                          │
                          Lovable AI Gateway  ── openai/gpt-5.6-sol (Responses API)
                                                          │
                                              db.server.ts (Supabase client)
                                                          │
                                     execute_readonly_sql()  ── PostgreSQL
```

Key files:

- `src/routes/api/chat.ts` — streaming chat endpoint, system prompt and tool definitions.
- `src/lib/ai-gateway.server.ts` — Lovable AI Gateway provider + run-id propagation.
- `src/lib/db.server.ts` — schema introspection and guarded query execution.
- `src/components/chat/` — chat surface (AI Elements) and tool-result rendering.
- `src/components/data/` — chart, Mermaid, SQL/table and insight renderers.

## Safety

- SQL runs through a `SECURITY DEFINER` database function that **rejects anything but a single
  `SELECT`/`WITH` statement** — no `INSERT`, `UPDATE`, `DELETE`, `DROP`, DDL or multi-statement input.
- The server uses the public (anon) key, so row-level security is still the boundary.
- Every query and its explanation are shown in the UI, so answers are auditable.

## Demo database

An e-commerce dataset seeded in Lovable Cloud:

`customers` · `products` · `orders` · `order_items` · `inventory`

Orders span ~16 months with `completed` / `pending` / `cancelled` / `refunded` statuses, so
revenue questions have realistic nuance.

## Example prompts

- "What are the top 5 products by revenue? Show a bar chart and explain."
- "Show monthly revenue over time as a line chart — what's the trend?"
- "Draw an ER diagram of the database."
- "Which products are at risk of stocking out relative to their sales velocity?"
- "Break down revenue by product category as a pie chart."
- "Draw a decision tree for how we should treat a customer based on their order history."

## Running locally

```bash
bun install
copy .env.example .env
bun run dev
```

The app expects `LOVABLE_API_KEY` (AI Gateway) and the Supabase/Lovable Cloud environment
variables, both provisioned automatically by Lovable.

For local Supabase configuration, copy `.env.example` to `.env` and fill in the project values.
The real `.env` is ignored by Git and must never be committed.

## Repository layout

The source is organized by responsibility:

- `src/components/chat` — conversation UI and tool rendering.
- `src/components/data` — charts, schema, SQL results, Mermaid diagrams, and insights.
- `src/components/ai-elements` — reusable AI interaction primitives.
- `src/integrations/supabase` — Supabase clients and authentication integration.
- `src/lib` — server-side AI gateway, database access, and shared utilities.
- `src/routes` — TanStack Start pages and the streaming chat API.
- `supabase/migrations` — versioned database migrations.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the complete project map and contribution boundaries.

## Model

`openai/gpt-5.6-sol` via the Lovable AI Gateway Responses API, with reasoning summaries streamed
into the chat.
