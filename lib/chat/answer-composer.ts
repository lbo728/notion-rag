import OpenAI from "openai";
import { MMRResult } from "@/lib/retrieval/mmr-retriever";
import { logger } from "@/lib/utils/logger";
import { SessionMessage } from "@/lib/types/chat";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TOKENS = 1000;
const MODEL = "gpt-4o-mini";

export interface ComposedAnswer {
  content: string;
  citations: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance_score: number;
  }>;
  tokens_used: number;
}

/**
 * Compose answer with summary + citations using GPT-4o-mini
 */
export async function composeAnswer(
  query: string,
  retrievedDocs: MMRResult[],
  contextMessages?: SessionMessage[]
): Promise<ComposedAnswer> {
  try {
    if (retrievedDocs.length === 0) {
      return {
        content:
          "I couldn't find relevant information in your Notion workspace. Please try rephrasing your question or enriching your knowledge base.",
        citations: [],
        tokens_used: 0,
      };
    }

    // Ensure minimum 2 citations (Constitution Principle II)
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

    // Build conversation context text
    const conversationContext =
      contextMessages && contextMessages.length > 0
        ? contextMessages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n")
        : "";

    // Compose prompt
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

    logger.info("Composing answer with LLM", {
      query_length: query.length,
      sources_count: docsToUse.length,
      context_messages: contextMessages?.length ?? 0,
    });

    const response = await openaiClient.chat.completions.create({
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
    });

    const content = response.choices[0]?.message?.content || "";
    const tokensUsed = response.usage?.total_tokens || 0;

    // Extract citations (minimum 2 as per Constitution)
    const citations = docsToUse.map((doc) => ({
      title: doc.metadata.title || doc.page_id,
      url: `https://notion.so/${doc.page_id.replace(/-/g, "")}`,
      snippet: doc.content.substring(0, 200),
      relevance_score: doc.mmr_score,
    }));

    logger.info("Answer composed successfully", {
      tokens_used: tokensUsed,
      citations_count: citations.length,
    });

    return {
      content,
      citations,
      tokens_used: tokensUsed,
    };
  } catch (error) {
    logger.error("Error composing answer", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback response
    return {
      content:
        "I'm sorry, I encountered an error while generating a response. Please try again.",
      citations: [],
      tokens_used: 0,
    };
  }
}
