import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { mmrRetrieve } from "@/lib/retrieval/mmr-retriever";
import { composeAnswer } from "@/lib/chat/answer-composer";
import { composeAnswerStream } from "@/lib/chat/answer-composer-stream";

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
    let body;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("multipart/form-data")) {
      // Parse form data
      const formData = await request.formData();
      const queryParam = formData.get("query");
      body = { query: queryParam };
    } else {
      // Try to parse as URL encoded form data
      const formData = await request.formData();
      const queryParam = formData.get("query");
      body = { query: queryParam };
    }

    const { query, stream: useStream } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    logger.info("Chat request received", {
      query_length: query.length,
      streaming: !!useStream,
    });

    // Retrieve relevant documents using MMR (k=8, fetchK=32)
    const retrievedDocs = await mmrRetrieve(query, 8, 32);

    logger.info("Retrieved documents", { count: retrievedDocs.length });

    // Handle streaming response
    if (useStream) {
      const { stream, citations } = await composeAnswerStream(
        query,
        retrievedDocs
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response (existing behavior)
    const answer = await composeAnswer(query, retrievedDocs);

    logger.info("Answer composed", {
      citations_count: answer.citations.length,
      tokens_used: answer.tokens_used,
    });

    return NextResponse.json({
      content: answer.content,
      citations: answer.citations,
      metadata: {
        tokens_used: answer.tokens_used,
        sources_count: retrievedDocs.length,
      },
    });
  } catch (error) {
    logger.error("Error in chat endpoint", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
