import dotenv from "dotenv";
import { resolve } from "path";
import { Client } from "@notionhq/client";

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const notionApiKey = process.env.NOTION_API_KEY;
if (!notionApiKey) {
  console.error("❌ Missing NOTION_API_KEY!");
  process.exit(1);
}

const notionClient = new Client({ auth: notionApiKey });

/**
 * List all pages in Notion workspace and search for specific title
 */
async function listAllNotionPages(searchTerm?: string) {
  console.log("🔍 Fetching all pages from Notion workspace...\n");

  try {
    const pages = [];
    let cursor: string | undefined;

    do {
      const response = await notionClient.search({
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 100,
        start_cursor: cursor,
      });

      pages.push(...response.results);
      cursor = response.next_cursor || undefined;
    } while (cursor);

    console.log(`✅ Found ${pages.length} pages\n`);

    if (searchTerm) {
      const matching = pages.filter((page: any) => {
        const title = getPageTitle(page);
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      });

      if (matching.length > 0) {
        console.log(`📄 Pages matching "${searchTerm}":\n`);
        matching.forEach((page: any) => {
          console.log(`   • ${getPageTitle(page)}`);
          console.log(`     ID: ${page.id}`);
          console.log(
            `     URL: ${(page as any).url || `https://notion.so/${page.id.replace(/-/g, "")}`}\n`
          );
        });
      } else {
        console.log(`❌ No pages found matching "${searchTerm}"\n`);
      }
    }

    // Show first 20 pages
    console.log("📋 First 20 pages:\n");
    pages.slice(0, 20).forEach((page: any, idx) => {
      console.log(`${idx + 1}. ${getPageTitle(page)}`);
      console.log(`   ID: ${page.id}\n`);
    });

    return pages;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
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

const searchTerm = process.argv[2];
listAllNotionPages(searchTerm).catch(console.error);


