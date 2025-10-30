import { getNotionClient } from "./api-client";
import { logger } from "@/lib/utils/logger";

/**
 * List all pages in a Notion workspace
 */
export async function listAllPages() {
  try {
    logger.info("Fetching all pages from Notion workspace");

    const response = await getNotionClient().search({
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 100,
    });

    logger.info("Pages fetched successfully", {
      count: response.results.length,
    });

    return response.results;
  } catch (error) {
    logger.error("Error listing pages", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Query a specific database for pages
 */
export async function queryDatabase(databaseId: string) {
  try {
    logger.info("Querying Notion database", { databaseId });

    const response = await getNotionClient().databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    logger.info("Database queried successfully", {
      count: response.results.length,
    });

    return response.results;
  } catch (error) {
    logger.error("Error querying database", {
      databaseId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Fetch databases in workspace
 */
export async function listDatabases() {
  try {
    logger.info("Fetching databases from Notion workspace");

    const response = await getNotionClient().search({
      filter: {
        property: "object",
        value: "database",
      },
      page_size: 100,
    });

    logger.info("Databases fetched successfully", {
      count: response.results.length,
    });

    return response.results;
  } catch (error) {
    logger.error("Error listing databases", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
