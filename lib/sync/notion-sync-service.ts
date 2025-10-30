import { listAllPages } from "@/lib/notion/list-pages";
import { getNotionClient } from "@/lib/notion/api-client";
import { getSupabase } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/embeddings/openai";
import { chunkText } from "@/lib/notion/chunker";
import { parseBlocks } from "@/lib/notion/parser";
import { extractTextFromBlocks } from "@/lib/notion/text-extractor";
import { saveEmbeddings } from "@/lib/retrieval/vector-store";
import { logger } from "@/lib/utils/logger";
import { SyncJobType } from "@/lib/types/sync";
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NotionBlock as ApiClientNotionBlock } from "@/lib/notion/api-client";
// import { preserveProperties } from "./property-preserver";

type NotionBlock = BlockObjectResponse | PartialBlockObjectResponse;

export interface SyncResult {
  pagesProcessed: number;
  blocksProcessed: number;
  embeddingsCreated: number;
  errors: string[];
}

/**
 * Get the last successful sync time from sync_jobs table
 */
async function getLastSyncTime(): Promise<Date | null> {
  const { data, error } = await getSupabase()
    .from("sync_jobs")
    .select("completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.completed_at) {
    return null;
  }

  return new Date(data.completed_at);
}

/**
 * Synchronize all Notion pages to Supabase (full sync)
 */
