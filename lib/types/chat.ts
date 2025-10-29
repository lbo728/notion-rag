export interface SessionMessage {
  id?: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface SessionContextWindow {
  session_id: string;
  messages: SessionMessage[]; // ordered newest last
}

export interface ChatSessionRecord {
  id: string;
  user_id?: string | null;
  session_name?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  message_count?: number | null;
  total_tokens?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}
