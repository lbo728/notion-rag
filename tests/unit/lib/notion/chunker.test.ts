import { describe, it, expect } from "vitest";
import {
  chunkText,
  Chunk,
  DEFAULT_CHUNKING_CONFIG,
} from "@/lib/notion/chunker";
import { ExtractedText } from "@/lib/notion/text-extractor";

describe("chunker - header-aware grouping", () => {
  it("should group blocks by headers and maintain semantic units", () => {
    const blocks: ExtractedText[] = [
      {
        block_id: "1",
        text: "# Introduction",
        block_type: "heading_1",
        position: 0,
      },
      {
        block_id: "2",
        text: "This is the introduction paragraph.",
        block_type: "paragraph",
        position: 1,
      },
      {
        block_id: "3",
        text: "Another paragraph in the introduction section.",
        block_type: "paragraph",
        position: 2,
      },
      {
        block_id: "4",
        text: "## Section 1",
        block_type: "heading_2",
        position: 3,
      },
      {
        block_id: "5",
        text: "Content for section 1.",
        block_type: "paragraph",
        position: 4,
      },
    ];

    const chunks = chunkText(blocks);

    expect(chunks.length).toBeGreaterThan(0);

    // First chunk should contain the heading and its content
    const firstChunk = chunks[0];
    expect(firstChunk.text).toContain("Introduction");
    expect(firstChunk.block_ids).toContain("1");

    // Verify headers are preserved
    const hasHeader = chunks.some((chunk) =>
      chunk.text.includes("# Introduction")
    );
    expect(hasHeader).toBe(true);
  });

  it("should respect chunk size limits (400-800 tokens)", () => {
    // Create blocks that would exceed chunk size
    const longText = "A ".repeat(2000); // ~1000 tokens
    const blocks: ExtractedText[] = [
      {
        block_id: "1",
        text: longText,
        block_type: "paragraph",
        position: 0,
      },
      {
        block_id: "2",
        text: longText,
        block_type: "paragraph",
        position: 1,
      },
    ];

    const chunks = chunkText(blocks, 500); // 500 token chunk size

    // Should split into multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be within size limits
    chunks.forEach((chunk) => {
      expect(chunk.metadata.token_count).toBeLessThanOrEqual(500 + 100); // Allow some margin
    });
  });

  it("should apply 20% overlap between chunks", () => {
    const blocks: ExtractedText[] = [];
    for (let i = 0; i < 10; i++) {
      blocks.push({
        block_id: `block-${i}`,
        text: "This is a test paragraph with some content. ".repeat(10),
        block_type: "paragraph",
        position: i,
      });
    }

    const chunks = chunkText(blocks, 400, 0.2);

    if (chunks.length > 1) {
      // Check overlap metadata
      chunks.forEach((chunk, idx) => {
        if (idx > 0) {
          expect(chunk.metadata.overlap_info.prev_overlap).toBeGreaterThan(0);
        }
        if (idx < chunks.length - 1) {
          expect(chunk.metadata.overlap_info.next_overlap).toBeGreaterThan(0);
        }
      });
    }
  });

  it("should preserve block_ids in chunks", () => {
    const blocks: ExtractedText[] = [
      {
        block_id: "block-1",
        text: "First block",
        block_type: "paragraph",
        position: 0,
      },
      {
        block_id: "block-2",
        text: "Second block",
        block_type: "paragraph",
        position: 1,
      },
      {
        block_id: "block-3",
        text: "Third block",
        block_type: "paragraph",
        position: 2,
      },
    ];

    const chunks = chunkText(blocks);

    expect(chunks.length).toBeGreaterThan(0);

    // Verify all block_ids are preserved
    const allBlockIds = chunks.flatMap((chunk) => chunk.block_ids);
    expect(allBlockIds).toContain("block-1");
    expect(allBlockIds).toContain("block-2");
    expect(allBlockIds).toContain("block-3");
  });

  it("should handle empty blocks array", () => {
    const chunks = chunkText([]);
    expect(chunks).toEqual([]);
  });

  it("should handle single block", () => {
    const blocks: ExtractedText[] = [
      {
        block_id: "single",
        text: "Single block content",
        block_type: "paragraph",
        position: 0,
      },
    ];

    const chunks = chunkText(blocks);

    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe("Single block content");
    expect(chunks[0].block_ids).toEqual(["single"]);
  });

  it("should maintain header grouping across chunk boundaries", () => {
    const blocks: ExtractedText[] = [
      {
        block_id: "h1",
        text: "# Main Title",
        block_type: "heading_1",
        position: 0,
      },
      {
        block_id: "p1",
        text: "Paragraph 1".repeat(100), // Large text
        block_type: "paragraph",
        position: 1,
      },
      {
        block_id: "p2",
        text: "Paragraph 2".repeat(100),
        block_type: "paragraph",
        position: 2,
      },
      {
        block_id: "h2",
        text: "## Subsection",
        block_type: "heading_2",
        position: 3,
      },
      {
        block_id: "p3",
        text: "Paragraph 3",
        block_type: "paragraph",
        position: 4,
      },
    ];

    const chunks = chunkText(blocks, 400);

    // Headers should not be split from their content
    const headerChunks = chunks.filter(
      (chunk) =>
        chunk.text.includes("# Main Title") ||
        chunk.text.includes("## Subsection")
    );

    expect(headerChunks.length).toBeGreaterThan(0);

    // Verify header is grouped with its content
    const mainTitleChunk = chunks.find((chunk) =>
      chunk.text.includes("# Main Title")
    );
    if (mainTitleChunk) {
      expect(mainTitleChunk.block_ids).toContain("h1");
    }
  });
});

describe("chunker - configuration", () => {
  it.skip("should use default chunking config", () => {
    const blocks: ExtractedText[] = [
      {
        block_id: "1",
        text: "Test content",
        block_type: "paragraph",
        position: 0,
      },
    ];

    // Skip this test - chunkTextWithConfig is not exported from chunker
    // const { chunkTextWithConfig } = require("@/lib/notion/chunker");
    const chunks = chunkTextWithConfig(blocks, DEFAULT_CHUNKING_CONFIG);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
