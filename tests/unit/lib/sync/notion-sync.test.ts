import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  incrementalSyncNotionPages,
  syncNotionPages,
} from "@/lib/sync/notion-sync-service";
import { listAllPages } from "@/lib/notion/list-pages";
import { getSupabase } from "@/lib/supabase/client";
import { getNotionClient } from "@/lib/notion/api-client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Mock dependencies
vi.mock("@/lib/notion/list-pages");
vi.mock("@/lib/supabase/client");
vi.mock("@/lib/notion/api-client");
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("incrementalSyncNotionPages", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  describe("filtering by last_edited_time", () => {
    it("Returns empty result when no previous sync exists (falls back to full sync)", async () => {
      // Mock getLastSyncTime to return null (no previous sync)
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        single: mockSingle,
      });

      // Mock syncNotionPages to return early
      vi.mocked(syncNotionPages).mockResolvedValue({
        pagesProcessed: 0,
        blocksProcessed: 0,
        embeddingsCreated: 0,
        errors: [],
      });

      const result = await incrementalSyncNotionPages();

      expect(mockSupabase.from).toHaveBeenCalledWith("sync_jobs");
      expect(mockEq).toHaveBeenCalledWith("status", "completed");
      expect(mockOrder).toHaveBeenCalledWith("completed_at", { ascending: false });
      expect(syncNotionPages).toHaveBeenCalled();
      expect(result.pagesProcessed).toBe(0);
    });

    it("filters pages edited after last sync time", async () => {
      const lastSyncTime = new Date("2024-01-01T10:00:00Z");

      // Mock getLastSyncTime to return a date
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { completed_at: lastSyncTime.toISOString() },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        single: mockSingle,
      });

      // Mock pages with different last_edited_time values
      const oldPage = {
        id: "page-old",
        last_edited_time: "2023-12-31T10:00:00Z",
      } as PageObjectResponse;

      const newPage1 = {
        id: "page-new-1",
        last_edited_time: "2024-01-02T10:00:00Z",
      } as PageObjectResponse;

      const newPage2 = {
        id: "page-new-2",
        last_edited_time: "2024-01-03T10:00:00Z",
      } as PageObjectResponse;

      vi.mocked(listAllPages).mockResolvedValue([
        oldPage,
        newPage1,
        newPage2,
      ] as any);

      // Mock sync job creation
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: { id: "job-123" },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "sync_jobs") {
          return {
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      // Mock syncPage calls (we'll check that only new pages are synced)
      const mockUpdate = vi.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "sync_jobs") {
          return {
            insert: mockInsert,
            update: mockUpdate,
          } as any;
        }
        return {} as any;
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock Notion client for syncPage
      const mockNotionClient = {
        pages: {
          retrieve: vi.fn().mockResolvedValue({
            url: "https://notion.so/test",
            last_edited_time: "2024-01-02T10:00:00Z",
            properties: {},
          }),
        },
        blocks: {
          children: {
            list: vi.fn().mockResolvedValue({
              results: [],
              next_cursor: null,
            }),
          },
        },
      };

      vi.mocked(getNotionClient).mockReturnValue(mockNotionClient as any);

      // Mock other dependencies
      vi.mock("@/lib/notion/parser", () => ({
        parseBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/text-extractor", () => ({
        extractTextFromBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/chunker", () => ({
        chunkText: vi.fn().mockReturnValue([]),
      }));

      const result = await incrementalSyncNotionPages();

      // Should process only pages edited after lastSyncTime
      expect(result.pagesProcessed).toBe(2); // newPage1 and newPage2
      expect(result.errors).toEqual([]);
    });

    it("includes only pages with last_edited_time property", async () => {
      const lastSyncTime = new Date("2024-01-01T10:00:00Z");

      // Mock getLastSyncTime
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { completed_at: lastSyncTime.toISOString() },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        single: mockSingle,
      });

      // Mock pages: one with last_edited_time, one without
      const pageWithTime = {
        id: "page-with-time",
        last_edited_time: "2024-01-02T10:00:00Z",
      } as PageObjectResponse;

      const pageWithoutTime = {
        id: "page-without-time",
        // No last_edited_time property
      } as PageObjectResponse;

      vi.mocked(listAllPages).mockResolvedValue([
        pageWithTime,
        pageWithoutTime,
      ] as any);

      // Mock sync job operations
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: { id: "job-123" },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "sync_jobs") {
          return {
            insert: mockInsert,
            update: mockUpdate,
          } as any;
        }
        return {} as any;
      });

      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock Notion client
      const mockNotionClient = {
        pages: {
          retrieve: vi.fn().mockResolvedValue({
            url: "https://notion.so/test",
            properties: {},
          }),
        },
        blocks: {
          children: {
            list: vi.fn().mockResolvedValue({
              results: [],
              next_cursor: null,
            }),
          },
        },
      };

      vi.mocked(getNotionClient).mockReturnValue(mockNotionClient as any);

      // Mock parsing/chunking dependencies
      vi.mock("@/lib/notion/parser", () => ({
        parseBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/text-extractor", () => ({
        extractTextFromBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/chunker", () => ({
        chunkText: vi.fn().mockReturnValue([]),
      }));

      const result = await incrementalSyncNotionPages();

      // Should only process page with last_edited_time
      expect(result.pagesProcessed).toBe(1);
    });

    it("correctly compares last_edited_time with lastSyncTime", async () => {
      const lastSyncTime = new Date("2024-01-01T10:00:00Z");

      // Mock getLastSyncTime
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { completed_at: lastSyncTime.toISOString() },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        single: mockSingle,
      });

      // Pages: one before, one exactly at, one after sync time
      const beforeSync = {
        id: "page-before",
        last_edited_time: "2023-12-31T10:00:00Z",
      } as PageObjectResponse;

      const atSync = {
        id: "page-at",
        last_edited_time: "2024-01-01T10:00:00Z",
      } as PageObjectResponse;

      const afterSync = {
        id: "page-after",
        last_edited_time: "2024-01-01T10:00:01Z", // 1 second after
      } as PageObjectResponse;

      vi.mocked(listAllPages).mockResolvedValue([
        beforeSync,
        atSync,
        afterSync,
      ] as any);

      // Mock sync job operations
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: { id: "job-123" },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "sync_jobs") {
          return {
            insert: mockInsert,
            update: mockUpdate,
          } as any;
        }
        return {} as any;
      });

      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock Notion client
      const mockNotionClient = {
        pages: {
          retrieve: vi.fn().mockResolvedValue({
            url: "https://notion.so/test",
            properties: {},
          }),
        },
        blocks: {
          children: {
            list: vi.fn().mockResolvedValue({
              results: [],
              next_cursor: null,
            }),
          },
        },
      };

      vi.mocked(getNotionClient).mockReturnValue(mockNotionClient as any);

      // Mock dependencies
      vi.mock("@/lib/notion/parser", () => ({
        parseBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/text-extractor", () => ({
        extractTextFromBlocks: vi.fn().mockReturnValue([]),
      }));
      vi.mock("@/lib/notion/chunker", () => ({
        chunkText: vi.fn().mockReturnValue([]),
      }));

      const result = await incrementalSyncNotionPages();

      // Should only process page AFTER sync time (not equal or before)
      expect(result.pagesProcessed).toBe(1); // Only afterSync
    });
  });
});

