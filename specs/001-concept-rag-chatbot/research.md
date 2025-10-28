# Research: Notion RAG Chatbot

**Created**: 2025-10-28  
**Purpose**: Document research findings and technology decisions for the Notion RAG Chatbot implementation  
**Status**: Complete

## Executive Summary

This document consolidates research findings for building a RAG-based chatbot using personal Notion workspace as knowledge archive. Key decisions: Next.js 15 full-stack architecture with Supabase for data/vector storage, OpenAI embeddings, MMR retrieval, GPT-4o-mini for generation, and Vercel/Firebase deployment options.

## Technology Choices

### Frontend Framework: Next.js 15 with React 19

**Decision**: Next.js 15 (App Router, React 19, TypeScript)

**Rationale**:

- App Router provides excellent full-stack integration with API routes in same codebase
- React Server Components optimize performance and SEO
- Built-in routing, authentication, and Edge runtime support
- Strong ecosystem (shadcn/ui, TanStack Query integration)
- Excellent documentation and community support

**Alternatives Considered**:

- **Remix**: Similar features but smaller ecosystem
- **SvelteKit**: Excellent performance but less mature for full-stack apps
- **Nuxt.js (Vue)**: Good but React ecosystem richer for AI/ML integrations

**Trade-offs**:

- Learning curve for App Router vs Pages Router
- Server Components require understanding of client/server boundaries
- Acceptable for development efficiency and performance gains

---

### Authentication: NextAuth with Google Provider

**Decision**: NextAuth (Next.js Auth) with Google OAuth

**Rationale**:

- Seamless integration with Next.js
- Minimal configuration for Google OAuth
- Session management built-in
- Extensible to other providers if needed
- Supports edge runtime for better performance

**Alternatives Considered**:

- **Supabase Auth**: Would lock-in to Supabase ecosystem
- **Auth0**: Overkill for single-user to small-team use case
- **Clerk**: Commercial solution with cost overhead

**Trade-offs**:

- Adds Google OAuth dependency
- Requires client-side redirects for auth flow
- Necessary for secure access to Notion workspace

---

### Backend/Database: Supabase

**Decision**: Supabase (PostgreSQL with pgvector extension)

**Rationale**:

- pgvector extension perfect for vector embeddings storage
- Managed PostgreSQL with excellent Next.js integration
- Built-in auth (though we use NextAuth), real-time subscriptions
- Supabase client library optimized for Edge runtime
- Self-hosted option available for privacy (Constitution Principle I, V)
- Generous free tier for development

**Alternatives Considered**:

- **Qdrant (self-hosted)**: Good for local-first but adds deployment complexity
- **Pinecone**: Managed but per-query costs and vendor lock-in
- **Weaviate**: Open-source but heavier setup required

**Trade-offs**:

- Slight lock-in to Supabase ecosystem vs pure self-hosted solution
- Self-hosted Supabase requires infrastructure management
- Necessary for pgvector integration and edge runtime support

---

### Vector Database: Supabase pgvector

**Decision**: pgvector extension on Supabase PostgreSQL

**Rationale**:

- Native PostgreSQL integration, no separate service
- Excellent performance for similarity search (IVFFlat, HNSW indexes)
- Stores metadata alongside vectors (pageId, blockId, url, title, tags, lastEditedTime)
- Supports MMR (Maximum Marginal Relevance) via Supabase client or custom queries
- Single database for all data (vectors + relational data)

**Alternatives Considered**:

- **Separate vector DB (Qdrant/Pinecone)**: Adds complexity and network latency
- **Embedded Chroma**: Good for local but limited scalability
- **Weaviate**: Adds service complexity and deployment overhead

**Trade-offs**:

- Requires learning pgvector query syntax
- HNSW index creation can be slow for large datasets
- Optimized for combined structured + vector queries (Constitution Principle III)

---

### Notion Integration: SDK vs MCP

**Decision**: Notion SDK with MCP as optional enhancement

**Rationale**:

- Notion SDK provides comprehensive API access
- Direct control over sync scheduling and incremental updates
- Can implement custom MCP server for enhanced features later
- Good documentation and community support

**Alternatives Considered**:

- **Notion MCP only**: Early stage, limited documentation
- **Scraping**: Unreliable and violates ToS
- **Export/import**: Manual process, doesn't support incremental sync

