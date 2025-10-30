import { Client } from "@notionhq/client";

export const getNotionClient = (): Client => {
  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    throw new Error("NOTION_API_KEY is not set in environment variables");
  }
  return new Client({ auth: notionToken });
};

export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

export interface NotionPageProperties {
  tags?: string[];
  status?: string;
  editor?: string;
  category?: string;
  priority?: string;
  [key: string]: unknown;
}

/**
 * Fetch a page by ID
 */
export async function fetchPage(pageId: string) {
  try {
    const response = await getNotionClient().pages.retrieve({ page_id: pageId });
    return response;
  } catch (error) {
    console.error(`Error fetching page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Fetch all blocks for a page
 */
export async function fetchPageBlocks(pageId: string) {
  try {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const response = await getNotionClient().blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });

      blocks.push(...(response.results as NotionBlock[]));
      cursor = response.next_cursor || undefined;
    } while (cursor);

    return blocks;
  } catch (error) {
    console.error(`Error fetching blocks for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Query all pages in workspace
 */
export async function listAllPages(databaseId?: string) {
  try {
    const pages = [];
    let cursor: string | undefined;

    if (databaseId) {
      // Query a specific database
      do {
        const response = await getNotionClient().databases.query({
          database_id: databaseId,
          page_size: 100,
          start_cursor: cursor,
        });

        pages.push(...response.results);
        cursor = response.next_cursor || undefined;
      } while (cursor);
    } else {
      // List all pages (requires search capability)
      const response = await getNotionClient().search({
        filter: {
          property: "object",
          value: "page",
        },
      });
      pages.push(...response.results);
    }

    return pages;
  } catch (error) {
    console.error("Error listing pages:", error);
    throw error;
  }
}
