import { NotionBlock } from "./api-client";

export interface ParsedBlock {
  id: string;
  type: string;
  text: string;
  metadata: {
    original_type: string;
    has_children: boolean;
    [key: string]: unknown;
  };
}

/**
 * Parse a Notion block to extract text content
 */
export function parseBlock(block: NotionBlock): ParsedBlock | null {
  const { id, type, has_children } = block;

  if (!block[type]) {
    return null;
  }

  const content = block[type] as
    | { rich_text?: Array<{ plain_text?: string }>; language?: string }
    | undefined;
  let text = "";

  // Extract text based on block type
  switch (type) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "quote":
      text = extractRichText(content?.rich_text);
      break;

    case "bulleted_list_item":
    case "numbered_list_item":
    case "to_do":
      text = extractRichText(content?.rich_text);
      break;

    case "code":
      text = extractRichText(content?.rich_text);
      text = `\`\`\`${content?.language || ""}\n${text}\n\`\`\``;
      break;

    case "callout":
      text = extractRichText(content?.rich_text);
      break;

    default:
      text = "";
  }

  return {
    id,
    type,
    text,
    metadata: {
      original_type: type,
      has_children,
      ...(content ?? {}),
    },
  };
}

/**
 * Extract plain text from Notion rich_text array
 */
function extractRichText(
  richText: Array<{ plain_text?: string }> | undefined
): string {
  if (!richText || !Array.isArray(richText)) {
    return "";
  }

  return richText.map((item) => item.plain_text || "").join("");
}

/**
 * Parse multiple blocks and maintain hierarchy
 */
export function parseBlocks(blocks: NotionBlock[]): ParsedBlock[] {
  const parsed: ParsedBlock[] = [];

  for (const block of blocks) {
    const parsedBlock = parseBlock(block);
    if (parsedBlock && parsedBlock.text.trim()) {
      parsed.push(parsedBlock);
    }
  }

  return parsed;
}
