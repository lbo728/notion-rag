import OpenAI from "openai";
import { logger } from "@/lib/utils/logger";

const getOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Set it in the environment to generate embeddings."
    );
  }
  return new OpenAI({ apiKey });
};

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 512;

/**
 * Generate embeddings with retry/backoff logic
 */
export async function generateEmbeddings(
  texts: string[],
  retries: number = 3
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    let attempt = 0;
    while (attempt < retries) {
      try {
        logger.info("Generating embeddings", {
          batch: i / BATCH_SIZE + 1,
          total: Math.ceil(texts.length / BATCH_SIZE),
          size: batch.length,
        });

        const response = await getOpenAIClient().embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
          dimensions: EMBEDDING_DIMENSIONS,
        });

        const batchEmbeddings = response.data.map((item) => item.embedding);
        embeddings.push(...batchEmbeddings);

        logger.info("Embeddings generated", {
          batch: i / BATCH_SIZE + 1,
          count: batchEmbeddings.length,
        });

        break; // Success, exit retry loop
      } catch (error) {
        attempt++;

        if (attempt >= retries) {
          logger.error("Failed to generate embeddings after retries", {
            batch: i / BATCH_SIZE + 1,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          `Retrying embeddings generation (attempt ${attempt}/${retries})`,
          {
            delay: `${delay}ms`,
          }
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}

/**
 * Get embedding model information
 */
export function getEmbeddingModelInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    batch_size: BATCH_SIZE,
  };
}
