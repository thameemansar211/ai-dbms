import { useEffect, useId, useRef, useState } from "react";

/** Renders Mermaid source (ER diagram, process flow, decision tree) client-side. */
export function MermaidView({ code, title }: { code: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            background: "transparent",
            primaryColor: "#0f2f33",
            primaryTextColor: "#e6f4f1",
            primaryBorderColor: "#2dd4bf",
            lineColor: "#94a3b8",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0b1220",
            fontFamily: "DM Sans, sans-serif",
            fontSize: "13px",
          },
        });
        const { svg } = await mermaid.render(`mmd-${id}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not render this diagram.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <figure className="rounded-xl border border-border bg-card p-4">
      <figcaption className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-card-foreground">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => setShowSource((value) => !value)}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          {showSource ? "Hide source" : "Mermaid source"}
        </button>
      </figcaption>

      {error ? (
        <p className="text-sm text-destructive">Diagram error: {error}</p>
      ) : (
        <div ref={containerRef} className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" />
      )}

      {showSource && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <code>{code}</code>
        </pre>
      )}
    </figure>
  );
}
