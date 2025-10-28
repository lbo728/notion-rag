/**
 * TypeScript Type Definitions for Notion RAG Chatbot API
 * Generated from OpenAPI 3.0 specification
 * @see api.yaml
 */

// ============================================================================
// Core Types
// ============================================================================

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations?: Citation[]; // Only for assistant messages
}

export interface Citation {
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name: string | null;
  started_at: string;
  message_count: number;
  total_tokens: number;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface SendMessageRequest {
  message: string;
  session_id?: string; // Optional existing session ID
  context_window?: number; // Number of previous messages (default: 10, min: 1, max: 50)
}

export interface SendMessageResponse {
  id: string;
  content: string;
  citations: Citation[]; // Minimum 2 citations per response
  tokens_used: number;
  response_time_ms: number;
}

export interface ListSessionsQuery {
  limit?: number; // Default: 20, min: 1, max: 100
  offset?: number; // Default: 0
}

export interface ListSessionsResponse {
  sessions: ChatSession[];
  total: number;
}

export interface GetSessionResponse extends ChatSessionDetail {}

export interface CreateSessionResponse extends ChatSession {}

export interface DeleteSessionResponse {
  // 204 No Content
}

// ============================================================================
// Sync API Types
// ============================================================================

export interface TriggerSyncRequest {
  sync_type?: "full" | "incremental"; // Default: incremental
  force?: boolean; // Default: false
}

export interface TriggerSyncResponse {
  job_id: string;
  status: "running" | "queued";
  started_at: string;
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
}

export interface GetSyncStatusResponse extends SyncJob {}

export interface GetSyncJobStatusResponse extends SyncJob {}

// ============================================================================
// Collections API Types
// ============================================================================

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  conversation_count: number;
  created_at: string;
}

export interface CollectionConversation {
  session_id: string;
  tags: string[];
  saved_at: string;
}

export interface CollectionDetail extends Collection {
  conversations: CollectionConversation[];
}

export interface ListCollectionsResponse {
  collections: Collection[];
}

export interface CreateCollectionRequest {
  name: string; // Max length: 100
  description?: string; // Max length: 500
}

export interface CreateCollectionResponse extends Collection {}

export interface GetCollectionResponse extends CollectionDetail {}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
}

export interface UpdateCollectionResponse extends Collection {}

export interface SaveConversationRequest {
  session_id: string; // Required
  tags?: string[];
  notes?: string; // Max length: 1000
}

export interface SaveConversationResponse {
  // 201 Created
}

// ============================================================================
// Notion Types (from Data Model)
// ============================================================================

export interface NotionPage {
  id: string;
  page_id: string;
  title: string | null;
  url: string;
  properties: NotionPageProperties;
  last_edited_time: string;
  last_edited_by: string | null;
  created_time: string;
  created_by: string | null;
  parent_page_id: string | null;
  workspace_id: string;
  synced_at: string;
  updated_at: string;
}

export interface NotionPageProperties {
  tags: string[];
  status: string;
  editor: string;
  category?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface NotionBlock {
  id: string;
  page_id: string;
  block_id: string;
  block_type: string; // paragraph, heading_1, heading_2, bulleted_list_item, etc.
  content: string;
  embedding: number[]; // 1536 dimensions for text-embedding-3-small
  metadata: NotionBlockMetadata;
  created_at: string;
  updated_at: string;
}

export interface NotionBlockMetadata {
  original_block_format: string;
  tokens: number;
  overlap_info: {
    prev_overlap: number;
    next_overlap: number;
  };
  start_position: number;
  end_position: number;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  database: "connected" | "disconnected";
  supabase: "connected" | "disconnected";
  openai: "connected" | "disconnected";
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

export interface ValidationError extends ApiError {
  code: "VALIDATION_ERROR";
  fields: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// Request/Response Helpers
// ============================================================================

/**
 * HTTP Request configuration for API calls
 */
export interface ApiRequest<T = unknown> {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  body?: T;
  headers?: Record<string, string>;
}

/**
 * HTTP Response wrapper
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

/**
 * API Client interface
 */
export interface ApiClient {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  listSessions(query?: ListSessionsQuery): Promise<ListSessionsResponse>;
  createSession(): Promise<CreateSessionResponse>;
  getSession(sessionId: string): Promise<GetSessionResponse>;
  deleteSession(sessionId: string): Promise<void>;
  triggerSync(request?: TriggerSyncRequest): Promise<TriggerSyncResponse>;
  getSyncStatus(): Promise<GetSyncStatusResponse>;
  getSyncJobStatus(jobId: string): Promise<GetSyncJobStatusResponse>;
  listCollections(): Promise<ListCollectionsResponse>;
  createCollection(request: CreateCollectionRequest): Promise<CreateCollectionResponse>;
  getCollection(collectionId: string): Promise<GetCollectionResponse>;
  updateCollection(collectionId: string, request: UpdateCollectionRequest): Promise<UpdateCollectionResponse>;
  deleteCollection(collectionId: string): Promise<void>;
  saveConversation(collectionId: string, request: SaveConversationRequest): Promise<void>;
  healthCheck(): Promise<HealthCheckResponse>;
}

// ============================================================================
// TanStack Query Types
// ============================================================================

/**
 * Query keys for TanStack Query caching
 */
export const queryKeys = {
  chat: {
    all: ["chat"] as const,
    sessions: () => [...queryKeys.chat.all, "sessions"] as const,
    session: (id: string) => [...queryKeys.chat.sessions(), id] as const,
    messages: (sessionId: string) => [...queryKeys.chat.session(sessionId), "messages"] as const,
  },
  sync: {
    all: ["sync"] as const,
    status: () => [...queryKeys.sync.all, "status"] as const,
    job: (jobId: string) => [...queryKeys.sync.all, "job", jobId] as const,
  },
  collections: {
    all: ["collections"] as const,
    detail: (id: string) => [...queryKeys.collections.all, id] as const,
    conversations: (collectionId: string) => [...queryKeys.collections.detail(collectionId), "conversations"] as const,
  },
} as const;

/**
 * Mutation options for TanStack Query
 */
export interface ChatMutations {
  sendMessage: (request: SendMessageRequest) => void;
  createSession: () => void;
  deleteSession: (sessionId: string) => void;
}

export interface SyncMutations {
  triggerSync: (request?: TriggerSyncRequest) => void;
}

export interface CollectionMutations {
  createCollection: (request: CreateCollectionRequest) => void;
  updateCollection: (collectionId: string, request: UpdateCollectionRequest) => void;
  deleteCollection: (collectionId: string) => void;
  saveConversation: (collectionId: string, request: SaveConversationRequest) => void;
}

// ============================================================================
// Next.js Route Handler Types
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

/**
 * Route handler context
 */
export interface RouteContext {
  params: Record<string, string>;
  request: NextRequest;
}

/**
 * Route handler function
 */
export type RouteHandler<T = unknown> = (context: RouteContext) => Promise<NextResponse<T>>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Timestamp range filter
 */
export interface DateRangeQuery {
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order?: "asc" | "desc";
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "error" in error && "message" in error;
}

export function isValidationError(error: unknown): error is ValidationError {
  return isApiError(error) && error.code === "VALIDATION_ERROR" && "fields" in error;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type {
  SendMessageRequest as ChatRequest,
  SendMessageResponse as ChatResponse,
  Citation as SourceCitation,
  HealthCheckResponse as HealthStatus,
};
