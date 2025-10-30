import dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

import OpenAI from "openai";
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("❌ Missing OPENAI_API_KEY!");
  process.exit(1);
}

const openaiClient = new OpenAI({ apiKey: openaiApiKey });

// Create Notion client directly
import { Client } from "@notionhq/client";
const notionApiKey = process.env.NOTION_API_KEY;
if (!notionApiKey) {
  console.error("❌ Missing NOTION_API_KEY environment variable!");
  process.exit(1);
}
const notionClient = new Client({ auth: notionApiKey });

import { parseBlocks } from "../lib/notion/parser";
import { extractTextFromBlocks } from "../lib/notion/text-extractor";
import { chunkText } from "../lib/notion/chunker";

/**
 * Find and sync a specific Notion page by title or page ID
 */
async function syncPageByTitle(pageTitleOrId: string) {
  console.log(`🔍 Searching for page: "${pageTitleOrId}"...\n`);

  let targetPage: any;
  let pageId: string;

  // Check if it's a page ID (UUID format)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      pageTitleOrId
    )
  ) {
    // It's a page ID, fetch directly
    try {
      pageId = pageTitleOrId;
      targetPage = await notionClient.pages.retrieve({ page_id: pageId });
      console.log(`✅ Found page by ID: ${pageId}`);
      console.log(`   Title: ${getPageTitle(targetPage)}\n`);
    } catch (error) {
      console.error(`❌ Error fetching page ${pageId}:`, error);
      return;
    }
  } else {
    // Search for pages matching the title
    const searchResults = await notionClient.search({
      query: pageTitleOrId,
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 10,
    });

    if (searchResults.results.length === 0) {
      console.error(`❌ No pages found matching "${pageTitleOrId}"`);
      console.log(`\n💡 Tip: You can also provide a page ID directly`);
      console.log(
        `   Example: pnpm tsx scripts/sync-specific-page.ts <page-id>\n`
      );
      return;
    }

    // Find exact match or use first result
    targetPage = searchResults.results.find((page: any) => {
      if (page.properties?.title?.title) {
        const title = page.properties.title.title
          .map((t: any) => t.plain_text)
          .join("");
        return title === pageTitleOrId;
      }
      return false;
    });

    if (!targetPage) {
      targetPage = searchResults.results[0];
      console.log(`⚠️  Exact match not found, using first result\n`);
    }

    pageId = targetPage.id;
    console.log(`✅ Found page: ${pageId}`);
    console.log(`   Title: ${getPageTitle(targetPage)}\n`);
  }

  // Fetch full page details
  const pageDetails = targetPage;

  // Extract title
  const title = getPageTitle(pageDetails);
  const url =
    (pageDetails as any).url || `https://notion.so/${pageId.replace(/-/g, "")}`;

  console.log(`📄 Syncing page content...`);

  // Fetch all blocks
  const blocks = [];
  let cursor = undefined;

  do {
    const response = await notionClient.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    blocks.push(...response.results);
    cursor = response.next_cursor || undefined;
  } while (cursor);

  console.log(`   Found ${blocks.length} blocks\n`);

  // Save page to database
  const { error: pageError } = await supabase.from("notion_pages").upsert({
    page_id: pageId,
    title: title,
    url: url,
    last_edited_time: pageDetails.last_edited_time,
    last_edited_by: (pageDetails.last_edited_by as any)?.id || null,
    properties: pageDetails.properties,
    synced_at: new Date().toISOString(),
  });

  if (pageError) {
    console.error(`❌ Error saving page:`, pageError);
    return;
  }

  console.log(`✅ Page saved to database\n`);

  // Parse and extract text
  const parsedBlocks = parseBlocks(blocks);
  const extractedTexts = extractTextFromBlocks(blocks);

  // Chunk text
  const chunks = chunkText(extractedTexts);
  console.log(`📦 Created ${chunks.length} chunks\n`);

  // Generate embeddings and save
  console.log(`🔮 Generating embeddings...`);
  let embeddingsCreated = 0;

  for (const chunk of chunks) {
    try {
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.text,
        dimensions: 1536,
      });

      const embedding = response.data[0].embedding;

      // Delete old blocks for this page first
      await supabase.from("notion_blocks").delete().eq("page_id", pageId);

      // Insert new block with embedding
      const { error: blockError } = await supabase
        .from("notion_blocks")
        .insert({
          page_id: pageId,
          block_id: `${pageId}-${chunks.indexOf(chunk)}`,
          block_type: "paragraph",
          content: chunk.text,
          embedding: embedding,
          metadata: {
            title: title,
            block_ids: chunk.block_ids,
            ...chunk.metadata,
          },
        });

      if (blockError) {
        console.error(`❌ Error saving chunk:`, blockError);
      } else {
        embeddingsCreated++;
        console.log(`   ✓ Chunk ${embeddingsCreated}/${chunks.length}`);
      }
    } catch (error) {
      console.error(`❌ Error generating embedding:`, error);
    }
  }

  console.log(`\n✅ Successfully synced "${title}"`);
  console.log(`   Blocks: ${chunks.length}`);
  console.log(`   Embeddings: ${embeddingsCreated}`);
}

function getPageTitle(page: any): string {
  if (page.properties?.title?.title) {
    return page.properties.title.title.map((t: any) => t.plain_text).join("");
  }
  if ((page as any).title) {
    return (page as any).title;
  }
  return "Untitled";
}

// Run sync
const pageTitle = process.argv[2] || "짧은 글쓰기";
syncPageByTitle(pageTitle).catch(console.error);
