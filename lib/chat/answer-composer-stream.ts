import OpenAI from "openai";
import { MMRResult } from "@/lib/retrieval/mmr-retriever";
import { logger } from "@/lib/utils/logger";
import { SessionMessage } from "@/lib/types/chat";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TOKENS = 1000;
const MODEL = "gpt-4o-mini";

export interface StreamingResponse {
  stream: ReadableStream;
  citations: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance_score: number;
  }>;
}

/**
 * Compose streaming answer with citations
 */
export async function composeAnswerStream(
  query: string,
  retrievedDocs: MMRResult[],
  contextMessages?: SessionMessage[]
): Promise<StreamingResponse> {
  if (retrievedDocs.length === 0) {
    // Return empty stream with error message
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const message =
          "I couldn't find relevant information in your Notion workspace. Please try rephrasing your question or enriching your knowledge base.";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: message, done: true })}\n\n`
          )
        );
        controller.close();
      },
    });

    return {
      stream,
      citations: [],
    };
  }

  // Ensure minimum 2 citations
  const docsToUse = retrievedDocs.length >= 2 ? retrievedDocs : retrievedDocs;

  // Format context from retrieved documents
  const retrievalContext = docsToUse
    .map((doc, idx) => {
      const dateInfo = doc.page_last_edited_time
        ? `\nLast edited: ${new Date(doc.page_last_edited_time).toLocaleDateString("ko-KR")}`
        : doc.page_created_time
          ? `\nCreated: ${new Date(doc.page_created_time).toLocaleDateString("ko-KR")}`
          : "";
      return `[Source ${idx + 1}]\n${doc.content}\n---\nPage ID: ${doc.page_id}\nBlock ID: ${doc.block_id}${dateInfo}`;
    })
    .join("\n\n");

  // Compose prompt with conversation context
  const conversationContext =
    contextMessages && contextMessages.length > 0
      ? contextMessages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")
      : "";

  const prompt = `You are a helpful assistant that answers questions based on a personal knowledge archive from Notion.

QUESTION: ${query}

CONVERSATION CONTEXT (last ${contextMessages?.length ?? 0} messages):
${conversationContext}

RELEVANT CONTENT:
${retrievalContext}

INSTRUCTIONS:
1. Provide a concise, helpful answer based on the relevant content above
2. Use the "summary + quote" format: Give a brief summary, then include direct quotes from the sources
3. Keep the answer concise and focused on the question
4. If information is missing, say so rather than inventing facts
5. Use the conversation context to maintain continuity if relevant
6. If the question asks for "most recent" or "latest" content, prioritize sources with the most recent dates

ANSWER:`;

  logger.info("Composing streaming answer with LLM", {
    query_length: query.length,
    sources_count: docsToUse.length,
    context_messages: contextMessages?.length ?? 0,
  });

  // Create OpenAI streaming response
  const completion = await openaiClient.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that answers questions based on a personal knowledge archive. Always cite sources with clear references.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
    stream: true,
  });

  // Extract citations (minimum 2 as per Constitution)
  const citations = docsToUse.map((doc) => {
    const metaTitleUnknown = (
      doc as unknown as { metadata?: { title?: unknown } }
    ).metadata?.title;
    const safeTitle =
      typeof metaTitleUnknown === "string" ? metaTitleUnknown : doc.page_id;
    return {
      title: safeTitle,
      url: `https://notion.so/${doc.page_id.replace(/-/g, "")}`,
      snippet: doc.content.substring(0, 200),
      relevance_score: doc.mmr_score,
    };
  });

  // Convert OpenAI stream to ReadableStream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content, done: false })}\n\n`
              )
            );
          }
        }

        // Send citations at the end
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ citations, done: true })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        logger.error("Error in streaming", {
          error: error instanceof Error ? error.message : String(error),
        });
        controller.error(error);
      }
    },
  });

  return {
    stream,
    citations,
  };
}
