import fs from "fs";
import path from "path";

const memoryStore = new Map<string, any[]>();

export function getCollectionData(colName: string): any[] {
  const normalized = colName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (memoryStore.has(normalized)) {
    return memoryStore.get(normalized)!;
  }

  const possiblePaths = [
    path.join(process.cwd(), "src", "data", "backup", `${normalized}.json`),
    path.join(process.cwd(), "oilshop", "src", "data", "backup", `${normalized}.json`),
    path.join(__dirname, "..", "..", "data", "backup", `${normalized}.json`)
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryStore.set(normalized, parsed);
          return parsed;
        }
      } catch (err) {
        console.error(`Error reading fallback data for ${normalized}:`, err);
      }
    }
  }

  return [];
}

export function queryFallbackDocs(colName: string, constraints?: any[]): any[] {
  let list = [...getCollectionData(colName)];

  if (constraints && constraints.length > 0) {
    for (const c of constraints) {
      if (c.type === "where") {
        list = list.filter(item => {
          const val = item[c.field];
          const target = c.val;

          if (typeof val === "string" && typeof target === "string") {
            if (c.op === "==") return val.toLowerCase() === target.toLowerCase();
            if (c.op === "!=") return val.toLowerCase() !== target.toLowerCase();
          }

          if (c.op === "==") return val == target;
          if (c.op === "!=") return val != target;
          if (c.op === ">") return val > target;
          if (c.op === ">=") return val >= target;
          if (c.op === "<") return val < target;
          if (c.op === "<=") return val <= target;
          if (c.op === "in") return Array.isArray(target) && target.includes(val);
          return true;
        });
      } else if (c.type === "orderBy") {
        list.sort((a, b) => {
          const valA = a[c.field];
          const valB = b[c.field];
          if (valA === valB) return 0;
          if (c.dir === "desc") return valA < valB ? 1 : -1;
          return valA > valB ? 1 : -1;
        });
      } else if (c.type === "limit") {
        list = list.slice(0, c.n);
      }
    }
  }

  return list;
}

export function getFallbackDoc(colName: string, docId: string): any | null {
  const list = getCollectionData(colName);
  return list.find(item => String(item._id || item.id) === String(docId)) || null;
}

export function saveFallbackDoc(colName: string, docId: string, data: any): void {
  const normalized = colName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const list = [...getCollectionData(normalized)];
  const existingIdx = list.findIndex(item => String(item._id || item.id) === String(docId));

  const doc = {
    _id: docId,
    id: docId,
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...doc };
  } else {
    list.unshift(doc);
  }

  memoryStore.set(normalized, list);
}

export function deleteFallbackDoc(colName: string, docId: string): void {
  const normalized = colName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const list = getCollectionData(normalized).filter(item => String(item._id || item.id) !== String(docId));
  memoryStore.set(normalized, list);
}
