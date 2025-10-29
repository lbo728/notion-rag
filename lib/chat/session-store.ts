import { supabase } from "@/lib/supabase/client";
import { ChatSessionRecord, SessionMessage } from "@/lib/types/chat";

export async function getOrCreateSession(sessionId?: string): Promise<string> {
  if (sessionId) return sessionId;
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveMessage(message: SessionMessage): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    session_id: message.session_id,
    role: message.role,
    content: message.content,
  });
  if (error) throw error;
}

export async function updateSessionStats(
  sessionId: string,
  tokensUsed?: number
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      message_count: null as any,
      total_tokens: null as any,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) {
    // ignore non-critical errors for stats update
  }
}
