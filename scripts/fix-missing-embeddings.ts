import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabase } from "../lib/supabase/client";
import { generateEmbedding } from "../lib/embeddings/openai";

/**
 * Fix missing embeddings for existing blocks
 */
async function fixMissingEmbeddings() {
  console.log("🔧 Fixing missing embeddings...\n");

  // Get all blocks without embeddings
  const { data: blocks, error: fetchError } = await supabase
    .from("notion_blocks")
    .select("id, page_id, block_id, content")
    .is("embedding", null);

  if (fetchError) {
    console.error("Error fetching blocks:", fetchError);
    return;
  }

  if (!blocks || blocks.length === 0) {
    console.log("✅ All blocks already have embeddings!");
    return;
  }

  console.log(`Found ${blocks.length} blocks without embeddings\n`);

  for (const block of blocks) {
    if (!block.content || block.content.trim().length === 0) {
      console.log(`⏭️  Skipping block ${block.id} (empty content)`);
      continue;
    }

    try {
      console.log(`Generating embedding for block ${block.id}...`);
      const embedding = await generateEmbedding(block.content);

      const { error: updateError } = await supabase
        .from("notion_blocks")
        .update({ embedding })
        .eq("id", block.id);

      if (updateError) {
        console.error(`❌ Error updating block ${block.id}:`, updateError);
      } else {
        console.log(`✅ Updated block ${block.id}`);
      }
    } catch (error) {
      console.error(`❌ Error generating embedding for ${block.id}:`, error);
    }
  }

  console.log("\n✅ Done!");
}

fixMissingEmbeddings().catch(console.error);

