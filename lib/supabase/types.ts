/**
 * TypeScript types for Supabase database tables
 * Generated from database/migrations/*.sql
 */

export interface NotionPage {
  id: string;
  page_id: string;
  title: string | null;
  url: string;
  properties: Record<string, unknown>;
  last_edited_time: string | null;
  last_edited_by: string | null;
  created_time: string | null;
  created_by: string | null;
  parent_page_id: string | null;
  workspace_id: string | null;
  synced_at: string;
  updated_at: string;
}

export interface NotionBlock {
  id: string;
  page_id: string;
  block_id: string;
  block_type: string | null;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatCitation {
  id: string;
  message_id: string;
  block_id: string;
  page_id: string;
  block_id_text: string;
  title: string | null;
  url: string;
  snippet: string | null;
  relevance_score: number | null;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  conversation_count: number;
}

export interface CollectionConversation {
  id: string;
  collection_id: string;
  session_id: string;
  tags: string[];
  notes: string | null;
  saved_at: string;
}

export interface SyncJob {
  id: string;
  job_type: "scheduled" | "manual" | "retry";
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  pages_processed: number;
  blocks_processed: number;
  embeddings_created: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
