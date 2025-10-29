/**
 * TypeScript types for chat messages and citations
 */

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Citation {
  id?: string;
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
  page_id?: string;
  block_id?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  citations: Citation[];
  metadata?: {
    tokens_used?: number;
    sources_count?: number;
    response_time?: number;
  };
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name?: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface ChatApiRequest {
  query: string;
  session_id?: string;
  context?: ChatMessage[];
}

export interface ChatApiResponse {
  content: string;
  citations: Citation[];
  metadata: {
    tokens_used: number;
    sources_count: number;
  };
}
