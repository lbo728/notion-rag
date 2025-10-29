import { supabase } from "@/lib/supabase/client";
import { SessionMessage } from "@/lib/types/chat";

const DEFAULT_CONTEXT_WINDOW = 10;

export async function getSessionMessages(
  sessionId: string,
  limit: number = DEFAULT_CONTEXT_WINDOW
): Promise<SessionMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data || []) as SessionMessage[];
}

export function buildContextText(messages: SessionMessage[]): string {
  if (!messages || messages.length === 0) return "";
  const lines = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`);
  return lines.join("\n");
}
