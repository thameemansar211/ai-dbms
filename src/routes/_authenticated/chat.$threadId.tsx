import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { getThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const fetchThread = useServerFn(getThread);

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchThread({ data: { threadId } }),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading conversation…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        This conversation doesn't exist.
      </div>
    );
  }

  const initialMessages = data.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: JSON.parse(message.parts) as UIMessage["parts"],
  })) as UIMessage[];

  return <ChatWindow key={threadId} threadId={threadId} initialMessages={initialMessages} />;
}
