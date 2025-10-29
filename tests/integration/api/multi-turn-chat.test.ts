import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";
import { mmrRetrieve } from "@/lib/retrieval/mmr-retriever";
import { composeAnswer } from "@/lib/chat/answer-composer";
import { getOrCreateSession, saveMessage } from "@/lib/chat/session-store";
import { getSessionMessages } from "@/lib/chat/context-manager";

// Mock dependencies
vi.mock("@/lib/retrieval/mmr-retriever");
vi.mock("@/lib/chat/answer-composer");
vi.mock("@/lib/chat/session-store");
vi.mock("@/lib/chat/context-manager");
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/chat - Multi-turn Conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should maintain context across multiple turns", async () => {
    const sessionId = "test-session-123";

    // First turn
    vi.mocked(getOrCreateSession).mockResolvedValue(sessionId);
    vi.mocked(getSessionMessages).mockResolvedValue([]);
    vi.mocked(mmrRetrieve).mockResolvedValue([
      {
        page_id: "page-1",
        block_id: "block-1",
        content: "React is a library",
        similarity: 0.9,
        mmr_score: 0.85,
        metadata: { title: "React Guide", type: "paragraph" },
      },
    ] as any);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "React is a JavaScript library for building user interfaces.",
      citations: [],
      tokens_used: 50,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const firstRequest = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "What is React?" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const firstResponse = await POST(firstRequest);
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData.content).toContain("React");
    expect(firstData.metadata.session_id).toBe(sessionId);

    // Second turn - should include context from first turn
    vi.mocked(getSessionMessages).mockResolvedValue([
      {
        id: "msg-1",
        session_id: sessionId,
        role: "user",
        content: "What is React?",
        created_at: new Date().toISOString(),
      },
      {
        id: "msg-2",
        session_id: sessionId,
        role: "assistant",
        content: "React is a JavaScript library for building user interfaces.",
        created_at: new Date().toISOString(),
      },
    ]);

    const secondRequest = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        query: "Can you tell me more about it?",
        session_id: sessionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const secondResponse = await POST(secondRequest);
    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(getSessionMessages).toHaveBeenCalledWith(sessionId, 10);
    expect(composeAnswer).toHaveBeenCalledWith(
      "Can you tell me more about it?",
      expect.any(Array),
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: "What is React?",
        }),
        expect.objectContaining({
          role: "assistant",
          content:
            "React is a JavaScript library for building user interfaces.",
        }),
      ])
    );
  });

  it("should reuse existing session when session_id is provided", async () => {
    const existingSessionId = "existing-session-456";

    vi.mocked(getOrCreateSession).mockResolvedValue(existingSessionId);
    vi.mocked(getSessionMessages).mockResolvedValue([]);
    vi.mocked(mmrRetrieve).mockResolvedValue([]);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "Answer",
      citations: [],
      tokens_used: 20,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        query: "Test question",
        session_id: existingSessionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await POST(request);

    expect(getOrCreateSession).toHaveBeenCalledWith(existingSessionId);
    expect(getSessionMessages).toHaveBeenCalledWith(existingSessionId, 10);
  });

  it("should create new session when session_id is not provided", async () => {
    const newSessionId = "new-session-789";

    vi.mocked(getOrCreateSession).mockResolvedValue(newSessionId);
    vi.mocked(getSessionMessages).mockResolvedValue([]);
    vi.mocked(mmrRetrieve).mockResolvedValue([]);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "Answer",
      citations: [],
      tokens_used: 20,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "Test question" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(getOrCreateSession).toHaveBeenCalledWith(undefined);
    expect(data.metadata.session_id).toBe(newSessionId);
  });

  it("should persist user and assistant messages", async () => {
    const sessionId = "session-persist-test";

    vi.mocked(getOrCreateSession).mockResolvedValue(sessionId);
    vi.mocked(getSessionMessages).mockResolvedValue([]);
    vi.mocked(mmrRetrieve).mockResolvedValue([]);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "Assistant response",
      citations: [],
      tokens_used: 30,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ query: "User question" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await POST(request);

    // Verify both messages were saved
    expect(saveMessage).toHaveBeenCalledTimes(2);
    expect(saveMessage).toHaveBeenNthCalledWith(1, {
      session_id: sessionId,
      role: "user",
      content: "User question",
    });
    expect(saveMessage).toHaveBeenNthCalledWith(2, {
      session_id: sessionId,
      role: "assistant",
      content: "Assistant response",
    });
  });

  it("should limit context to last 10 messages", async () => {
    const sessionId = "session-context-limit";

    // Create 15 messages in history
    const historyMessages = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i}`,
      session_id: sessionId,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
      created_at: new Date().toISOString(),
    }));

    vi.mocked(getOrCreateSession).mockResolvedValue(sessionId);
    vi.mocked(getSessionMessages).mockResolvedValue(historyMessages);
    vi.mocked(mmrRetrieve).mockResolvedValue([]);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "Response",
      citations: [],
      tokens_used: 25,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        query: "New question",
        session_id: sessionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await POST(request);

    // Verify context is limited to 10 messages
    expect(getSessionMessages).toHaveBeenCalledWith(sessionId, 10);
    expect(composeAnswer).toHaveBeenCalledWith(
      "New question",
      expect.any(Array),
      expect.arrayContaining([
        expect.objectContaining({
          content: "Message 5", // Should start from message 5 (last 10 of 15)
        }),
      ])
    );
  });

  it("should handle empty conversation history gracefully", async () => {
    const sessionId = "session-empty-history";

    vi.mocked(getOrCreateSession).mockResolvedValue(sessionId);
    vi.mocked(getSessionMessages).mockResolvedValue([]);
    vi.mocked(mmrRetrieve).mockResolvedValue([]);
    vi.mocked(composeAnswer).mockResolvedValue({
      content: "Answer without context",
      citations: [],
      tokens_used: 20,
    });
    vi.mocked(saveMessage).mockResolvedValue();

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        query: "First question",
        session_id: sessionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(composeAnswer).toHaveBeenCalledWith(
      "First question",
      expect.any(Array),
      []
    );
  });
});
