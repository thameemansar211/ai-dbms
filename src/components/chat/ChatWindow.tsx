import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ToolPartView } from "@/components/chat/ToolPartView";
import { EmptyState } from "@/components/chat/EmptyState";
import { supabase } from "@/integrations/supabase/client";

export type ChatWindowProps = {
  threadId: string;
  initialMessages: UIMessage[];
};

/** Chat surface for one conversation thread, persisted in the database. */
export function ChatWindow({ threadId, initialMessages }: ChatWindowProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    onError: (err) => setError(err.message || "Something went wrong. Please try again."),
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const focusInput = useCallback(() => textareaRef.current?.focus(), []);

  useEffect(() => {
    focusInput();
  }, [focusInput, threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setError(null);
      setInput("");
      void sendMessage({ text: value });
      focusInput();
    },
    [busy, focusInput, sendMessage],
  );

  const lastMessage = messages[messages.length - 1];
  const waiting =
    status === "submitted" ||
    (status === "streaming" && (!lastMessage || lastMessage.role === "user"));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <EmptyState onPick={submit} />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent className="w-full">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <MessageResponse key={index}>{part.text}</MessageResponse>;
                    }
                    if (part.type === "reasoning" && part.text.trim()) {
                      return (
                        <details
                          key={index}
                          className="mb-3 rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground"
                        >
                          <summary className="cursor-pointer select-none font-medium">
                            Thinking
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap">{part.text}</p>
                        </details>
                      );
                    }
                    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                      return <ToolPartView key={index} part={part as never} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}

          {waiting && (
            <div className="px-1 py-2">
              <Shimmer>Analyzing your question…</Shimmer>
            </div>
          )}

          {error && (
            <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(_message, event) => {
              event.preventDefault();
              submit(input);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about revenue, customers, products, inventory…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!busy && input.trim().length === 0}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Read-only SQL · every answer shows the query it ran
          </p>
        </div>
      </div>
    </div>
  );
}
