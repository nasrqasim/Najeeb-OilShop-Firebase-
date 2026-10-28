import { fail, ok } from "@/lib/api";
import { getAllCategories, createCategory } from "@/lib/firestore/itemsRepository";

const DEFAULT_CUSTOMER_CATEGORIES = [
  "Cash Customer",
  "Credit Customer",
  "Cash Customer (Jama)",
  "Credit Customer (Counter)",
  "Credit Customer Max",
  "Credit Customer (Haji Gul)",
  "Credit Customer (Makkah)",
  "Credit Customer (Radbook)"
];

const DEFAULT_VENDOR_CATEGORIES = [
  "General Supplier",
  "Oil Companies",
  "Spare Parts / Filters",
  "Local Distributors",
  "Import Suppliers",
  "Cash Vendor",
  "Credit Vendor"
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    let rows = await getAllCategories();

    if (type) {
      const filtered = rows.filter((c: any) => c.type === type);
      if (filtered.length === 0) {
        // Auto-seed default categories if none exist yet for this party type
        if (type === "customer") {
          const seeded = await Promise.all(
            DEFAULT_CUSTOMER_CATEGORIES.map((name) => createCategory({ name, type: "customer" }))
          );
          return ok(seeded);
        } else if (type === "vendor") {
          const seeded = await Promise.all(
            DEFAULT_VENDOR_CATEGORIES.map((name) => createCategory({ name, type: "vendor" }))
          );
          return ok(seeded);
        }
      }
      return ok(filtered);
    }

    return ok(rows);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return fail("Category name is required");
    }
    const payload = {
      name: body.name.trim(),
      type: body.type || "item",
      parentId: body.parentId || null,
      code: body.code || "",
      description: body.description || ""
    };
    const row = await createCategory(payload);
    return ok(row, 201);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export const dynamic = "force-dynamic";

