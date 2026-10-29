"use client";

import { offlineDB, LocalTransactionVault, SyncQueueRecord } from "./dexie";

/**
 * Record a transaction into local device vault in real-time.
 * Every invoice, voucher, or entry saved by Admin, Super Admin, or Salesman
 * is instantly cloned into local IndexedDB and local journal.
 */
export async function recordRealtimeLocalBackup(params: {
  docNo: string;
  module: string;
  docType: string;
  data: Record<string, unknown>;
  user?: string;
  syncedToCloud?: boolean;
}): Promise<number | undefined> {
  if (typeof window === "undefined") return;

  const timestamp = new Date().toISOString();
  const entry: LocalTransactionVault = {
    docNo: params.docNo || `TX-${Date.now()}`,
    module: params.module || "general",
    docType: params.docType || "transaction",
    data: params.data,
    user: params.user || "Current User",
    timestamp,
    syncedToCloud: params.syncedToCloud ?? true,
  };

  try {
    // 1. Persist to Dexie IndexedDB
    const id = await offlineDB.vault.add(entry);

    // 2. Persist to localStorage rolling mini-journal (last 50 txs) for fast recovery
    try {
      const existingRaw = localStorage.getItem("alhadid_local_journal");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift({
        id,
        docNo: entry.docNo,
        module: entry.module,
        docType: entry.docType,
        user: entry.user,
        timestamp,
        synced: entry.syncedToCloud
      });
      localStorage.setItem("alhadid_local_journal", JSON.stringify(existing.slice(0, 50)));
    } catch (_) {}

    return id;
  } catch (err) {
    console.error("Failed to write to local transaction vault:", err);
  }
}

/**
 * Queue a transaction for background sync when system is offline
 */
export async function queueOfflineTransaction(params: {
  endpoint: string;
  method: "POST" | "PUT";
  payload: Record<string, unknown>;
  docNo?: string;
  module?: string;
}) {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();

  // 1. Add to sync queue
  const queueRecord: SyncQueueRecord = {
    endpoint: params.endpoint,
    method: params.method,
    payload: params.payload,
    status: "pending",
    retries: 0,
    createdAt: now,
  };
  await offlineDB.syncQueue.add(queueRecord);

  // 2. Also record in local vault marked as un-synced
  await recordRealtimeLocalBackup({
    docNo: params.docNo || `OFFLINE-${Date.now()}`,
    module: params.module || "offline",
    docType: "pending_upload",
    data: params.payload,
    syncedToCloud: false,
  });
}

/**
 * Get stats of local vault & pending sync queue
 */
export async function getLocalVaultStats() {
  if (typeof window === "undefined") {
    return { totalVault: 0, pendingSync: 0, lastSyncTime: "-" };
  }

  try {
    const totalVault = await offlineDB.vault.count();
    const pendingSync = await offlineDB.syncQueue.where("status").equals("pending").count();
    const lastEntry = await offlineDB.vault.orderBy("id").last();

    return {
      totalVault,
      pendingSync,
      lastSyncTime: lastEntry ? new Date(lastEntry.timestamp).toLocaleTimeString() : "Never",
    };
  } catch (e) {
    return { totalVault: 0, pendingSync: 0, lastSyncTime: "-" };
  }
}

/**
 * Download all locally stored vault entries as JSON file to local computer disk
 */
export async function exportLocalVaultAsJson() {
  if (typeof window === "undefined") return;

  const allEntries = await offlineDB.vault.toArray();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allEntries, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `alhadid_local_vault_backup_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Replays all pending items in sync queue when back online
 */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (typeof window === "undefined") return { processed: 0, failed: 0 };
  if (!navigator.onLine) return { processed: 0, failed: 0 };

  const pending = await offlineDB.syncQueue.where("status").equals("pending").toArray();
  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    if (!item.id) continue;
    try {
      await offlineDB.syncQueue.update(item.id, { status: "syncing" });
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        await offlineDB.syncQueue.update(item.id, { status: "done" });
        processed++;
      } else {
        await offlineDB.syncQueue.update(item.id, {
          status: "pending",
          retries: (item.retries || 0) + 1,
          lastError: `HTTP ${res.status}: ${res.statusText}`,
        });
        failed++;
      }
    } catch (err: any) {
      await offlineDB.syncQueue.update(item.id, {
        status: "pending",
        retries: (item.retries || 0) + 1,
        lastError: err.message || "Network error",
      });
      failed++;
    }
  }

  return { processed, failed };
}
