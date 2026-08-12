/** Server-only persistence for chat threads and messages (acts as the signed-in user). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";

function isNewApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createUserClient(token: string): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is not configured");

  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  return token.split(".").length === 3 ? token : null;
}

function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

/** Persists a message, ignoring duplicates of the same client-side message id. */
export async function saveMessage(
  supabase: SupabaseClient<Database>,
  userId: string,
  threadId: string,
  message: UIMessage,
) {
  const { error } = await supabase.from("messages").upsert(
    {
      thread_id: threadId,
      user_id: userId,
      role: message.role,
      parts: JSON.parse(JSON.stringify(message.parts)) as never,
      client_id: message.id,
    },
    { onConflict: "thread_id,client_id", ignoreDuplicates: true },
  );
  if (error) console.error("[chat] failed to save message", error.message);
}

/** Bumps updated_at and derives a title from the first user message. */
export async function touchThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
  firstUserMessage: UIMessage | undefined,
) {
  const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };

  if (firstUserMessage) {
    const { data } = await supabase
      .from("threads")
      .select("title")
      .eq("id", threadId)
      .maybeSingle();
    if (data && (data.title === "New chat" || !data.title)) {
      const text = messageText(firstUserMessage);
      if (text) patch.title = text.slice(0, 60);
    }
  }

  const { error } = await supabase.from("threads").update(patch).eq("id", threadId);
  if (error) console.error("[chat] failed to update thread", error.message);
}
