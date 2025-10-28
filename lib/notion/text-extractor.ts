import { ParsedBlock } from "./parser";

export interface ExtractedText {
  block_id: string;
  text: string;
  block_type: string;
  position: number;
}

/**
 * Extract and maintain code/quote/list formatting from blocks
 */
export function extractTextFromBlocks(blocks: ParsedBlock[]): ExtractedText[] {
  const extracted: ExtractedText[] = [];
  let position = 0;
  
  for (const block of blocks) {
    if (block.text.trim()) {
      extracted.push({
        block_id: block.id,
        text: block.text,
        block_type: block.type,
        position,
      });
      position++;
    }
  }
  
  return extracted;
}

/**
 * Combine blocks into readable text while preserving structure
 */
export function combineBlocksToText(blocks: ParsedBlock[]): string {
  return blocks
    .map((block) => block.text)
    .filter((text) => text.trim())
    .join("\n\n");
}

/**
 * Extract text with code/quotes/lists preserved
 */
export function extractFormattedText(blocks: ParsedBlock[]): string {
  const sections: string[] = [];
  
  for (const block of blocks) {
    if (!block.text.trim()) continue;
    
    switch (block.type) {
      case "heading_1":
        sections.push(`# ${block.text}`);
        break;
      case "heading_2":
        sections.push(`## ${block.text}`);
        break;
      case "heading_3":
        sections.push(`### ${block.text}`);
        break;
      case "bulleted_list_item":
        sections.push(`- ${block.text}`);
        break;
      case "numbered_list_item":
        sections.push(`1. ${block.text}`);
        break;
      case "quote":
        sections.push(`> ${block.text}`);
        break;
      default:
        sections.push(block.text);
    }
  }
  
  return sections.join("\n\n");
}

