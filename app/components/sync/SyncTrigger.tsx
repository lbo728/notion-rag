"use client";

import { useState } from "react";

interface SyncTriggerProps {
  onSyncComplete?: () => void;
}

export function SyncTrigger({ onSyncComplete }: SyncTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSync = async (mode: "full" | "incremental" = "full") => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sync/trigger?mode=${mode}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to trigger sync");
      }

      const data = await response.json();
      console.log("Sync triggered:", data);

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Sync trigger error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => triggerSync("full")}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Full Sync"}
        </button>
        <button
          onClick={() => triggerSync("incremental")}
          disabled={loading}
          className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Incremental Sync"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600">Error: {error}</p>
      )}
    </div>
  );
}

