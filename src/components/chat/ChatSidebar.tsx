import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, PanelLeft, Plus, Trash2 } from "lucide-react";

import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { createThread, deleteThread, listThreads } from "@/lib/threads.functions";
import { cn } from "@/lib/utils";

/** ChatGPT-style conversation rail: new chat, thread history, account actions. */
export function ChatSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };

  const fetchThreads = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => fetchThreads(),
  });

  const newChat = useMutation({
    mutationFn: () => create(),
    onSuccess: async (thread) => {
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
  });

  const deleteChat = useMutation({
    mutationFn: (threadId: string) => remove({ data: { threadId } }),
    onSuccess: async (_result, threadId) => {
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (params.threadId === threadId) void navigate({ to: "/chat" });
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/auth" });
  };

  if (collapsed) {
    return (
      <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Open sidebar"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PanelLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => newChat.mutate()}
          aria-label="New chat"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" width={24} height={24} className="size-6" />
          <span className="font-display text-sm font-semibold">Data Converse</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => newChat.mutate()}
          disabled={newChat.isPending}
          className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          <Plus className="size-4" />
          New chat
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {threads.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
        )}
        {threads.map((thread) => {
          const active = params.threadId === thread.id;
          return (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                active ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                className="min-w-0 flex-1 truncate px-2 py-2 text-sm text-foreground"
                title={thread.title}
              >
                {thread.title}
              </Link>
              <button
                type="button"
                aria-label={`Delete ${thread.title}`}
                onClick={() => deleteChat.mutate(thread.id)}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
