import { ExtractedText } from "./text-extractor";

export interface Chunk {
  text: string;
  block_ids: string[];
  metadata: {
    position: number;
    token_count: number;
    overlap_info: {
      prev_overlap: number;
      next_overlap: number;
    };
  };
}

/**
 * Header-aware chunking with variable length (400-800 tokens) and 20% overlap
 */
export function chunkText(
  blocks: ExtractedText[],
  chunkSize: number = 500,
  overlapPercent: number = 0.2
): Chunk[] {
  const chunks: Chunk[] = [];
  const overlapSize = Math.floor(chunkSize * overlapPercent);
  
  let currentChunk: string[] = [];
  let currentBlockIds: string[] = [];
  let currentTokenCount = 0;
  let currentStart = 0;
  
  // Group blocks by headers (heading_1, heading_2, heading_3)
  const groupedBlocks = groupBlocksByHeaders(blocks);
  
  for (let i = 0; i < groupedBlocks.length; i++) {
    const block = groupedBlocks[i];
    const blockTokens = estimateTokens(block.text);
    
    // If adding this block would exceed max size, start a new chunk
    if (currentTokenCount + blockTokens > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join("\n\n");
      chunks.push({
        text: chunkText,
        block_ids: currentBlockIds,
        metadata: {
          position: chunks.length,
          token_count: currentTokenCount,
          overlap_info: {
            prev_overlap: currentStart > 0 ? overlapSize : 0,
            next_overlap: overlapSize,
          },
        },
      });
      
      // Start new chunk with overlap
      if (overlapSize > 0 && currentChunk.length > 1) {
        const overlapStart = Math.max(0, currentChunk.length - Math.floor(currentChunk.length * overlapPercent));
        currentChunk = currentChunk.slice(overlapStart);
        currentBlockIds = currentBlockIds.slice(overlapStart);
        currentTokenCount = estimateTokens(currentChunk.join("\n\n"));
      } else {
        currentChunk = [];
        currentBlockIds = [];
        currentTokenCount = 0;
      }
      currentStart = chunks.length;
    }
    
    currentChunk.push(block.text);
    currentBlockIds.push(block.block_id);
    currentTokenCount += blockTokens;
  }
  
  // Add remaining blocks as final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join("\n\n");
    chunks.push({
      text: chunkText,
      block_ids: currentBlockIds,
      metadata: {
        position: chunks.length,
        token_count: currentTokenCount,
        overlap_info: {
          prev_overlap: currentStart > 0 ? overlapSize : 0,
          next_overlap: 0,
        },
      },
    });
  }
  
  return chunks;
}

/**
 * Group blocks by headers to maintain semantic units
 */
function groupBlocksByHeaders(blocks: ExtractedText[]): ExtractedText[] {
  const grouped: ExtractedText[] = [];
  let currentGroup: ExtractedText[] = [];
  
  for (const block of blocks) {
    // Check if this is a header
    if (block.block_type.startsWith("heading_")) {
      // If we have a current group, add it first
      if (currentGroup.length > 0) {
        grouped.push(...currentGroup);
        currentGroup = [];
      }
      // Add header as its own block
      grouped.push(block);
    } else {
      currentGroup.push(block);
    }
  }
  
  // Add remaining group
  if (currentGroup.length > 0) {
    grouped.push(...currentGroup);
  }
  
  return grouped;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Configure chunking parameters
 */
export interface ChunkingConfig {
  minTokens: number;
  maxTokens: number;
  overlapPercent: number;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  minTokens: 400,
  maxTokens: 800,
  overlapPercent: 0.2,
};

export function chunkTextWithConfig(
  blocks: ExtractedText[],
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Chunk[] {
  return chunkText(blocks, config.maxTokens, config.overlapPercent);
}

