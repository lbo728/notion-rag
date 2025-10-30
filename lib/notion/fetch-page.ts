import { getNotionClient } from "./api-client";
import { logger } from "@/lib/utils/logger";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Notion API의 properties 타입을 더 유연하게 처리
type NotionPropertiesType = PageObjectResponse["properties"] | undefined;

export interface PageProperties {
  tags?: string[];
  status?: string;
  editor?: string;
  lastEditedTime?: string;
  lastEditedBy?: string;
  [key: string]: unknown;
}

/**
 * Fetch a Notion page with property preservation
 */
export async function fetchPageWithProperties(pageId: string) {
  try {
    logger.info("Fetching Notion page with properties", { pageId });

    const page = (await getNotionClient().pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;

    // Extract properties
    const properties: PageProperties = {
      lastEditedTime: page.last_edited_time || undefined,
      lastEditedBy:
        (page.last_edited_by &&
        "id" in page.last_edited_by &&
        typeof page.last_edited_by.id === "string"
          ? page.last_edited_by.id
          : undefined) ||
        (page.last_edited_by &&
        "name" in page.last_edited_by &&
        typeof page.last_edited_by.name === "string"
          ? page.last_edited_by.name
          : undefined) ||
        undefined,
      tags: extractTags(page.properties),
      status: extractStatus(page.properties),
      editor:
        (page.last_edited_by &&
        "name" in page.last_edited_by &&
        typeof page.last_edited_by.name === "string"
          ? page.last_edited_by.name
          : undefined) ||
        (page.created_by &&
        "name" in page.created_by &&
        typeof page.created_by.name === "string"
          ? page.created_by.name
          : undefined) ||
        undefined,
    };

    logger.info("Page fetched successfully", {
      pageId,
      title: page.properties?.title || "Untitled",
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
function extractTags(properties: NotionPropertiesType): string[] {
  const tags: string[] = [];

  if (properties) {
    Object.entries(properties).forEach(([, prop]) => {
      if (
        prop &&
        "type" in prop &&
        prop.type === "multi_select" &&
        "multi_select" in prop &&
        Array.isArray(prop.multi_select)
      ) {
        tags.push(
          ...prop.multi_select.map((item) => ("name" in item ? item.name : ""))
        );
      }
    });
  }

  return tags;
}

/**
 * Extract status from page properties
 */
function extractStatus(properties: NotionPropertiesType): string | undefined {
  if (!properties) return undefined;

  for (const [, prop] of Object.entries(properties)) {
    if (!prop || !("type" in prop)) continue;
    if (
      prop.type === "select" &&
      "select" in prop &&
      prop.select &&
      "name" in prop.select
    ) {
      return prop.select.name;
    }
    if (
      prop.type === "status" &&
      "status" in prop &&
      prop.status &&
      "name" in prop.status
    ) {
      return prop.status.name;
    }
  }

  return undefined;
}