export async function syncNotionPages(): Promise<SyncResult> {
  const result: SyncResult = {
    pagesProcessed: 0,
    blocksProcessed: 0,
    embeddingsCreated: 0,
    errors: [],
  };

  let jobId: string | undefined;

  try {
    logger.info("Starting Notion sync");

    // Create sync job
    const { data: job } = await getSupabase()
      .from("sync_jobs")
      .insert({
        job_type: "manual" as SyncJobType,
        status: "running",
      })
      .select()
      .single();

    jobId = job?.id;

    // List all pages
    const pages = await listAllPages();
    result.pagesProcessed = pages.length;

    logger.info("Found pages to sync", { count: pages.length });

    for (const page of pages) {
      try {
        await syncPage(page.id, result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Error syncing page", {
          pageId: page.id,
          error: errorMsg,
        });
        result.errors.push(`Page ${page.id}: ${errorMsg}`);
      }
    }

    // Update sync job as completed
    if (jobId) {
      await getSupabase()
        .from("sync_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          pages_processed: result.pagesProcessed,
          blocks_processed: result.blocksProcessed,
          embeddings_created: result.embeddingsCreated,
        })
        .eq("id", jobId);
    }

    logger.info("Notion sync completed", {
      pagesProcessed: result.pagesProcessed,
      blocksProcessed: result.blocksProcessed,
      embeddingsCreated: result.embeddingsCreated,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    logger.error("Error in Notion sync", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Update sync job as failed
    if (jobId) {
      await getSupabase()
        .from("sync_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("id", jobId);
    }

    throw error;
  }
}

/**
 * Incremental sync: Only sync pages changed since last sync
 */
export async function incrementalSyncNotionPages(): Promise<SyncResult> {
  const result: SyncResult = {
    pagesProcessed: 0,
    blocksProcessed: 0,
    embeddingsCreated: 0,
    errors: [],
  };

  let jobId: string | undefined;

  try {
    logger.info("Starting incremental Notion sync");

    // Get last sync time
    const lastSyncTime = await getLastSyncTime();

    if (!lastSyncTime) {
      logger.info("No previous sync found, performing full sync");
      return await syncNotionPages();
    }

    logger.info("Last sync time", { lastSyncTime: lastSyncTime.toISOString() });

    // Create sync job
    const { data: job } = await getSupabase()
      .from("sync_jobs")
      .insert({
        job_type: "scheduled" as SyncJobType,
        status: "running",
      })
      .select()
      .single();

    jobId = job?.id;

    // List all pages from Notion
    const allPages = await listAllPages();

    // Filter pages changed since last sync
    const changedPages = allPages.filter((page) => {
      if ("last_edited_time" in page && page.last_edited_time) {
        const lastEditedTime = new Date(page.last_edited_time);
        return lastEditedTime > lastSyncTime;
      }
      return false;
    });

    result.pagesProcessed = changedPages.length;

    logger.info("Found pages changed since last sync", {
      total: allPages.length,
      changed: changedPages.length,
      lastSyncTime: lastSyncTime.toISOString(),
    });

    for (const page of changedPages) {
      try {
        await syncPage(page.id, result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Error syncing page", {
          pageId: page.id,
          error: errorMsg,
        });
        result.errors.push(`Page ${page.id}: ${errorMsg}`);
      }
    }

    // Update sync job as completed
    if (jobId) {
      await getSupabase()
        .from("sync_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          pages_processed: result.pagesProcessed,
          blocks_processed: result.blocksProcessed,
          embeddings_created: result.embeddingsCreated,
        })
        .eq("id", jobId);
    }

    logger.info("Incremental sync completed", {
      pagesProcessed: result.pagesProcessed,
      blocksProcessed: result.blocksProcessed,
      embeddingsCreated: result.embeddingsCreated,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    logger.error("Error in incremental sync", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Update sync job as failed
    if (jobId) {
      await getSupabase()
        .from("sync_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("id", jobId);
    }

    throw error;
  }
}

/**
 * Sync a single page
 */
async function syncPage(pageId: string, result: SyncResult) {
  // Fetch page details
  const page = (await getNotionClient().pages.retrieve({ page_id: pageId })) as {
    url?: string;
    last_edited_time?: string;
    last_edited_by?: { id?: string; name?: string } | null;
    properties?: Record<string, unknown>;
    parent?: { page_id?: string };
    workspace_id?: string;
  };
  const title = extractTitle(page);
  const url = page.url || `https://notion.so/${pageId.replace(/-/g, "")}`;

  // Preserve existing properties if page already exists
  // const preservedProperties = await preserveProperties(pageId, page.properties);
  const preservedProperties = page.properties;

  // Save or update page
  await getSupabase()
    .from("notion_pages")
    .upsert({
      page_id: pageId,
      title,
      url,
      last_edited_time: page.last_edited_time,
      last_edited_by:
        page.last_edited_by?.id || page.last_edited_by?.name || null,
      properties: preservedProperties,
      parent_page_id: page.parent?.page_id || null,
      workspace_id: page.workspace_id || null,
      synced_at: new Date().toISOString(),
    });

  // Fetch all blocks for this page
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await getNotionClient().blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });

    blocks.push(...(response.results as NotionBlock[]));
    cursor = response.next_cursor || undefined;
  } while (cursor);

  // Parse blocks - convert to api-client NotionBlock format
  const apiBlocks: ApiClientNotionBlock[] = blocks.map((block) => {
    const baseBlock: ApiClientNotionBlock = {
      ...block,
      id: block.id,
      type: "type" in block ? block.type : "paragraph",
      has_children: "has_children" in block ? block.has_children : false,
    };
    return baseBlock;
  });
  const parsedBlocks = parseBlocks(apiBlocks);
  const extractedTexts = extractTextFromBlocks(parsedBlocks);

  // Chunk text
  const chunks = chunkText(extractedTexts);
  result.blocksProcessed += chunks.length;

  // Generate embeddings
  logger.info("Generating embeddings", { chunkCount: chunks.length });

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.text);

      await saveEmbeddings([
        {
          text: chunk.text,
          block_ids: chunk.block_ids,
          embedding,
          page_id: pageId,
          metadata: {
            title,
            block_type: chunk.block_ids[0],
            ...chunk.metadata,
          },
        },
      ]);

      result.embeddingsCreated++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error creating embedding", { error: errorMsg });
      result.errors.push(`Embedding error: ${errorMsg}`);
    }
  }

  logger.info("Page synced", { pageId, blocksProcessed: parsedBlocks.length });
}

/**
 * Extract title from page
 */
function extractTitle(page: {
  properties?: Record<string, unknown>;
  title?: string;
}): string {
  if (page.properties?.title) {
    const titleProp = page.properties.title as {
      title?: Array<{ plain_text?: string }>;
    };
    if (titleProp.title && Array.isArray(titleProp.title)) {
      return titleProp.title.map((t) => t.plain_text || "").join("");
    }
  }

  // Fallback to page title
  if (page.title) {
    return page.title;
  }

  return "Untitled";
}
