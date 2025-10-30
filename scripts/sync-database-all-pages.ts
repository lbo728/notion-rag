import dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

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
 * Sync ALL pages from "짧은 글쓰기" database
 */
async function syncAllPagesFromDatabase() {
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
    if ("object" in db && db.object === "database") {
      const database = db as
        | DatabaseObjectResponse
        | PartialDatabaseObjectResponse;
      const title = getDatabaseTitle(database);
      console.log(`📊 Found database: ${title}`);
      console.log(`   ID: ${database.id}\n`);

      if (title.includes("짧은 글쓰기") || title.includes("짧은")) {
        databaseId = database.id;
        break;
      }
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
  console.log("📄 Querying ALL pages from database...\n");

  // Query ALL pages from database (sorted by creation date descending)
  const allPages: (PageObjectResponse | PartialPageObjectResponse)[] = [];
  let cursor: string | undefined;

  do {
    const queryResponse = await notionClient.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: "생성 일시",
          direction: "descending",
        },
      ],
      start_cursor: cursor,
      page_size: 100,
    });

    allPages.push(...(queryResponse.results as PageObjectResponse[]));
    cursor = queryResponse.next_cursor || undefined;
  } while (cursor);

  console.log(`✅ Found ${allPages.length} pages in database\n`);
  console.log("📦 Starting sync process...\n");

  let syncedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i] as PageObjectResponse;
    const pageId = page.id;
    const pageTitle = getPageTitle(page);

    console.log(`[${i + 1}/${allPages.length}] Syncing: ${pageTitle}`);
    console.log(`   ID: ${pageId}`);

    try {
      // Fetch all blocks
      const blocks: (BlockObjectResponse | PartialBlockObjectResponse)[] = [];
      let blockCursor: string | undefined;

      do {
        const response = await notionClient.blocks.children.list({
          block_id: pageId,
          start_cursor: blockCursor,
        });
        blocks.push(...response.results);
        blockCursor = response.next_cursor || undefined;
      } while (blockCursor);

      const title = pageTitle;
      const url =
        (page as PageObjectResponse & { url?: string }).url ||
        `https://notion.so/${pageId.replace(/-/g, "")}`;

      // Delete existing page and blocks first
      await supabase.from("notion_blocks").delete().eq("page_id", pageId);
      await supabase.from("notion_pages").delete().eq("page_id", pageId);

      // Save page to database
      const { error: pageError } = await supabase.from("notion_pages").insert({
        page_id: pageId,
        title: title,
        url: url,
        last_edited_time: page.last_edited_time,
        last_edited_by:
          page.last_edited_by && "id" in page.last_edited_by
            ? (page.last_edited_by as { id: string }).id
            : null,
        properties: page.properties as unknown as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      });

      if (pageError) {
        console.error(`   ❌ Error saving page:`, pageError.message);
        errorCount++;
        continue;
      }

      // Parse and extract text
      const parsedBlocks = parseBlocks(blocks);
      const extractedTexts = extractTextFromBlocks(parsedBlocks);

      // Chunk text
      const chunks = chunkText(extractedTexts);

      // Generate embeddings and save
      let embeddingsCreated = 0;

      for (const chunk of chunks) {
        try {
          const response = await openaiClient.embeddings.create({
            model: "text-embedding-3-small",
            input: chunk.text,
            dimensions: 1536,
          });

          const embedding = response.data[0].embedding;

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
            console.error(`   ❌ Error saving chunk:`, blockError.message);
          } else {
            embeddingsCreated++;
          }
        } catch (error) {
          console.error(`   ❌ Error generating embedding:`, error);
        }
      }

      console.log(
        `   ✅ Synced (${chunks.length} chunks, ${embeddingsCreated} embeddings)\n`
      );
      syncedCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing page:`, error);
      errorCount++;
      console.log();
    }
  }

  console.log("\n🎉 Sync completed!");
  console.log(`   ✅ Successfully synced: ${syncedCount} pages`);
  console.log(`   ❌ Errors: ${errorCount} pages`);
  console.log(`\nTotal pages in vector DB: ${syncedCount}`);
}

function getPageTitle(
  page: PageObjectResponse | PartialPageObjectResponse
): string {
  const properties = (page as PageObjectResponse).properties as Record<
    string,
    { type: string; title?: Array<{ plain_text?: string }> }
  >;
  if (!properties) return "Untitled";
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && Array.isArray(prop.title)) {
      return prop.title.map((t) => t?.plain_text || "").join("");
    }
  }
  return "Untitled";
}

function getDatabaseTitle(
  db: DatabaseObjectResponse | PartialDatabaseObjectResponse
): string {
  const title = (db as DatabaseObjectResponse).title as
    | Array<{
        plain_text?: string;
      }>
    | undefined;
  if (Array.isArray(title)) {
    return title.map((t) => t?.plain_text || "").join("");
  }
  return "Untitled Database";
}

syncAllPagesFromDatabase().catch(console.error);