**Trade-offs**:

- SDK requires manual block parsing vs MCP's built-in structure
- Need to implement own incremental sync logic
- Better control over sync cadence and error handling

---

### Embedding Model: OpenAI text-embedding-3-small

**Decision**: OpenAI text-embedding-3-small (1536 dimensions)

**Rationale**:

- High quality embeddings for semantic search
- Cost-effective: ~$0.02 per 1M tokens
- Good performance for English content (Notion text)
- Fast API with batch support
- Consistent with LLM choice (OpenAI ecosystem)

**Alternatives Considered**:

- **OpenAI text-embedding-3-large**: Better quality but higher cost and dimensions (3072)
- **Local embeddings (BGE, Sentence-BERT)**: No API costs but requires GPU, slower
- **Cohere embeddings**: Good alternative but adds another vendor

**Trade-offs**:

- API costs scale with content volume
- Dependency on OpenAI availability
- Good balance of quality, cost, and performance for use case

---

### Retrieval Strategy: MMR (Maximum Marginal Relevance)

**Decision**: MMR with k=8, fetchK=32

**Rationale**:

- Reduces redundancy in retrieved chunks (important for "rapid recall")
- Balances relevance and diversity of sources
- Ensures minimum 2 citations per response (Constitution Principle II)
- Better than simple similarity search for multi-document scenarios

**Alternatives Considered**:

- **Simple similarity search**: Faster but may return redundant chunks
- **Semantic search only**: Loses diversity for similar queries
- **Hybrid (BM25 + vector)**: Complex, may not be needed for Notion content

**Trade-offs**:

- More computation than simple similarity (fetchK=32 vs k=8)
- Requires understanding of diversity parameter tuning
- Critical for quality of citations and source attribution

---

### Chunking Strategy: Variable-length with 20-30% Overlap

**Decision**: Paragraph/header-based variable-length chunks with 20-30% overlap

**Rationale**:

- Preserves semantic units (paragraphs, headers, lists)
- Overlap ensures context at boundaries isn't lost
- Variable length (vs fixed size) better for Notion's varied content structure
- Maintains block-level attribution (pageId, blockId)

**Alternatives Considered**:

- **Fixed-size chunks (e.g., 512 tokens)**: Simpler but loses semantic boundaries
- **Sentence-based**: Too small, misses context
- **Page-level**: Too large, reduces retrieval precision

**Trade-offs**:

- More complex parsing logic
- Need to handle nested blocks (lists, toggles)
- Better than fixed-size for Notion's structured content

---

### LLM: GPT-4o-mini

**Decision**: OpenAI GPT-4o-mini for generation

**Rationale**:

- Cost-effective: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Fast response times (supports <3s P95 target)
- Good quality for summarization and Q&A tasks
- Reliable prompt following (important for citation format)
- Good balance of cost vs quality for "rapid recall" use case

**Alternatives Considered**:

- **GPT-4o**: Better quality but 20x higher cost
- **Claude 3 Haiku**: Good alternative but adds vendor dependency
- **Local LLM (Llama 3, Mistral)**: No API costs but requires GPU, slower

**Trade-offs**:

- Quality may not match GPT-4o for complex queries
- Acceptable for summarization and citation tasks (vs deep analysis)
- Critical for meeting cost and performance targets (Constitution Principle IV)

---

### Deployment: Vercel + Supabase (Primary)

**Decision**: Vercel + Supabase for primary deployment

**Rationale**:

- Vercel optimized for Next.js apps (edge runtime support)
- Excellent DX (automatic deployments, previews)
- Supabase integration via native client
- Generous free tier for personal projects
- Easy migration to self-hosted Supabase if needed

**Alternatives Considered**:

- **Firebase Hosting + Functions**: Good alternative but Firestore vs pgvector
- **Self-hosted (Docker)**: Full control but requires infrastructure management
- **AWS/GCP**: Overkill for personal use case

**Trade-offs**:

- Vendor lock-in to Vercel for deployment
- Supabase managed vs self-hosted choice available
- Best DX for rapid development and iteration

---

## Architecture Patterns

### Incremental Sync

**Strategy**: Timestamp-based filtering with Notion API

**Implementation**:

