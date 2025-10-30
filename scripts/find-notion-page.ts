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
 * Find a Notion page by searching title or list all pages
 */
async function findNotionPage(searchTerm?: string) {
  console.log("🔍 Searching Notion workspace...\n");

  try {
    // Search for pages
    const searchResults = await notionClient.search({
      query: searchTerm || "",
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 100,
    });

    console.log(`✅ Found ${searchResults.results.length} pages\n`);

    if (searchTerm) {
      // Filter by search term
      const matching = searchResults.results.filter((page: any) => {
        const title = getPageTitle(page);
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      });

      if (matching.length > 0) {
        console.log(`📄 Pages matching "${searchTerm}":\n`);
        matching.forEach((page: any, idx) => {
          const title = getPageTitle(page);
          const pageId = page.id.replace(/-/g, "");
          console.log(`${idx + 1}. ${title}`);
          console.log(`   Page ID: ${page.id}`);
          console.log(`   URL: https://notion.so/${pageId}`);
          console.log(`   Last edited: ${page.last_edited_time || "N/A"}\n`);
        });

        // If exact match, show first result details
        if (matching.length === 1) {
          const page = matching[0];
          console.log(`\n✅ Exact match found!`);
          console.log(`\nTo sync this page, run:`);
          console.log(
            `  pnpm tsx scripts/sync-specific-page.ts "${getPageTitle(page)}"`
          );
          console.log(`Or with page ID:`);
          console.log(`  pnpm tsx scripts/sync-specific-page.ts ${page.id}\n`);
        }
      } else {
        console.log(`❌ No pages found matching "${searchTerm}"\n`);
        console.log("Available pages:\n");
        searchResults.results.slice(0, 10).forEach((page: any, idx) => {
          console.log(`${idx + 1}. ${getPageTitle(page)}`);
        });
      }
    } else {
      // List all pages
      console.log("📋 All pages:\n");
      searchResults.results.forEach((page: any, idx) => {
        const title = getPageTitle(page);
        const pageId = page.id.replace(/-/g, "");
        console.log(`${idx + 1}. ${title}`);
        console.log(`   ID: ${page.id}`);
        console.log(`   URL: https://notion.so/${pageId}\n`);
      });
    }

    return searchResults.results;
  } catch (error: any) {
    if (error.code === "object_not_found" || error.status === 404) {
      console.error("❌ Notion integration not found or no access");
      console.error(
        "   Check your NOTION_API_KEY and integration permissions\n"
      );
    } else {
      console.error("❌ Error:", error.message || error);
    }
    throw error;
  }
}

function getPageTitle(page: any): string {
  if (page.properties?.title?.title) {
    return page.properties.title.title.map((t: any) => t.plain_text).join("");
  }
  if (page.object === "page" && (page as any).title) {
    return (page as any).title;
  }
  return "Untitled";
}

const searchTerm = process.argv[2];
findNotionPage(searchTerm).catch(console.error);
