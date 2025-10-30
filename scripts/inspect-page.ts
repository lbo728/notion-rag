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
 * Inspect a specific Notion page to understand its structure
 */
async function inspectPage(pageId?: string) {
  if (!pageId) {
    console.log("🔍 Searching for '짧은 글쓰기' page...\n");

    // Search for pages
    const searchResults = await notionClient.search({
      query: "짧은",
      page_size: 20,
    });

    console.log(`✅ Found ${searchResults.results.length} pages\n`);

    for (const page of searchResults.results) {
      const title = extractTitle(page);
      console.log(`📄 ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   Object: ${page.object}`);
      console.log(
        `   URL: ${(page as any).url || `https://notion.so/${page.id.replace(/-/g, "")}`}`
      );

      // Try to retrieve full details
      try {
        const fullPage = await notionClient.pages.retrieve({
          page_id: page.id,
        });
        const fullTitle = extractTitle(fullPage);
        if (fullTitle !== title && fullTitle !== "Untitled") {
          console.log(`   Full title: ${fullTitle}`);
        }

        // Show properties keys
        if (fullPage.properties) {
          console.log(
            `   Properties: ${Object.keys(fullPage.properties).join(", ")}`
          );
        }
      } catch (err) {
        console.log(`   ⚠️  Could not retrieve full details`);
      }
      console.log();

      // If title matches, use this page
      if (title.includes("짧은") || title.includes("글쓰기")) {
        pageId = page.id;
        console.log(`\n✅ Found matching page: ${page.id}\n`);
        break;
      }
    }
  }

  if (!pageId) {
    console.error("❌ No page ID found or provided");
    return;
  }

  console.log(`\n🔍 Inspecting page: ${pageId}\n`);

  try {
    // Retrieve full page details
    const page = await notionClient.pages.retrieve({ page_id: pageId });

    console.log("📄 Page Details:");
    console.log(`   ID: ${page.id}`);
    console.log(`   Object: ${page.object}`);
    console.log(
      `   URL: ${(page as any).url || `https://notion.so/${pageId.replace(/-/g, "")}`}`
    );
    console.log(`   Created: ${page.created_time}`);
    console.log(`   Last edited: ${page.last_edited_time}`);

    const title = extractTitle(page);
    console.log(`   Title: ${title}`);

    console.log("\n📋 Properties:");
    if (page.properties) {
      for (const [key, prop] of Object.entries(page.properties)) {
        console.log(`   - ${key}: ${JSON.stringify(prop).substring(0, 100)}`);
      }
    } else {
      console.log("   (No properties)");
    }

    // Fetch blocks
    console.log("\n📦 Fetching blocks...");
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

    console.log(`   Found ${blocks.length} blocks`);

    // Show first few blocks
    if (blocks.length > 0) {
      console.log("\n   First 3 blocks:");
      blocks.slice(0, 3).forEach((block: any, idx) => {
        console.log(`   ${idx + 1}. Type: ${block.type}`);
        if (block[block.type]?.rich_text) {
          const text = block[block.type].rich_text
            .map((t: any) => t.plain_text)
            .join("");
          console.log(`      Text: ${text.substring(0, 50)}...`);
        }
      });
    }

    console.log(`\n✅ Page inspection complete!`);
    console.log(`\nTo sync this page, run:`);
    console.log(`  pnpm tsx scripts/sync-specific-page.ts ${pageId}\n`);
  } catch (error: any) {
    console.error(`❌ Error inspecting page:`, error.message || error);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  }
}

function extractTitle(page: any): string {
  // Try multiple methods to extract title
  if (page.properties) {
    // Method 1: Look for title property
    for (const [key, prop] of Object.entries(page.properties)) {
      const propAny = prop as any;
      if (propAny.type === "title" && propAny.title) {
        if (Array.isArray(propAny.title)) {
          return propAny.title.map((t: any) => t.plain_text || "").join("");
        }
        return String(propAny.title);
      }
    }

    // Method 2: Look for any rich_text property
    for (const [key, prop] of Object.entries(page.properties)) {
      const propAny = prop as any;
      if (
        propAny.type === "rich_text" &&
        propAny.rich_text &&
        Array.isArray(propAny.rich_text) &&
        propAny.rich_text.length > 0
      ) {
        const text = propAny.rich_text
          .map((t: any) => t.plain_text || "")
          .join("");
        if (text) return text;
      }
    }
  }

  // Method 3: Direct title property
  if ((page as any).title) {
    return String((page as any).title);
  }

  return "Untitled";
}

const pageId = process.argv[2];
inspectPage(pageId).catch(console.error);
