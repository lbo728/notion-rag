import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { mmrRetrieve } from "@/lib/retrieval/mmr-retriever";
import { composeAnswer } from "@/lib/chat/answer-composer";
import { composeAnswerStream } from "@/lib/chat/answer-composer-stream";
import { getOrCreateSession, saveMessage } from "@/lib/chat/session-store";
import { getSessionMessages } from "@/lib/chat/context-manager";

/**
 * POST /api/chat
 *
 * Chat endpoint that:
 * 1. Retrieves relevant documents using MMR
 * 2. Generates answer with citations using GPT-4o-mini
 * 3. Returns formatted response (streaming or non-streaming)
 */
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and form-data
    let body: { query?: string; stream?: boolean; session_id?: string };
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("multipart/form-data")) {
      // Parse form data
      const formData = await request.formData();
      const queryParam = formData.get("query");
      const sessionIdParam = formData.get("session_id");
      body = {
        query: typeof queryParam === "string" ? queryParam : undefined,
        session_id:
          typeof sessionIdParam === "string" ? sessionIdParam : undefined,
      };
    } else {
      // Try to parse as URL encoded form data
      const formData = await request.formData();
      const queryParam = formData.get("query");
      const sessionIdParam = formData.get("session_id");
      body = {
        query: typeof queryParam === "string" ? queryParam : undefined,
        session_id:
          typeof sessionIdParam === "string" ? sessionIdParam : undefined,
      };
    }

    const { query, stream: useStream, session_id } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Create or reuse session
    const sessionId = await getOrCreateSession(session_id);

    logger.info("Chat request received", {
      query_length: query.length,
      streaming: !!useStream,
      session_id: sessionId,
    });

    // Persist user message
    await saveMessage({ session_id: sessionId, role: "user", content: query });

    // Load last 10 messages as context
    const contextMessages = await getSessionMessages(sessionId, 10);

    // Retrieve relevant documents using MMR (k=8, fetchK=32)
    let retrievedDocs;
    try {
      retrievedDocs = await mmrRetrieve(query, 8, 32);
      logger.info("Retrieved documents", { count: retrievedDocs.length });
    } catch (retrieveError) {
      logger.error("MMR retrieval failed", {
        error:
          retrieveError instanceof Error
            ? retrieveError.message
            : String(retrieveError),
        stack: retrieveError instanceof Error ? retrieveError.stack : undefined,
      });
      throw retrieveError;
    }

    // Handle streaming response
    if (useStream) {
      const { stream } = await composeAnswerStream(
        query,
        retrievedDocs,
        contextMessages
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response (existing behavior + context)
    const answer = await composeAnswer(query, retrievedDocs, contextMessages);

    logger.info("Answer composed", {
      citations_count: answer.citations.length,
      tokens_used: answer.tokens_used,
    });

    // Persist assistant message
    await saveMessage({
      session_id: sessionId,
      role: "assistant",
      content: answer.content,
    });

    return NextResponse.json({
      content: answer.content,
      citations: answer.citations,
      metadata: {
        tokens_used: answer.tokens_used,
        sources_count: retrievedDocs.length,
        session_id: sessionId,
      },
    });
  } catch (error) {
    logger.error("Error in chat endpoint", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error,
    });

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : String(error),
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
