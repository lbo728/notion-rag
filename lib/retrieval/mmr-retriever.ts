import { vectorSearch, VectorSearchResult } from "./vector-store";
import { generateEmbedding } from "@/lib/embeddings/openai";
import { logger } from "@/lib/utils/logger";

export interface MMRResult extends VectorSearchResult {
  mmr_score: number;
}

/**
 * Maximum Marginal Relevance (MMR) retrieval
 * k: number of final results to return
 * fetchK: number of candidates to fetch before applying diversity penalty
 */
export async function mmrRetrieve(
  query: string,
  k: number = 8,
  fetchK: number = 32,
  lambda: number = 0.5
): Promise<MMRResult[]> {
  try {
    logger.info("Starting MMR retrieval", { query, k, fetchK });

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Fetch candidates
    let candidates = await vectorSearch(queryEmbedding, fetchK);

    if (candidates.length === 0) {
      logger.warn("No candidates found for query");
      return [];
    }

    // Check if query asks for "most recent" or "latest" - if so, sort by date first
    const recentKeywords = [
      "가장 최근",
      "최근",
      "최신",
      "latest",
      "most recent",
      "newest",
    ];
    const isRecentQuery = recentKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );

    if (
      isRecentQuery &&
      candidates.some((c) => c.page_last_edited_time || c.page_created_time)
    ) {
      logger.info("Reordering by date for 'most recent' query");
      // Sort by last_edited_time or created_time (descending)
      candidates = candidates.sort((a, b) => {
        const dateA = a.page_last_edited_time || a.page_created_time || "";
        const dateB = b.page_last_edited_time || b.page_created_time || "";
        return dateB.localeCompare(dateA); // Descending (newest first)
      });
    }

    // Apply MMR algorithm
    const results = applyMMR(candidates, k, lambda);

    logger.info("MMR retrieval completed", {
      candidate_count: candidates.length,
      result_count: results.length,
      is_recent_query: isRecentQuery,
    });

    return results;
  } catch (error) {
    logger.error("Error in MMR retrieval", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Apply MMR diversity penalty to select diverse results
 */
function applyMMR(
  candidates: VectorSearchResult[],
  k: number,
  lambda: number
): MMRResult[] {
  const selected: MMRResult[] = [];
  const remaining = [...candidates];

  if (remaining.length === 0) return selected;

  // Select first item (highest relevance)
  const first = remaining.splice(0, 1)[0];
  selected.push({
    ...first,
    mmr_score: first.similarity,
  });

  // Select remaining items with MMR scoring
  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Calculate relevance
      const relevance = candidate.similarity;

      // Calculate max similarity to already selected items
      let maxSimilarity = 0;
      for (const selectedItem of selected) {
        const similarity = cosineSimilarity(
          candidate.content,
          selectedItem.content
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // MMR score: lambda * relevance - (1 - lambda) * maxSimilarity
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    const selectedItem = remaining.splice(bestIdx, 1)[0];
    selected.push({
      ...selectedItem,
      mmr_score: bestScore,
    });
  }

  return selected;
}

/**
 * Simple cosine similarity approximation based on content overlap
 */
function cosineSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
