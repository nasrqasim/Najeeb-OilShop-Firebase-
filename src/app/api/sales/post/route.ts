import { fail, ok } from "@/lib/api";
import { postSalesInvoice } from "@/services/posting/salesPosting";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = await postSalesInvoice(body);
    return ok(row, 201);
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
