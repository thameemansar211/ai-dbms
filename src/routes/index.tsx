import { createFileRoute, Link } from "@tanstack/react-router";

import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Data Converse — Chat with your database" },
      {
        name: "description",
        content:
          "Conversational AI data assistant: ask questions in plain English and get SQL, charts, ER diagrams and insights.",
      },
      { property: "og:title", content: "Data Converse — Chat with your database" },
      {
        property: "og:description",
        content:
          "Conversational AI data assistant: ask questions in plain English and get SQL, charts, ER diagrams and insights.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <img src={logo} alt="Data Converse logo" width={80} height={80} className="size-20" />
      <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">
        Chat with your database
      </h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Ask questions in plain English. Data Converse inspects the schema, runs read-only SQL and
        answers with charts, ER diagrams and insights — with every conversation saved to your
        account.
      </p>
      <Link
        to="/chat"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Start chatting
      </Link>
    </main>
  );
}
