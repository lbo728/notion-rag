import dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@notionhq/client";

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

const notionApiKey = process.env.NOTION_API_KEY;
if (!notionApiKey) {
  console.error("❌ Missing NOTION_API_KEY!");
  process.exit(1);
}

const notionClient = new Client({ auth: notionApiKey });

import { parseBlocks } from "../lib/notion/parser";
import { extractTextFromBlocks } from "../lib/notion/text-extractor";
import { chunkText } from "../lib/notion/chunker";

/**
 * Find and sync the latest page from "짧은 글쓰기" database
 */
async function syncLatestFromDatabase() {
  console.log("🔍 Searching for '짧은 글쓰기' database...\n");

  // Search for database
  const searchResults = await notionClient.search({
    query: "짧은 글쓰기",
    filter: {
      property: "object",
      value: "database",
    },
    page_size: 10,
  });

  let databaseId: string | undefined;

  for (const db of searchResults.results) {
    const title = getDatabaseTitle(db);
    console.log(`📊 Found database: ${title}`);
    console.log(`   ID: ${db.id}\n`);

    if (title.includes("짧은 글쓰기") || title.includes("짧은")) {
      databaseId = db.id;
      break;
    }
  }

  if (!databaseId && searchResults.results.length > 0) {
    databaseId = searchResults.results[0].id;
    console.log(`⚠️  Using first database found\n`);
  }

  if (!databaseId) {
    console.error("❌ Could not find '짧은 글쓰기' database");
    return;
  }

  console.log(`✅ Using database: ${databaseId}\n`);
  console.log("📄 Querying for latest page...\n");

  // Query database for latest page (sorted by last edited time)
  const queryResponse = await notionClient.databases.query({
    database_id: databaseId,
    sorts: [
      {
        property: "업데이트 일시",
        direction: "descending",
      },
    ],
    page_size: 1,
  });

  if (queryResponse.results.length === 0) {
    console.error("❌ No pages found in database");
    return;
  }

  const latestPage = queryResponse.results[0] as any;
  const pageId = latestPage.id;
  const pageTitle = getPageTitle(latestPage);

  console.log(`✅ Found latest page:`);
  console.log(`   Title: ${pageTitle}`);
  console.log(`   ID: ${pageId}`);
  console.log(`   Last edited: ${latestPage.last_edited_time}\n`);

  // Now sync this page
  console.log(`📦 Syncing page content...`);

  // Fetch all blocks
  const blocks = [];
  let cursor: string | undefined;

  do {
    const response = await notionClient.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    blocks.push(...response.results);
    cursor = response.next_cursor || undefined;
  } while (cursor);

  console.log(`   Found ${blocks.length} blocks\n`);

  // Extract title
  const title = pageTitle;
  const url = latestPage.url || `https://notion.so/${pageId.replace(/-/g, "")}`;

  // Delete existing page and blocks first
  await supabase.from("notion_blocks").delete().eq("page_id", pageId);
  await supabase.from("notion_pages").delete().eq("page_id", pageId);

  // Save page to database
  const { error: pageError } = await supabase.from("notion_pages").insert({
    page_id: pageId,
    title: title,
    url: url,
    last_edited_time: latestPage.last_edited_time,
    last_edited_by: (latestPage.last_edited_by as any)?.id || null,
    properties: latestPage.properties,
    synced_at: new Date().toISOString(),
  });

  if (pageError) {
    console.error(`❌ Error saving page:`, pageError);
    return;
  }

  console.log(`✅ Page saved to database\n`);

  // Parse and extract text
  const parsedBlocks = parseBlocks(blocks);
  const extractedTexts = extractTextFromBlocks(parsedBlocks);

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
  console.log(`\n🎉 Ready to test!`);
  console.log(
    `   Try asking: "짧은 글쓰기 페이지의 가장 최근 글 1개의 제목은?"\n`
  );
}

function getPageTitle(page: any): string {
  if (page.properties) {
    // Look for title property
    for (const [key, prop] of Object.entries(page.properties)) {
      const propAny = prop as any;
      if (propAny.type === "title" && propAny.title) {
        if (Array.isArray(propAny.title)) {
          return propAny.title.map((t: any) => t.plain_text || "").join("");
        }
        return String(propAny.title);
      }
    }
  }
  return "Untitled";
}

function getDatabaseTitle(db: any): string {
  if (db.title && Array.isArray(db.title)) {
    return db.title.map((t: any) => t.plain_text || "").join("");
  }
  if (db.title) {
    return String(db.title);
  }
  return "Untitled Database";
}

syncLatestFromDatabase().catch(console.error);
