# Tasks: Notion RAG Chatbot

**Input**: Design documents from `/specs/001-concept-rag-chatbot/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach (test-first) - tests MUST be written and FAIL before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure:

- `app/` - Next.js pages and API routes
- `lib/` - Shared utilities and services
- `components/` - React components
- `types/` - TypeScript type definitions
- `tests/` - Test files (unit, integration, e2e)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 15 project with TypeScript and App Router in root directory
- [x] T002 [P] Install dependencies: Next.js 15, React 19, TypeScript, shadcn/ui, TanStack Query, NextAuth, Supabase Client, OpenAI SDK, Notion SDK in package.json
- [x] T003 [P] Configure Tailwind CSS and shadcn/ui components in tailwind.config.ts and components.json
- [x] T004 [P] Setup environment configuration: Create .env.local with Notion, Supabase, OpenAI keys, and NextAuth secrets
- [x] T005 [P] Configure linting and formatting tools: ESLint, Prettier, and TypeScript in .eslintrc.json, .prettierrc, tsconfig.json
- [x] T006 [P] Setup testing frameworks: Vitest (unit), Playwright (E2E), Jest (component) in vitest.config.ts, playwright.config.ts, jest.config.js
- [x] T007 Create project structure: app/, lib/, components/, types/, tests/ directories per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Setup

- [x] T008 Setup Supabase project and configure connection in lib/supabase/client.ts
- [x] T009 [P] Create database migration: Create notion_pages table with indexes in database/migrations/001_create_notion_pages.sql
- [x] T010 [P] Create database migration: Create notion_blocks table with pgvector embedding column and indexes in database/migrations/002_create_notion_blocks.sql
- [x] T011 [P] Create database migration: Create chat_sessions, chat_messages, chat_citations tables in database/migrations/003_create_chat_tables.sql
- [x] T012 [P] Create database migration: Create collections and collection_conversations tables with GIN indexes in database/migrations/004_create_collections.sql
- [x] T013 [P] Create database migration: Create sync_jobs table in database/migrations/005_create_sync_jobs.sql
- [x] T014 Create database schema types: Generate TypeScript types from Supabase schema in lib/supabase/types.ts
- [x] T015 Run database migrations and verify Supabase pgvector extension is enabled

### Notion Integration - Milestone 1

- [x] T016 [P] Implement Notion API client with OAuth authentication in lib/notion/api-client.ts
- [x] T017 [P] Create Notion database listing utility to fetch all databases and pages in lib/notion/list-pages.ts
- [x] T018 Implement Notion page fetch with property preservation (tags/status/editor/lastEditedTime) in lib/notion/fetch-page.ts
- [x] T019 Create Notion block parser to extract text with metadata (code/quote/list preserved) in lib/notion/parser.ts
- [x] T020 Implement Notion block → text extractor maintaining code/quote/list formatting in lib/notion/text-extractor.ts

### Chunking and Embedding - Milestone 2

- [x] T021 [P] Implement chunker with header-aware grouping in lib/notion/chunker.ts
- [x] T022 Configure chunking parameters: 400-800 tokens variable-length, 20% overlap, paragraph/header boundaries in lib/notion/chunker.ts
- [x] T023 [P] Implement OpenAI embedding batch processing with retry/backoff logic in lib/embeddings/openai.ts
- [x] T024 Configure embedding batch size: 512-1024 tokens per batch in lib/embeddings/openai.ts
- [x] T025 [P] Design VectorStore schema for Supabase pgvector (1536 dimensions) in database/migrations/002_create_notion_blocks.sql
- [x] T026 Create vector storage utilities for saving embeddings with metadata in lib/retrieval/vector-store.ts

### Authentication & API Infrastructure

- [x] T027 Setup simple authentication for single-user mode (no OAuth required)
- [x] T028 Configure CORS middleware and session management in middleware.ts
- [x] T029 Create base API route handler utilities in lib/api/base-handler.ts
- [x] T030 Setup error handling and logging infrastructure in lib/utils/errors.ts and lib/utils/logger.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Retrieve Notion-backed answers with citations (Priority: P1) 🎯 MVP

**Goal**: User asks a question and receives a concise answer with at least 2 citation links to Notion pages/blocks

**Independent Test**: Trigger a single-turn question using a seeded Notion page and verify response content, tone, and source links without follow-up logic

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [P] [US1] Unit test for chunker header-aware grouping in tests/unit/lib/notion/chunker.test.ts
- [x] T032 [P] [US1] Unit test for MMR retriever (k=8, fetchK=32) in tests/unit/lib/retrieval/mmr-retriever.test.ts
- [x] T033 [P] [US1] Unit test for answer composer (summary + citation format) in tests/unit/lib/chat/answer-composer.test.ts
- [x] T034 [P] [US1] Integration test for /api/chat endpoint with citation generation in tests/integration/api/chat.test.ts
- [x] T035 [US1] E2E test for single-turn chat with citations in tests/e2e/chat.spec.ts

### Implementation for User Story 1 - Milestone 3: Search/Generation API

- [x] T036 [US1] Implement MMR retriever with k=8, fetchK=32 and relevance scoring in lib/retrieval/mmr-retriever.ts
- [x] T037 [US1] Create vector similarity search query with pgvector in lib/retrieval/vector-store.ts
- [x] T038 [US1] Implement answer composer generating summary + quote with minimum 2 citations in lib/chat/answer-composer.ts
- [x] T039 [US1] Add token guard limiting response size in lib/chat/answer-composer.ts
- [x] T040 [US1] Implement chat API route handler in app/api/chat/route.ts
- [x] T041 [US1] Add GPT-4o-mini integration for response generation in lib/chat/llm-client.ts
- [x] T042 [US1] Implement citation link extractor with page_id and block_id in lib/chat/citation-extractor.ts
- [x] T043 [US1] Add request validation and error handling for chat endpoint in app/api/chat/route.ts

### Implementation for User Story 1 - Milestone 4: Chat UI

- [x] T044 [US1] Create ChatInterface component with message input in app/components/chat/ChatInterface.tsx
- [x] T045 [US1] Implement MessageList component displaying messages with citations in app/components/chat/MessageList.tsx
- [x] T046 [US1] Create CitationLink component rendering clickable Notion page/block links in app/components/chat/CitationLink.tsx
- [x] T047 [US1] Add streaming support for chat responses in app/api/chat/route.ts
- [x] T048 [US1] Implement chat page with UI integration in app/(chat)/page.tsx
- [x] T049 [US1] Add TanStack Query hooks for chat API calls in app/hooks/use-chat.ts
- [x] T050 [US1] Create TypeScript types for chat messages and citations in app/types/chat.ts

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Maintain conversational context (Priority: P2)

**Goal**: Multi-turn dialogue with context preservation so follow-up questions reference earlier answers

**Independent Test**: Execute a scripted two-turn conversation where the second message relies on the first response, and confirm chatbot contextualizes the new answer correctly

### Tests for User Story 2

- [ ] T051 [P] [US2] Unit test for context window management in tests/unit/lib/chat/context-manager.test.ts
- [ ] T052 [P] [US2] Integration test for multi-turn conversation in tests/integration/api/multi-turn-chat.test.ts

### Implementation for User Story 2

- [ ] T053 [US2] Create chat session model and storage in lib/types/chat.ts (extends data-model.md)
- [ ] T054 [US2] Implement session context manager preserving last 10 messages in lib/chat/context-manager.ts
- [ ] T055 [US2] Add conversation history retrieval from database in lib/chat/session-store.ts
- [ ] T056 [US2] Update chat API to accept session_id and include context window in app/api/chat/route.ts
- [ ] T057 [US2] Enhance answer composer to use conversation context in lib/chat/answer-composer.ts
- [ ] T058 [US2] Add session persistence with chat_sessions and chat_messages tables in lib/chat/session-store.ts
- [ ] T059 [US2] Update UI to show conversation history in MessageList component in app/components/chat/MessageList.tsx

**Checkpoint**: User Story 2 should work independently with US1

---

## Phase 5: User Story 3 - Keep Notion knowledge fresh with incremental sync (Priority: P3)

**Goal**: Incremental sync of Notion workspace changes within 10 minutes, preserving document properties

**Independent Test**: Add a new Notion page, trigger incremental sync, and verify chatbot can answer a related question while displaying most recent sync timestamp and preserved properties

### Tests for User Story 3

- [ ] T060 [P] [US3] Unit test for incremental sync filtering by last_edited_time in tests/unit/lib/sync/notion-sync.test.ts
- [ ] T061 [P] [US3] Integration test for Notion sync API and status reporting in tests/integration/api/sync.test.ts

### Implementation for User Story 3 - Milestone 6: Scheduled Sync

- [ ] T062 [US3] Create sync job model and storage in lib/types/sync.ts
- [ ] T063 [US3] Implement incremental sync service detecting changed pages since last_sync_time in lib/sync/notion-sync.ts
- [ ] T064 [US3] Add property preservation (tags/status/editor/lastEditedTime) during sync in lib/sync/property-preserver.ts
- [ ] T065 [US3] Implement /api/sync/trigger endpoint for manual sync in app/api/sync/trigger/route.ts
- [ ] T066 [US3] Implement /api/sync/status endpoint returning latest sync job status in app/api/sync/status/route.ts
- [ ] T067 [US3] Create scheduler configuration for 10-minute incremental sync jobs in lib/sync/scheduler.ts
- [ ] T068 [US3] Add manual reindex button in UI triggering full sync in app/components/sync/SyncTrigger.tsx
- [ ] T069 [US3] Display sync status timestamp and success/failure in app/components/sync/SyncStatus.tsx
- [ ] T070 [US3] Implement sync job logging with pages/blocks/embeddings processed count in lib/sync/sync-logger.ts

**Checkpoint**: User Story 3 should work independently with incremental sync functional

---

## Phase 6: User Story 4 - Save answers to collections for later recall (Priority: P2)

**Goal**: Create topic-based collections (bookmarks) and save conversations with tagging and re-retrieval

**Independent Test**: Create a collection, save a conversation thread with tags, and later retrieve it by searching the collection

### Tests for User Story 4 - Milestone 5: Bookmarks

- [ ] T071 [P] [US4] Unit test for collection creation and management in tests/unit/lib/collections/collection-manager.test.ts
- [ ] T072 [P] [US4] Integration test for collections API CRUD operations in tests/integration/api/collections.test.ts

### Implementation for User Story 4

- [ ] T073 [US4] Create collection and collection_conversation models in lib/types/collections.ts
- [ ] T074 [US4] Implement collection CRUD operations in lib/collections/collection-service.ts
- [ ] T075 [US4] Add /api/collections endpoints for list, create, get, update, delete in app/api/collections/route.ts and app/api/collections/[id]/route.ts
- [ ] T076 [US4] Implement save conversation to collection with tags in lib/collections/collection-service.ts
- [ ] T077 [US4] Create collection search and filtering by tags in lib/collections/collection-search.ts
- [ ] T078 [US4] Build CollectionsPage UI for viewing and managing collections in app/(chat)/collections/page.tsx
- [ ] T079 [US4] Create CollectionCard and CollectionList components in app/components/collections/CollectionCard.tsx and CollectionList.tsx
- [ ] T080 [US4] Add "Save to Collection" button in chat interface in app/components/chat/ChatInterface.tsx
- [ ] T081 [US4] Implement re-retrieval of saved conversations from collections in app/hooks/use-collections.ts

**Checkpoint**: User Story 4 should work independently with collections functional

---

## Phase 7: Polish & Cross-Cutting Concerns - Milestone 7: Evaluation/Logging

**Purpose**: Evaluation, logging, metrics, and improvements affecting all features

- [ ] T082 [P] Implement quality evaluation script with question set and expected citations in scripts/evaluation/evaluate-quality.ts
- [ ] T083 [P] Add automatic scoring for accuracy@k and citation matching in scripts/evaluation/scoring.ts
- [ ] T084 Implement request/response logging for all API endpoints in lib/utils/api-logger.ts
- [ ] T085 [P] Add latency tracking (P50, P95, P99) for chat responses in lib/metrics/latency-tracker.ts
- [ ] T086 [P] Implement hit rate tracking for vector retrieval cache in lib/metrics/hit-rate-tracker.ts
- [ ] T087 [P] Add failure type classification and error rate tracking in lib/metrics/error-tracker.ts
- [ ] T088 Create observability dashboard showing sync latency, response times, and quality metrics in app/(admin)/dashboard/page.tsx
- [ ] T089 [P] Update documentation in README.md with setup instructions from quickstart.md
- [ ] T090 [P] Add API documentation and usage examples in docs/api-reference.md
- [ ] T091 Run quickstart.md validation to ensure all setup steps work
- [ ] T092 Code cleanup and refactoring across all modules
- [ ] T093 [P] Additional unit tests for edge cases in tests/unit/
- [ ] T094 Security hardening: input validation, SQL injection prevention, rate limiting
- [ ] T095 Performance optimization: caching with revalidateTag, embedding batch optimization
- [ ] T096 Add deployment configuration for Vercel + Supabase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational
  - US2 (P2): Can start after Foundational - integrates with US1 for context
  - US3 (P3): Can start after Foundational - independent sync functionality
  - US4 (P2): Can start after Foundational - builds on US1 chat sessions
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories (MVP)
- **User Story 2 (P2)**: Depends on US1 completion for multi-turn context (uses chat_sessions from US1)
- **User Story 3 (P3)**: Can start after Foundational independently - sync infrastructure
- **User Story 4 (P2)**: Depends on US1 for chat sessions to save - collections extend US1 functionality

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Models before services (database layer before business logic)
- Services before endpoints (business logic before API)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T007)
- All Foundational tasks marked [P] can run in parallel (T009-T013, T027-T029)
- All tests for a user story marked [P] can run in parallel (e.g., T031-T035 for US1)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel after Foundational (US2, US3, US4 parallel if US1 is complete)
- All Polish tasks marked [P] can run in parallel (T082-T083, T085-T087, T089-T091, T093)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T031: "Unit test for chunker in tests/unit/lib/notion/chunker.test.ts"
Task T032: "Unit test for MMR retriever in tests/unit/lib/retrieval/mmr-retriever.test.ts"
Task T033: "Unit test for answer composer in tests/unit/lib/chat/answer-composer.test.ts"
Task T034: "Integration test for /api/chat endpoint in tests/integration/api/chat.test.ts"
Task T035: "E2E test for single-turn chat in tests/e2e/chat.spec.ts"

# Launch all database migrations together:
Task T009: "Create notion_pages table in database/migrations/001_create_notion_pages.sql"
Task T010: "Create notion_blocks table in database/migrations/002_create_notion_blocks.sql"
Task T011: "Create chat tables in database/migrations/003_create_chat_tables.sql"
Task T012: "Create collections tables in database/migrations/004_create_collections.sql"
Task T013: "Create sync_jobs table in database/migrations/005_create_sync_jobs.sql"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T030) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T031-T050) - Single-turn chat with citations
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - MVP delivers basic RAG chatbot with citations

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (Notion sync, embeddings, indexing ready)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: Chat with citations!)
3. Add User Story 2 → Test independently → Deploy/Demo (Multi-turn conversation)
4. Add User Story 4 → Test independently → Deploy/Demo (Collections/bookmarks)
5. Add User Story 3 → Test independently → Deploy/Demo (Incremental sync)
6. Add Polish phase → Deploy/Demo (Full featured product)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Developer A**: Complete Setup + Foundational (Phase 1-2)
2. **Developer B**: Start setup in parallel, then assist with Foundational
3. Once Foundational is done:
   - **Developer A**: User Story 1 (Chat + Citations)
   - **Developer B**: User Story 3 (Sync infrastructure) - Independent
4. Once US1 is complete:
   - **Developer A**: User Story 2 (Multi-turn context)
   - **Developer B**: User Story 4 (Collections) - Independent
5. Both developers work on Polish phase together

---

## Task Summary

- **Total Tasks**: 96 tasks
- **Setup Phase (Phase 1)**: 7 tasks
- **Foundational Phase (Phase 2)**: 24 tasks (blocks all user stories)
- **User Story 1 (Phase 3)**: 20 tasks (MVP - single-turn chat with citations)
- **User Story 2 (Phase 4)**: 9 tasks (multi-turn context)
- **User Story 3 (Phase 5)**: 10 tasks (incremental sync)
- **User Story 4 (Phase 6)**: 11 tasks (collections/bookmarks)
- **Polish Phase (Phase 7)**: 15 tasks (evaluation, logging, metrics, docs)

**MVP Scope**: Phases 1-3 only (36 tasks for basic RAG chatbot with citations)

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD: Write tests FIRST (T031-T035 for US1), ensure they FAIL before implementation
- Foundational phase (Phase 2) is CRITICAL - blocks all user stories
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow Next.js App Router conventions from plan.md
- Use TypeScript for all new code
- Verify Supabase connection and pgvector extension before starting vector operations
