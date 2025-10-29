"use client";

import { useEffect, useState } from "react";
import { SyncStatus as SyncStatusType } from "@/lib/types/sync";

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sync/status");
      if (!response.ok) throw new Error("Failed to fetch status");

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-xs text-gray-500">Loading status...</div>;
  }

  if (!status) {
    return <div className="text-xs text-gray-500">No sync status available</div>;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "running":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Sync Status:</span>
        <span className={getStatusColor()}>
          {status.status === "idle" ? "Idle" : status.status.toUpperCase()}
        </span>
      </div>
      <div className="text-gray-600">
        Last sync: {formatDate(status.last_sync)}
      </div>
      {status.pages_processed !== undefined && status.pages_processed > 0 && (
        <div className="text-gray-600">
          Pages: {status.pages_processed} | Blocks:{" "}
          {status.blocks_processed || 0} | Embeddings:{" "}
          {status.embeddings_created || 0}
        </div>
      )}
    </div>
  );
}

