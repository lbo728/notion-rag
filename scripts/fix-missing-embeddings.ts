import dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// Create Supabase client directly in script (not from shared module)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create OpenAI client directly
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("❌ Missing OPENAI_API_KEY environment variable!");
  process.exit(1);
}

import OpenAI from "openai";
const openaiClient = new OpenAI({ apiKey: openaiApiKey });

// Generate embedding function
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

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
