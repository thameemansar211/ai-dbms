import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId, title: "New chat" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: thread, error } = await context.supabase
      .from("threads")
      .select("id, title, updated_at")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) return null;

    const { data: rows, error: messagesError } = await context.supabase
      .from("messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);

    return {
      thread,
      messages: (rows ?? []).map((row) => ({
        id: row.id,
        role: row.role as "user" | "assistant" | "system",
        parts: JSON.stringify(Array.isArray(row.parts) ? row.parts : []),
      })),
    };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string(), title: z.string() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const title = data.title.trim().slice(0, 80) || "New chat";
    const { error } = await context.supabase
      .from("threads")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, title };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
