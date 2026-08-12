import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";

import { createThread, listThreads } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

/** Entry point: opens the most recent conversation, or starts a new one. */
function ChatIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const threads = await fetchThreads();
      const target = threads[0] ?? (await create());
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      void navigate({ to: "/chat/$threadId", params: { threadId: target.id }, replace: true });
    })();
  }, [create, fetchThreads, navigate, queryClient]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Opening your chat…
    </div>
  );
}
