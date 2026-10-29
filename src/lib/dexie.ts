import Dexie, { Table } from "dexie";

export interface DraftRecord {
  id?: number;
  module: "sales" | "purchase" | "expense";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncQueueRecord {
  id?: number;
  endpoint: string;
  method: "POST" | "PUT";
  payload: Record<string, unknown>;
  status: "pending" | "syncing" | "failed" | "done";
  retries: number;
  lastError?: string;
  createdAt: string;
}

export interface LocalTransactionVault {
  id?: number;
  docNo: string;
  module: string;
  docType: string;
  data: Record<string, unknown>;
  user: string;
  timestamp: string;
  syncedToCloud: boolean;
}

class ERPDexie extends Dexie {
  drafts!: Table<DraftRecord, number>;
  syncQueue!: Table<SyncQueueRecord, number>;
  vault!: Table<LocalTransactionVault, number>;

  constructor() {
    super("oilshopERP");
    this.version(2).stores({
      drafts: "++id,module,createdAt",
      syncQueue: "++id,status,createdAt",
      vault: "++id,docNo,module,docType,timestamp,syncedToCloud"
    });
  }
}

export const offlineDB = new ERPDexie();
