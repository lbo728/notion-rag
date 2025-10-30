import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables FIRST before importing modules that depend on them
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// Now import modules that depend on environment variables
import { getSupabase } from "../lib/supabase/client";

const supabase = getSupabase();

async function checkSetup() {
  console.log("🔍 Checking setup...\n");

  // 1. Check Supabase connection
  console.log("1. Checking Supabase connection...");
  const { error: healthError } = await supabase
    .from("notion_pages")
    .select("count")
    .limit(1);

  if (healthError) {
    console.error("❌ Supabase connection failed:", healthError.message);
    return;
  }
  console.log("✅ Supabase connected\n");

  // 2. Check match_blocks function
  console.log("2. Checking match_blocks function...");
  const { data: funcCheck } = await supabase.rpc("match_blocks", {
    query_embedding: new Array(1536).fill(0.1),
    match_threshold: 0.5,
    match_count: 1,
  });

  if (funcCheck !== null) {
    console.log("✅ match_blocks function exists\n");
  } else {
    console.error("❌ match_blocks function not found or error");
    console.log(
      "   Run migration: database/migrations/006_create_vector_search_function.sql\n"
    );
  }

  // 3. Check data
  console.log("3. Checking data...");
  const { count: pageCount } = await supabase
    .from("notion_pages")
    .select("*", { count: "exact", head: true });

  const { count: blockCount } = await supabase
    .from("notion_blocks")
    .select("*", { count: "exact", head: true });

  const { count: embeddingCount } = await supabase
    .from("notion_blocks")
    .select("embedding", { count: "exact", head: true })
    .not("embedding", "is", null);

  console.log(`   Pages: ${pageCount || 0}`);
  console.log(`   Blocks: ${blockCount || 0}`);
  console.log(`   Blocks with embeddings: ${embeddingCount || 0}\n`);

  if ((embeddingCount || 0) === 0) {
    console.log(
      "⚠️  No embeddings found! Run: pnpm tsx scripts/add-test-data.ts\n"
    );
  } else {
    console.log("✅ Data available\n");
  }

  // 4. Check environment variables
  console.log("4. Checking environment variables...");
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing variables: ${missing.join(", ")}\n`);
  } else {
    console.log("✅ All required environment variables set\n");
  }

  console.log("✅ Setup check complete!");
}

checkSetup().catch(console.error);
