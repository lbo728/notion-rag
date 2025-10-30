import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

/**
 * Preserve existing properties (tags/status/editor/lastEditedTime) during sync
 */
export async function preserveProperties(
  pageId: string,
  newProperties: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    // Get existing page from database
    const { data: existingPage, error } = await supabase
      .from("notion_pages")
      .select("properties")
      .eq("page_id", pageId)
      .single();

    if (error || !existingPage?.properties) {
      // Page doesn't exist yet, return new properties as-is
      return newProperties;
    }

    const existingProperties = existingPage.properties as Record<
      string,
      unknown
    >;

    // Preserve specific properties that should not be overwritten
    const preserved = {
      ...newProperties,
      // Preserve tags if they exist in old properties
      tags: existingProperties.tags || newProperties.tags || [],
      // Preserve status if it exists
      status: existingProperties.status || newProperties.status,
      // Preserve editor metadata
      editor: existingProperties.editor || newProperties.editor,
      // Preserve lastEditedTime from existing if available
      lastEditedTime:
        existingProperties.lastEditedTime ||
        newProperties.lastEditedTime ||
        new Date().toISOString(),
    };

    logger.debug("Preserved properties", {
      pageId,
      preserved: Object.keys(preserved),
    });

    return preserved;
  } catch (error) {
    logger.error("Error preserving properties", {
      pageId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return new properties as fallback
    return newProperties;
  }
}