- Track `last_sync_time` in database
- Query Notion API: `last_edited_time > last_sync_time`
- Process only changed pages/blocks
- Preserve document properties (tags, status, editor, lastEditedTime)
- Re-embed changed chunks
- Update vector index incrementally

**Rationale**:

- Efficient (only process changes vs full re-index)
- Fast (meets 10-minute SLA from Constitution Principle IV)
- Preserves document properties (Constitution Principle III)
- Aligns with Notion API capabilities

**Trade-offs**:

- Requires handling timezone edge cases
- May miss updates within same second (rare)
- More complex than full re-index but necessary for performance

---

### Edge Runtime vs Node.js Runtime

**Decision**: Edge Runtime for API routes, Node.js for background sync

**Rationale**:

- Edge Runtime: Fast startup, good for latency-sensitive routes (chat, retrieval)
- Node.js Runtime: Better for complex processing (embedding, parsing)
- Next.js auto-selects based on route configuration

**Trade-offs**:

- Edge Runtime has API limitations (no Node.js built-ins)
- Some libraries not compatible with Edge Runtime
- Acceptable complexity for performance gains

---

### Caching Strategy

**Strategy**: Next.js `revalidateTag` with TanStack Query on client

**Implementation**:

- Server-side: Cache embeddings and retrieved chunks
- Client-side: TanStack Query caches API responses
- Revalidation on sync completion (trigger revalidateTag='rag:search')

**Rationale**:

- Reduces repeated API calls (OpenAI, Supabase)
- Speeds up response time (<3s P95 target)
- Ensures freshness with sync-triggered revalidation

**Trade-offs**:

- Added complexity in cache invalidation logic
- Memory usage for cached embeddings
- Critical for meeting performance targets

---

## Cost Estimates

### OpenAI Costs (per month)

- **Embeddings**: ~$0.02 per 1M tokens
  - Assuming 1000 pages, ~100K tokens initial: ~$2
  - Incremental sync (10 changes/day): ~$0.50
- **Chat (GPT-4o-mini)**: ~$0.60 per 1M output tokens
  - Assuming 100 queries/month, avg 200 tokens: ~$0.12

**Total OpenAI**: ~$2.62/month

### Supabase Costs

- **Free tier**: Sufficient for 1-5 users, ~1000 pages
- **pgvector**: Included, no additional cost
- **Storage**: <1GB for embeddings, metadata

**Total Supabase**: $0-20/month (free tier sufficient initially)

### Deployment Costs

- **Vercel**: Free tier sufficient (personal project)
- **Firebase**: Free tier sufficient

**Total**: $0-25/month for initial deployment

---

## Security Considerations

### API Key Management

- All secrets stored in `.env.local` (never committed)
- Notion integration token, Supabase keys, OpenAI API key
- NextAuth secret for session encryption

### Request Limits

- OpenAI: Rate limits per API key (check limits)
- Notion API: 3 requests/second (manageable for 10-min sync)
- Token limits: Enforce max tokens per request to prevent cost overruns

### Data Privacy

- Supabase self-hosted option available (Constitution Principle I)
- No third-party data sharing beyond OpenAI
- NextAuth session management
- Encryption at rest (Supabase), in transit (HTTPS)

---

## Observability Strategy

### Logging

- **Requests**: Log all chat requests with timestamp, user, query
- **Latency**: Track P95 response times per endpoint
- **Hit rate**: Track cache hit/miss ratios
- **Quality metrics**: Track accuracy@k, citation count per response

### Metrics Dashboard

- Sync status (last successful sync, last failed sync)
- Chat volume and latency over time
- Embedding batch processing times
- Vector database size and query performance

---

## Success Metrics

- **P95 Response Time**: <3 seconds (Constitution Principle IV)
- **Sync Latency**: <10 minutes (Constitution Principle IV)
- **Citation Coverage**: Minimum 2 sources per response (Constitution Principle II)
- **Retrieval Accuracy**: 90% of questions answered correctly with citations (SC-001)
- **User Satisfaction**: 80% rate as "helpful" (SC-003)

---

## Next Steps

1. **Phase 1**: Create data models, API contracts, quickstart guide
2. **Phase 2**: Implement core features with TDD
3. **Phase 3**: Integration testing and observability setup
4. **Phase 4**: Deployment and monitoring

---

**Research Complete**: All unknowns resolved. Ready for Phase 1 design.
