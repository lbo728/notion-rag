import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as TriggerPOST, GET as TriggerGET } from "@/app/api/sync/trigger/route";
import { GET as StatusGET } from "@/app/api/sync/status/route";
import { NextRequest } from "next/server";
import {
  syncNotionPages,
  incrementalSyncNotionPages,
} from "@/lib/sync/notion-sync-service";
import { getSupabase } from "@/lib/supabase/client";

// Mock dependencies
vi.mock("@/lib/sync/notion-sync-service");
vi.mock("@/lib/supabase/client");
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/sync/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger full sync by default", async () => {
    vi.mocked(syncNotionPages).mockResolvedValue({
      pagesProcessed: 10,
      blocksProcessed: 50,
      embeddingsCreated: 50,
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/sync/trigger", {
      method: "POST",
    });

    const response = await TriggerPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("full sync initiated");
    expect(data.status).toBe("processing");
    expect(syncNotionPages).toHaveBeenCalled();
    expect(incrementalSyncNotionPages).not.toHaveBeenCalled();
  });

  it("should trigger incremental sync when mode=incremental", async () => {
    vi.mocked(incrementalSyncNotionPages).mockResolvedValue({
      pagesProcessed: 5,
      blocksProcessed: 25,
      embeddingsCreated: 25,
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/sync/trigger?mode=incremental",
      {
        method: "POST",
      }
    );

    const response = await TriggerPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("incremental sync initiated");
    expect(data.status).toBe("processing");
    expect(incrementalSyncNotionPages).toHaveBeenCalled();
    expect(syncNotionPages).not.toHaveBeenCalled();
  });

  it("should handle sync errors gracefully", async () => {
    vi.mocked(syncNotionPages).mockRejectedValue(
      new Error("Sync failed")
    );

    const request = new NextRequest("http://localhost/api/sync/trigger", {
      method: "POST",
    });

    const response = await TriggerPOST(request);
    const data = await response.json();

    // Should still return 200 (non-blocking)
    expect(response.status).toBe(200);
    expect(data.status).toBe("processing");
  });
});

describe("GET /api/sync/status", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should return idle status when no sync jobs exist", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("idle");
    expect(data.last_sync).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("sync_jobs");
    expect(mockOrder).toHaveBeenCalledWith("started_at", { ascending: false });
  });

  it("should return completed sync status with metrics", async () => {
    const completedAt = new Date("2024-01-15T10:00:00Z").toISOString();

    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "job-123",
        status: "completed",
        completed_at: completedAt,
        pages_processed: 10,
        blocks_processed: 50,
        embeddings_created: 50,
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("completed");
    expect(data.last_sync).toBe(completedAt);
    expect(data.pages_processed).toBe(10);
    expect(data.blocks_processed).toBe(50);
    expect(data.embeddings_created).toBe(50);
  });

  it("should return running status for in-progress sync", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "job-456",
        status: "running",
        completed_at: null,
        pages_processed: 5,
        blocks_processed: 20,
        embeddings_created: 20,
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("running");
    expect(data.last_sync).toBeNull();
    expect(data.pages_processed).toBe(5);
  });

  it("should return failed status with error information", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "job-789",
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Connection timeout",
        pages_processed: 0,
        blocks_processed: 0,
        embeddings_created: 0,
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("failed");
    expect(data.last_sync).toBeTruthy();
  });

  it("should handle database errors gracefully", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("idle");
    expect(data.last_sync).toBeNull();
  });

  it("should return zero metrics when missing", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "job-999",
        status: "completed",
        completed_at: new Date().toISOString(),
        // Missing metrics fields
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });

    const request = new NextRequest("http://localhost/api/sync/status", {
      method: "GET",
    });

    const response = await StatusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pages_processed).toBe(0);
    expect(data.blocks_processed).toBe(0);
    expect(data.embeddings_created).toBe(0);
  });
});

