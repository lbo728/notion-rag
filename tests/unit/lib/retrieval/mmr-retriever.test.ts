import { describe, it, expect, vi, beforeEach } from "vitest";
import { mmrRetrieve, MMRResult } from "@/lib/retrieval/mmr-retriever";
import { generateEmbedding } from "@/lib/embeddings/openai";
import { vectorSearch, VectorSearchResult } from "@/lib/retrieval/vector-store";

// Mock dependencies
vi.mock("@/lib/embeddings/openai");
vi.mock("@/lib/retrieval/vector-store");
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MMR Retriever", () => {
  const mockQuery = "test query";
  const mockEmbedding = new Array(1536).fill(0.1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return k=8 results when fetchK=32 candidates available", async () => {
    // Create 32 mock candidates
    const mockCandidates: VectorSearchResult[] = Array.from(
      { length: 32 },
      (_, i) => ({
        page_id: `page-${i}`,
        block_id: `block-${i}`,
        content: `Content ${i}`,
        similarity: 1.0 - i * 0.01, // Decreasing similarity
        metadata: {
          title: `Title ${i}`,
          type: "paragraph",
        },
      })
    );

    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue(mockCandidates);

    const results = await mmrRetrieve(mockQuery, 8, 32);

    expect(results).toHaveLength(8);
    expect(vectorSearch).toHaveBeenCalledWith(mockEmbedding, 32);
    expect(generateEmbedding).toHaveBeenCalledWith(mockQuery);
  });

  it("should return fewer results when fetchK < k", async () => {
    const mockCandidates: VectorSearchResult[] = Array.from(
      { length: 5 },
      (_, i) => ({
        page_id: `page-${i}`,
        block_id: `block-${i}`,
        content: `Content ${i}`,
        similarity: 1.0 - i * 0.1,
        metadata: {
          title: `Title ${i}`,
          type: "paragraph",
        },
      })
    );

    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue(mockCandidates);

    const results = await mmrRetrieve(mockQuery, 8, 32);

    expect(results.length).toBeLessThanOrEqual(5);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should return empty array when no candidates found", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue([]);

    const results = await mmrRetrieve(mockQuery, 8, 32);

    expect(results).toEqual([]);
  });

  it("should apply MMR diversity penalty", async () => {
    // Create candidates with varying similarity
    const mockCandidates: VectorSearchResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Similar content A",
        similarity: 0.95,
        metadata: { title: "Title 1", type: "paragraph" },
      },
      {
        page_id: "page-2",
        block_id: "block-2",
        content: "Similar content A", // Similar content to first
        similarity: 0.90,
        metadata: { title: "Title 2", type: "paragraph" },
      },
      {
        page_id: "page-3",
        block_id: "block-3",
        content: "Different content B", // Different content
        similarity: 0.85,
        metadata: { title: "Title 3", type: "paragraph" },
      },
      {
        page_id: "page-4",
        block_id: "block-4",
        content: "Another different content C",
        similarity: 0.80,
        metadata: { title: "Title 4", type: "paragraph" },
      },
    ];

    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue(mockCandidates);

    const results = await mmrRetrieve(mockQuery, 3, 32);

    expect(results).toHaveLength(3);
    expect(results[0].mmr_score).toBeGreaterThanOrEqual(0);
    
    // First result should have highest relevance
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
  });

  it("should include mmr_score in results", async () => {
    const mockCandidates: VectorSearchResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Content 1",
        similarity: 0.9,
        metadata: { title: "Title 1", type: "paragraph" },
      },
    ];

    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue(mockCandidates);

    const results = await mmrRetrieve(mockQuery, 8, 32);

    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      expect(result).toHaveProperty("mmr_score");
      expect(typeof result.mmr_score).toBe("number");
    });
  });

  it("should preserve metadata in results", async () => {
    const mockCandidates: VectorSearchResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Content 1",
        similarity: 0.9,
        metadata: {
          title: "Test Title",
          type: "paragraph",
          custom_field: "custom_value",
        },
      },
    ];

    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);
    vi.mocked(vectorSearch).mockResolvedValue(mockCandidates);

    const results = await mmrRetrieve(mockQuery, 8, 32);

    expect(results[0].metadata).toEqual(mockCandidates[0].metadata);
    expect(results[0].page_id).toBe("page-1");
    expect(results[0].block_id).toBe("block-1");
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("Embedding generation failed");
    vi.mocked(generateEmbedding).mockRejectedValue(error);

    await expect(mmrRetrieve(mockQuery, 8, 32)).rejects.toThrow(error);
  });
});

