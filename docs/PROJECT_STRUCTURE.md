# Project structure

```
src/
  assets/                 Static application assets
  components/
    ai-elements/          Reusable AI chat primitives
    chat/                 Conversation sidebar, window, and tool displays
    data/                 Charts, results, schema, Mermaid, and insight views
    ui/                   Shared Radix-based UI components
  hooks/                  Shared React hooks
  integrations/supabase/  Supabase clients and authentication helpers
  lib/                    Server utilities, AI gateway, data access, and helpers
  routes/                 TanStack Start file-based routes and API endpoints
  server.ts               SSR server entry
  start.ts                Application bootstrap
supabase/
  migrations/             Database schema and seed history
  public/                 Supabase-hosted static assets
docs/                     Contributor and architecture documentation
```

## Boundaries

- Keep route-specific code in `src/routes/` and reusable presentation code in `src/components/`.
- Put database and AI gateway logic in `src/lib/`; do not access privileged services directly from UI components.
- Keep generated TanStack route files unchanged unless the router regenerates them.
- Add database changes as new files in `supabase/migrations/`; do not modify an already-applied migration.
- Store local credentials only in `.env`. Use `.env.example` to document new required variables.
