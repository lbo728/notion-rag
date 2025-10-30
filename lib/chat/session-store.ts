import { supabase } from "@/lib/supabase/client";
import type { SessionMessage } from "@/lib/types/chat";

export async function getOrCreateSession(sessionId?: string): Promise<string> {
  if (sessionId) return sessionId;

  // For single-user mode, use a default user_id
  // In a multi-user setup, this would come from authentication
  const defaultUserId = "single-user";

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: defaultUserId,
    })
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
  _tokensUsed?: number
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) {
    // ignore non-critical errors for stats update
  }
}
