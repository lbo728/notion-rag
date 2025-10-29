import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSessionMessages,
  buildContextText,
} from "@/lib/chat/context-manager";
import { SessionMessage } from "@/lib/types/chat";
import { supabase } from "@/lib/supabase/client";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("Context Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSessionMessages", () => {
    it("should fetch last 10 messages by default", async () => {
      const mockMessages: SessionMessage[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `msg-${i}`,
          session_id: "session-1",
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
          created_at: new Date().toISOString(),
        })
      );

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: mockMessages, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await getSessionMessages("session-1");

      expect(supabase.from).toHaveBeenCalledWith("chat_messages");
      expect(result).toHaveLength(10);
      expect(result[0].content).toBe("Message 0");
    });

    it("should fetch specified number of messages when limit is provided", async () => {
      const mockMessages: SessionMessage[] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `msg-${i}`,
          session_id: "session-1",
          role: "user",
          content: `Message ${i}`,
          created_at: new Date().toISOString(),
        })
      );

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: mockMessages, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await getSessionMessages("session-1", 5);

      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(5);
    });

    it("should return empty array when no messages found", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await getSessionMessages("session-1");

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const result = await getSessionMessages("session-1");

      expect(result).toEqual([]);
    });

    it("should order messages by created_at ascending", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      await getSessionMessages("session-1");

      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true });
    });
  });

  describe("buildContextText", () => {
    it("should format messages with role prefixes", () => {
      const messages: SessionMessage[] = [
        {
          id: "1",
          session_id: "session-1",
          role: "user",
          content: "What is React?",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          session_id: "session-1",
          role: "assistant",
          content: "React is a JavaScript library.",
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          session_id: "session-1",
          role: "user",
          content: "Tell me more.",
          created_at: new Date().toISOString(),
        },
      ];

      const context = buildContextText(messages);

      expect(context).toContain("USER: What is React?");
      expect(context).toContain("ASSISTANT: React is a JavaScript library.");
      expect(context).toContain("USER: Tell me more.");
      expect(context.split("\n").length).toBe(3);
    });

    it("should return empty string for empty messages array", () => {
      const context = buildContextText([]);
      expect(context).toBe("");
    });

    it("should handle messages with different roles", () => {
      const messages: SessionMessage[] = [
        {
          id: "1",
          session_id: "session-1",
          role: "user",
          content: "Question 1",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          session_id: "session-1",
          role: "assistant",
          content: "Answer 1",
          created_at: new Date().toISOString(),
        },
        {
          id: "3",
          session_id: "session-1",
          role: "user",
          content: "Question 2",
          created_at: new Date().toISOString(),
        },
      ];

      const context = buildContextText(messages);

      const lines = context.split("\n");
      expect(lines[0]).toBe("USER: Question 1");
      expect(lines[1]).toBe("ASSISTANT: Answer 1");
      expect(lines[2]).toBe("USER: Question 2");
    });

    it("should preserve message content exactly", () => {
      const messages: SessionMessage[] = [
        {
          id: "1",
          session_id: "session-1",
          role: "user",
          content: "Complex message with\nnewlines and\nmultiple lines",
          created_at: new Date().toISOString(),
        },
      ];

      const context = buildContextText(messages);

      expect(context).toContain(
        "Complex message with\nnewlines and\nmultiple lines"
      );
    });
  });
});
