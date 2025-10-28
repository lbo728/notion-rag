# Notion RAG Chatbot Constitution

<!--
Sync Impact Report:
- Version: 1.0.0 → 2.0.0 (major principles redefinition)
- Modified principles: All 7 principles redefined to align with user requirements
- Added: Privacy-first mandate, citation requirements, reproducible pipeline, performance targets, local-first deployment
- Removed: Generic service architecture principles, API-first design constraints
- Templates requiring updates: ⚠️ plan-template.md (pending), ⚠️ spec-template.md (pending), ✅ constitution.md (updated)
- Follow-up TODOs: None
-->

## Core Principles

### I. Privacy & Data Protection (NON-NEGOTIABLE)

Personal information and documents MUST remain private by default. No data is transmitted to external services without explicit user consent. Local-first architecture with optional cloud deployment. User data encryption at rest and in transit. Minimal privilege access to Notion API (read-only scopes). No unnecessary data retention or third-party data sharing.

**Rationale**: Users trust the system with personal knowledge base; privacy violations are irreparable. Local-first deployment ensures data sovereignty.

### II. Verifiable Citations

Every response MUST include citations to source documents/pages/blocks with at least 2 source links per reply. Citations must be accurate, clickable, and traceable back to original Notion content. System MUST track provenance chain: ingestion → chunking → embedding → retrieval → citation.

**Rationale**: Users need to verify answers and trace to source material. Trust requires transparency. Supports "rapid recall" not "new learning" goal.

### III. Reproducible Pipeline

The data pipeline MUST be deterministic and replayable: Notion sync → chunking → embedding → indexing → retrieval. All transformations must be logged with timestamps, parameters, and intermediate states. Pipeline must support incremental updates without full re-indexing. Document properties (tags, status, editor) MUST be preserved through pipeline stages.

**Rationale**: Debugging retrieval issues requires traceability. Replay capability enables deterministic testing (Constitution compliance). Incremental updates reduce costs and latency.

### IV. Performance & Simplicity

System MUST achieve 95% of responses under 3 seconds (P95 latency < 3s). UI must be simple and intuitive—no unnecessary features. Notion changes MUST be reflected in index within 10 minutes of update. All core functionality must be accessible with minimal user training.

**Rationale**: Users expect instant knowledge recall. Delays break "rapid recall" flow. Simple UI reduces cognitive overhead. Fast sync maintains trust in answer accuracy.

### V. Local-First, Cloud-Optional

System MUST run completely locally with optional cloud deployment. Core functionality (RAG retrieval, chat interface, collections) must work offline. Cloud services are optional enhancements (e.g., multi-device sync, collaborative features) not core requirements. Deployment choice MUST NOT compromise privacy principle.

**Rationale**: Local-first ensures data sovereignty and offline capability. Cloud optional for users who want multi-device access without sacrificing privacy via third-party services.

### VI. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory: Tests must be written and approved before implementation begins. Red-Green-Refactor cycle strictly enforced. Integration tests required for: Notion API interactions, sync workflows, retrieval accuracy, citation accuracy, and pipeline reproducibility.

**Rationale**: Quality gates prevent regressions. Integration tests verify complete pipeline. Deterministic testing ensures Constitution Principle III (reproducible pipeline) compliance.

### VII. Observability & Reliability

System MUST provide structured logging, metrics for sync status, retrieval latency, citation accuracy, and error tracking. Dashboard showing sync freshness, last successful sync timestamp, citation counts per response. Failure alerts MUST be surfaced immediately to user. Chat sessions MUST be replayable for debugging.

**Rationale**: Users need visibility into system health to trust answers. Sync failures must be detected within 10-minute SLA. Replay capability supports citation verification and Constitution Principle III compliance.

## Additional Constraints

### Technology Standards

- Python 3.11+ for backend services
- FastAPI for API layer
- PostgreSQL for persistent storage (chat sessions, collections, sync metadata)
- Qdrant (local deployment) for vector database
- OpenAI API for embeddings and chat LLM
- Notion API SDK for integration
- React + TypeScript for frontend (optional web UI)

### Data Integrity

- Incremental sync preserves Notion document properties (tags, status, editor, last_edited_by)
- Chat sessions replayable for deterministic testing
- Collection data supports tagging and search indexing
- Citation metadata includes page_id, block_id, title, url, last_edited_time

### Deployment

- Local-first: Run backend + vector DB + PostgreSQL on local machine
- Docker containerization for all services (optional cloud deployment)
- Environment-based configuration (dev/local/prod)
- Health check endpoints required

## Success Criteria

- Top-k retrieval accuracy: At least 90% of pilot evaluation questions receive accurate answers with proper citations (SC-001)
- Sync latency: Notion changes reflected in index within 10 minutes in 98% of sync cycles (SC-004 update: 10 min target vs 4 hours)
- Response time: 95% of user prompts return response within 3 seconds under normal usage (SC-002 update: 3s target vs 5s)
- Citation coverage: Every response includes minimum 2 source links to Notion pages/blocks (SC-003 new requirement)
- User satisfaction: 80% of weekly active users rate answers as "helpful" with emphasis on rapid recall effectiveness

## Development Workflow

### Quality Gates

1. All tests pass (unit + integration + contract)
2. Code review required for all changes
3. Citation accuracy verified (minimum 2 sources per response)
4. Performance targets met (P95 < 3s, 10-min sync SLA)
5. Privacy compliance verified (local-first, no unauthorized data transmission)
6. Retrieval evaluation gate must pass (SC-001: 90% accuracy threshold)

### Review Process

- PRs must include updated tests and documentation
- Constitution violations require justification table
- Breaking changes require migration plan
- Citation format changes require user approval (affects trust)

## Governance

Constitution supersedes all other practices. Amendments require documentation, approval, and migration plan. All PRs must verify compliance with privacy, performance, and citation requirements. Complexity must be justified with measurable benefits. Privacy Principle I violations are grounds for immediate rejection.

**Version**: 2.0.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-10-28
