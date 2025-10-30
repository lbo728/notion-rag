import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";
import { mmrRetrieve } from "@/lib/retrieval/mmr-retriever";
import { composeAnswer } from "@/lib/chat/answer-composer";

// Mock dependencies
vi.mock("@/lib/retrieval/mmr-retriever");
vi.mock("@/lib/chat/answer-composer");
vi.mock("@/lib/chat/answer-composer-stream", () => ({
  composeAnswerStream: vi.fn().mockResolvedValue({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: test\n\n"));
        controller.close();
      },
    }),
  }),
}));
vi.mock("@/lib/chat/session-store", () => ({
  getOrCreateSession: vi.fn().mockResolvedValue("test-session-id"),
  saveMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/chat/context-manager", () => ({
  getSessionMessages: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return response with content and citations", async () => {
    const mockRetrievedDocs = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content 1",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: { title: "Title 1", type: "paragraph" },
      },
      {
        page_id: "page-2",
        block_id: "block-2",
        content: "Test content 2",
        similarity: 0.9,
        mmr_score: 0.88,
        metadata: { title: "Title 2", type: "paragraph" },
      },
    ];

    const mockAnswer = {
      content: "This is a test answer with citations.",
      citations: [
        {
          title: "Title 1",
          url: "https://notion.so/page1",
          snippet: "Test content 1",
          relevance_score: 0.92,
        },
        {
          title: "Title 2",
          url: "https://notion.so/page2",
          snippet: "Test content 2",
          relevance_score: 0.88,
        },
      ],
      tokens_used: 150,
    };

    vi.mocked(mmrRetrieve).mockResolvedValue(mockRetrievedDocs as any);
    vi.mocked(composeAnswer).mockResolvedValue(mockAnswer);

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test query" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("content");
    expect(data).toHaveProperty("citations");
    expect(data.citations).toHaveLength(2);
    expect(data.metadata).toHaveProperty("tokens_used");
    expect(data.metadata).toHaveProperty("sources_count");

    expect(mmrRetrieve).toHaveBeenCalledWith("test query", 8, 32);
    expect(composeAnswer).toHaveBeenCalledWith(
      "test query",
      mockRetrievedDocs,
      expect.any(Array)
    );
  });

  it("should return 400 when query is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Query is required");
  });

  it("should return 400 when query is not a string", async () => {
    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: 123 }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Query is required");
  });

  it("should handle form-data content type", async () => {
    const mockRetrievedDocs = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: { title: "Title", type: "paragraph" },
      },
    ];

    const mockAnswer = {
      content: "Answer",
      citations: [],
      tokens_used: 50,
    };

    vi.mocked(mmrRetrieve).mockResolvedValue(mockRetrievedDocs as any);
    vi.mocked(composeAnswer).mockResolvedValue(mockAnswer);

    const formData = new FormData();
    formData.append("query", "test query");

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("content");
  });

  it("should handle streaming requests", async () => {
    const mockRetrievedDocs = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: { title: "Title", type: "paragraph" },
      },
    ];

    vi.mocked(mmrRetrieve).mockResolvedValue(mockRetrievedDocs as any);

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test query", stream: true }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    // Streaming response should have text/event-stream content type
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(mmrRetrieve).mockRejectedValue(new Error("Retrieval failed"));

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test query" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("message");
  });

  it("should ensure minimum 2 citations in response", async () => {
    const mockRetrievedDocs = [
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "Test content 1",
        similarity: 0.95,
        mmr_score: 0.92,
        metadata: { title: "Title 1", type: "paragraph" },
      },
      {
        page_id: "page-2",
        block_id: "block-2",
        content: "Test content 2",
        similarity: 0.9,
        mmr_score: 0.88,
        metadata: { title: "Title 2", type: "paragraph" },
      },
    ];

    const mockAnswer = {
      content: "Answer with citations",
      citations: [
        {
          title: "Title 1",
          url: "https://notion.so/page1",
          snippet: "Test content 1",
          relevance_score: 0.92,
        },
        {
          title: "Title 2",
          url: "https://notion.so/page2",
          snippet: "Test content 2",
          relevance_score: 0.88,
        },
      ],
      tokens_used: 100,
    };

    vi.mocked(mmrRetrieve).mockResolvedValue(mockRetrievedDocs as any);
    vi.mocked(composeAnswer).mockResolvedValue(mockAnswer);

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "test query" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.citations.length).toBeGreaterThanOrEqual(2);
  });
});
