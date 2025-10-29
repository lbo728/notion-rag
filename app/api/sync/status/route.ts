import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils/logger";
import { supabase } from "@/lib/supabase/client";
import { SyncStatus } from "@/lib/types/sync";

/**
 * GET /api/sync/status
 *
 * Get latest sync job status
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const status: SyncStatus = {
        status: "idle",
        last_sync: null,
      };
      return NextResponse.json(status);
    }

    const status: SyncStatus = {
      status: data.status || "idle",
      last_sync: data.completed_at,
      pages_processed: data.pages_processed || 0,
      blocks_processed: data.blocks_processed || 0,
      embeddings_created: data.embeddings_created || 0,
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error("Error getting sync status", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to get sync status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
