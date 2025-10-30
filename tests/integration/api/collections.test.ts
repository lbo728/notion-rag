import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/collections/route";
import { GET as GetById, PUT, DELETE } from "@/app/api/collections/[id]/route";
import { POST as SaveConversation } from "@/app/api/collections/[id]/conversations/route";
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/client";

// Mock dependencies
vi.mock("@/lib/supabase/client");
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/collections", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should return list of collections for user", async () => {
    const mockCollections = [
      {
        id: "collection-1",
        user_id: "user-1",
        name: "Collection 1",
        description: "Description 1",
        conversation_count: 5,
        created_at: new Date().toISOString(),
      },
      {
        id: "collection-2",
        user_id: "user-1",
        name: "Collection 2",
        description: null,
        conversation_count: 3,
        created_at: new Date().toISOString(),
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: mockCollections,
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

    const request = new NextRequest("http://localhost/api/collections", {
      method: "GET",
      headers: {
        // TODO: Add auth headers when auth is implemented
      },
    });

    // TODO: Uncomment when GET endpoint is implemented
    // const response = await GET(request);
    // const data = await response.json();

    // expect(response.status).toBe(200);
    // expect(data.collections).toHaveLength(2);
    // expect(data.collections[0].name).toBe("Collection 1");
  });

  it("should return empty array when user has no collections", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
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

    const request = new NextRequest("http://localhost/api/collections", {
      method: "GET",
    });

    // TODO: Test empty collections response
    expect(mockSupabase.from).toHaveBeenCalledWith("collections");
  });
});

describe("POST /api/collections", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should create a new collection", async () => {
    const newCollection = {
      id: "collection-new",
      user_id: "user-1",
      name: "New Collection",
      description: "New description",
      conversation_count: 0,
      created_at: new Date().toISOString(),
    };

    const mockInsert = vi.fn().mockReturnThis();
    const mockInsertSelect = vi.fn().mockReturnThis();
    const mockInsertSingle = vi.fn().mockResolvedValue({
      data: newCollection,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({
      select: mockInsertSelect,
    });
    mockInsertSelect.mockReturnValue({
      single: mockInsertSingle,
    });

    const request = new NextRequest("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: "New Collection",
        description: "New description",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // TODO: Uncomment when POST endpoint is implemented
    // const response = await POST(request);
    // const data = await response.json();

    // expect(response.status).toBe(201);
    // expect(data.name).toBe("New Collection");
  });

  it("should validate required name field", async () => {
    const request = new NextRequest("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({
        description: "Missing name",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // TODO: Test validation error for missing name
  });
});

describe("GET /api/collections/{id}", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should return collection with conversations", async () => {
    const collectionDetail = {
      id: "collection-123",
      user_id: "user-1",
      name: "My Collection",
      description: "Description",
      conversation_count: 2,
      created_at: new Date().toISOString(),
      conversations: [
        {
          session_id: "session-1",
          tags: ["tag1", "tag2"],
          saved_at: new Date().toISOString(),
        },
        {
          session_id: "session-2",
          tags: ["tag3"],
          saved_at: new Date().toISOString(),
        },
      ],
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: collectionDetail,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/collection-123",
      {
        method: "GET",
      }
    );

    // TODO: Uncomment when GET by ID endpoint is implemented
    // const response = await GetById(request, { params: { id: "collection-123" } });
    // const data = await response.json();

    // expect(response.status).toBe(200);
    // expect(data.name).toBe("My Collection");
    // expect(data.conversations).toHaveLength(2);
  });

  it("should return 404 when collection not found", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
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
      single: mockSingle,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/non-existent",
      {
        method: "GET",
      }
    );

    // TODO: Test 404 response
  });
});

describe("PUT /api/collections/{id}", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should update collection name and description", async () => {
    const updatedCollection = {
      id: "collection-123",
      user_id: "user-1",
      name: "Updated Name",
      description: "Updated description",
      conversation_count: 0,
      updated_at: new Date().toISOString(),
    };

    const mockUpdate = vi.fn().mockReturnThis();
    const mockUpdateEq = vi.fn().mockReturnThis();
    const mockUpdateSelect = vi.fn().mockReturnThis();
    const mockUpdateSingle = vi.fn().mockResolvedValue({
      data: updatedCollection,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({
      eq: mockUpdateEq,
    });
    mockUpdateEq.mockReturnValue({
      select: mockUpdateSelect,
    });
    mockUpdateSelect.mockReturnValue({
      single: mockUpdateSingle,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/collection-123",
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Updated Name",
          description: "Updated description",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // TODO: Uncomment when PUT endpoint is implemented
    // const response = await PUT(request, { params: { id: "collection-123" } });
    // const data = await response.json();

    // expect(response.status).toBe(200);
    // expect(data.name).toBe("Updated Name");
  });
});

describe("DELETE /api/collections/{id}", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should delete collection by ID", async () => {
    const mockDelete = vi.fn().mockReturnThis();
    const mockDeleteEq = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      delete: mockDelete,
    });
    mockDelete.mockReturnValue({
      eq: mockDeleteEq,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/collection-123",
      {
        method: "DELETE",
      }
    );

    // TODO: Uncomment when DELETE endpoint is implemented
    // const response = await DELETE(request, { params: { id: "collection-123" } });

    // expect(response.status).toBe(204);
  });
});

describe("POST /api/collections/{id}/conversations", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
  });

  it("should save conversation to collection with tags", async () => {
    const savedConversation = {
      id: "conv-123",
      collection_id: "collection-123",
      session_id: "session-456",
      tags: ["important", "work"],
      notes: "Important work conversation",
      saved_at: new Date().toISOString(),
    };

    const mockInsert = vi.fn().mockReturnThis();
    const mockInsertSelect = vi.fn().mockReturnThis();
    const mockInsertSingle = vi.fn().mockResolvedValue({
      data: savedConversation,
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({
      select: mockInsertSelect,
    });
    mockInsertSelect.mockReturnValue({
      single: mockInsertSingle,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/collection-123/conversations",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: "session-456",
          tags: ["important", "work"],
          notes: "Important work conversation",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // TODO: Uncomment when POST conversations endpoint is implemented
    // const response = await SaveConversation(request, { params: { id: "collection-123" } });
    // const data = await response.json();

    // expect(response.status).toBe(201);
    // expect(data.session_id).toBe("session-456");
    // expect(data.tags).toEqual(["important", "work"]);
  });

  it("should prevent duplicate session in same collection", async () => {
    const mockInsert = vi.fn().mockReturnThis();
    const mockInsertSelect = vi.fn().mockReturnThis();
    const mockInsertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({
      select: mockInsertSelect,
    });
    mockInsertSelect.mockReturnValue({
      single: mockInsertSingle,
    });

    const request = new NextRequest(
      "http://localhost/api/collections/collection-123/conversations",
      {
        method: "POST",
        body: JSON.stringify({
          session_id: "session-456",
          tags: [],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // TODO: Test duplicate prevention error handling
  });
});

