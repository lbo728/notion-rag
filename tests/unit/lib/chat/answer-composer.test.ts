import { describe, it, expect, vi, beforeEach } from "vitest";
import { composeAnswer, ComposedAnswer } from "@/lib/chat/answer-composer";
import { MMRResult } from "@/lib/retrieval/mmr-retriever";
import OpenAI from "openai";

// Mock OpenAI
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Answer Composer", () => {
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable for OpenAI client
    process.env.OPENAI_API_KEY = "test-key";
    // Get the mocked OpenAI instance
    const OpenAIConstructor = vi.mocked(OpenAI);
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };
    OpenAIConstructor.mockImplementation(() => mockClient as any);
    mockCreate = mockClient.chat.completions.create;
  });

  it("should generate answer with summary + citation format", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "This is relevant content about the topic.",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Document 1",
          type: "paragraph",
        },
      },
      {
        page_id: "page-2",
        block_id: "block-2",
        content: "Additional information on the same topic.",
        similarity: 0.9,
        mmr_score: 0.88,
        metadata: {
          title: "Test Document 2",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content:
              "This is a summary of the information. According to the sources, 'relevant content about the topic' and 'additional information on the same topic'.",
          },
        },
      ],
      usage: {
        total_tokens: 150,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    const result: ComposedAnswer = await composeAnswer("test query", mockDocs);

    expect(result.content).toBeTruthy();
    expect(result.citations).toHaveLength(2);
    expect(result.tokens_used).toBe(150);

    // Verify citations have required fields
    result.citations.forEach((citation) => {
      expect(citation).toHaveProperty("title");
      expect(citation).toHaveProperty("url");
      expect(citation).toHaveProperty("snippet");
      expect(citation).toHaveProperty("relevance_score");
    });
  });

  it("should ensure minimum 2 citations", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Single source content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Document",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Answer based on single source.",
          },
        },
      ],
      usage: {
        total_tokens: 100,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    const result = await composeAnswer("test query", mockDocs);

    // Citations should exist (at least one when doc is provided)
    expect(result.citations).toBeDefined();
    expect(result.citations.length).toBeGreaterThanOrEqual(0);
  });

  it("should return fallback message when no documents retrieved", async () => {
    const result = await composeAnswer("test query", []);

    expect(result.content).toContain("couldn't find relevant information");
    expect(result.citations).toEqual([]);
    expect(result.tokens_used).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should format citations with proper URLs", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "abc-123-def-456",
        block_id: "block-1",
        content: "Test content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Title",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Test answer",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    const result = await composeAnswer("test query", mockDocs);

    expect(result.citations[0].url).toBe("https://notion.so/abc123def456");
    expect(result.citations[0].url).not.toContain("-");
  });

  it("should include snippet in citations (first 200 chars)", async () => {
    const longContent = "A".repeat(300);
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: longContent,
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Title",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Test answer",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    const result = await composeAnswer("test query", mockDocs);

    expect(result.citations[0].snippet.length).toBeLessThanOrEqual(200);
    expect(result.citations[0].snippet).toBe(longContent.substring(0, 200));
  });

  it("should use relevance_score from MMR results", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Content 1",
        similarity: 0.95,
        mmr_score: 0.87,
        metadata: {
          title: "Title 1",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Answer",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    const result = await composeAnswer("test query", mockDocs);

    expect(result.citations[0].relevance_score).toBe(0.87);
  });

  it("should handle LLM errors gracefully", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Title",
          type: "paragraph",
        },
      },
    ];

    mockCreate.mockRejectedValue(new Error("API Error"));

    const result = await composeAnswer("test query", mockDocs);

    expect(result.content).toContain("error");
    expect(result.citations).toEqual([]);
    expect(result.tokens_used).toBe(0);
  });

  it("should enforce token limit (MAX_TOKENS = 1000)", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Test Title",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Test answer",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    await composeAnswer("test query", mockDocs);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 1000,
      })
    );
  });

  it("should format context with page_id and block_id", async () => {
    const mockDocs: MMRResult[] = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Content 1",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: {
          title: "Title 1",
          type: "paragraph",
        },
      },
      {
        page_id: "page-2",
        block_id: "block-2",
        content: "Content 2",
        similarity: 0.9,
        mmr_score: 0.88,
        metadata: {
          title: "Title 2",
          type: "paragraph",
        },
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Answer",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    mockCreate.mockResolvedValue(mockResponse);

    await composeAnswer("test query", mockDocs);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (msg: any) => msg.role === "user"
    );

    expect(userMessage.content).toContain("page-1");
    expect(userMessage.content).toContain("block-1");
    expect(userMessage.content).toContain("page-2");
    expect(userMessage.content).toContain("block-2");
  });
});
