import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getSupabase } from "@/lib/supabase/client";
import {
  getNotionClient,
  NotionBlock as ApiClientNotionBlock,
} from "@/lib/notion/api-client";
import { generateEmbedding } from "@/lib/embeddings/openai";
import { parseBlocks } from "@/lib/notion/parser";
import { extractTextFromBlocks } from "@/lib/notion/text-extractor";
import { chunkText } from "@/lib/notion/chunker";
import { saveEmbeddings } from "@/lib/retrieval/vector-store";
import crypto from "crypto";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

type NotionBlock = BlockObjectResponse | PartialBlockObjectResponse;

interface NotionWebhookEvent {
  object: "page" | "database";
  type: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}

interface NotionProperty {
  type?: string;
  title?: unknown;
  [key: string]: unknown;
}

/**
 * POST /api/webhooks/notion
 *
 * Notion Webhook endpoint for real-time sync
 *
 * Setup:
 * 1. Go to Notion Integration Settings
 * 2. Create Webhook Subscription
 * 3. Set URL to: https://your-domain.com/api/webhooks/notion
 * 4. Select events: Page changes, Database updates
 * 5. Copy webhook secret and add to .env.local as NOTION_WEBHOOK_SECRET
 *
 * Security: Verify webhook signature using NOTION_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("notion-signature");

    // Verify webhook signature (if secret is configured)
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyNotionSignature(body, signature, webhookSecret);
      if (!isValid) {
        logger.warn("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body) as NotionWebhookEvent;

    logger.info("Notion webhook received", {
      event_type: event.type,
      object_type: event.object,
    });

    // Handle different event types
    if (event.object === "page") {
      await handlePageEvent(event);
    } else if (event.object === "database") {
      await handleDatabaseEvent(event);
    }

    // Return 200 OK immediately (process in background)
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Notion webhook", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return 200 to prevent Notion from retrying
    return NextResponse.json(
      { error: "Processing failed, but acknowledged" },
      { status: 200 }
    );
  }
}

// TEMP: Allow GET during Notion verification to surface the token in logs.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const headers = Object.fromEntries(request.headers.entries());
    const body = await request.text().catch(() => "");

    logger.info("Notion webhook GET verification hit", {
      query,
      headers,
      body_preview: body?.slice(0, 500) || "",
    });

    // Reply 200 so Notion doesn't treat this as failure
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error in Notion webhook GET", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

/**
 * Verify Notion webhook signature
 */
function verifyNotionSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Handle page events (created, updated, deleted)
 */
async function handlePageEvent(event: NotionWebhookEvent) {
  const { type, data } = event;

  logger.info("Processing page event", {
    type,
    page_id: data.id,
  });

  try {
    switch (type) {
      case "page.created":
      case "page.updated":
        // Sync the page
        await syncPageFromWebhook(data.id);
        break;

      case "page.deleted":
        // Remove from database
        await deletePageFromDatabase(data.id);
        break;

      default:
        logger.info("Unhandled page event type", { type });
    }
  } catch (error) {
    logger.error("Error handling page event", {
      type,
      page_id: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - we want to acknowledge the webhook
  }
}

/**
 * Handle database events
 */
async function handleDatabaseEvent(event: NotionWebhookEvent) {
  const { type, data } = event;

  logger.info("Processing database event", {
    type,
    database_id: data.id,
  });

  // If database structure changed, we might want to re-sync all pages
  // For now, just log it
  if (type === "database.updated") {
    logger.info("Database updated, consider full sync if needed", {
      database_id: data.id,
    });
  }
}

/**
 * Sync a specific page from webhook event
 */
async function syncPageFromWebhook(pageId: string) {
  try {
    logger.info("Syncing page from webhook", { pageId });

    // Fetch page
    const page = (await getNotionClient().pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;
    const title = extractTitle(page);
    const url = page.url || `https://notion.so/${pageId.replace(/-/g, "")}`;

    // Save/update page
    await getSupabase()
      .from("notion_pages")
      .upsert({
        page_id: pageId,
        title,
        url,
        last_edited_time: page.last_edited_time,
        last_edited_by: page.last_edited_by?.id || null,
        properties: page.properties,
        synced_at: new Date().toISOString(),
      });

    // Fetch and process blocks
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

    // Parse and chunk - convert to api-client NotionBlock format
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
    const chunks = chunkText(extractedTexts);

    // Delete old blocks for this page
    await getSupabase().from("notion_blocks").delete().eq("page_id", pageId);

    // Generate embeddings and save
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
      } catch (error) {
        logger.error("Error generating embedding from webhook", {
          pageId,
          chunkIndex: chunks.indexOf(chunk),
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other chunks even if one fails
      }
    }

    logger.info("Page synced from webhook", {
      pageId,
      chunks: chunks.length,
    });
  } catch (error) {
    logger.error("Error syncing page from webhook", {
      pageId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Delete page from database
 */
async function deletePageFromDatabase(pageId: string) {
  await getSupabase().from("notion_blocks").delete().eq("page_id", pageId);
  await getSupabase().from("notion_pages").delete().eq("page_id", pageId);

  logger.info("Page deleted from database", { pageId });
}

/**
 * Extract title from page
 */
function extractTitle(page: PageObjectResponse): string {
  if (page.properties) {
    for (const [, prop] of Object.entries(page.properties)) {
      const propTyped = prop as NotionProperty;
      if (propTyped.type === "title" && propTyped.title) {
        if (Array.isArray(propTyped.title)) {
          return propTyped.title
            .map((t: unknown) =>
              typeof t === "object" && t !== null && "plain_text" in t
                ? String(t.plain_text)
                : ""
            )
            .join("");
        }
        return String(propTyped.title);
      }
    }
  }
  return "Untitled";
}
