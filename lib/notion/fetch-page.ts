import { notionClient } from "./api-client";
import { logger } from "@/lib/utils/logger";

export interface PageProperties {
  tags?: string[];
  status?: string;
  editor?: string;
  lastEditedTime?: string;
  lastEditedBy?: string;
  [key: string]: any;
}

/**
 * Fetch a Notion page with property preservation
 */
export async function fetchPageWithProperties(pageId: string) {
  try {
    logger.info("Fetching Notion page with properties", { pageId });
    
    const page = await notionClient.pages.retrieve({
      page_id: pageId,
    });
    
    // Extract properties
    const properties: PageProperties = {
      lastEditedTime: page.last_edited_time,
      lastEditedBy: page.last_edited_by?.id || page.last_edited_by?.name || undefined,
      tags: extractTags(page.properties),
      status: extractStatus(page.properties),
      editor: page.last_edited_by?.name || page.created_by?.name || undefined,
    };
    
    logger.info("Page fetched successfully", {
      pageId,
      title: (page as any).properties?.title || "Untitled",
    });
    
    return {
      ...page,
      extractedProperties: properties,
    };
  } catch (error) {
    logger.error("Error fetching page with properties", {
      pageId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Extract tags from page properties
 */
function extractTags(properties: any): string[] {
  const tags: string[] = [];
  
  if (properties) {
    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      if (prop.type === "multi_select") {
        tags.push(...prop.multi_select.map((item: any) => item.name));
      }
    });
  }
  
  return tags;
}

/**
 * Extract status from page properties
 */
function extractStatus(properties: any): string | undefined {
  if (!properties) return undefined;
  
  for (const [key, prop]: [string, any] of Object.entries(properties)) {
    if (prop.type === "select" && prop.select) {
      return prop.select.name;
    }
    if (prop.type === "status" && prop.status) {
      return prop.status.name;
    }
  }
  
  return undefined;
}

