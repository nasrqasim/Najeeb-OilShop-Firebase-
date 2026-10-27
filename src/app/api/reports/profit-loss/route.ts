import { ok } from "@/lib/api";
import { getDocuments } from "@/lib/firestore/genericRepository";

function getLineQty(line: any, item: any): number {
  const cartons = Number(line.cartons) || 0;
  if (cartons > 0) return cartons;

  const litersInCtn = Number(item?.litersInCtn || 0);
  const gallonsInCtn = Number(item?.gallonsInCtn || 0);

  const liters = Number(line.liters) || 0;
  if (liters > 0 && litersInCtn > 0) {
    return Number((liters / litersInCtn).toFixed(4));
  }

  const gallons = Number(line.gallons) || 0;
  if (gallons > 0 && gallonsInCtn > 0) {
    return Number((gallons / gallonsInCtn).toFixed(4));
  }

  const qty = Number(line.qty) || 0;
  return qty > 0 ? qty : 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const fromTime = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
    const toTime = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;

    const [allEntries, accounts, allInvoices, items, otherIncomes, allPayments] = await Promise.all([
      getDocuments("journal_entries"),
      getDocuments("accounts"),
      getDocuments("invoices"),
      getDocuments("items"),
      getDocuments("other_incomes"),
      getDocuments("cash_payments")
    ]);

    const filteredEntries = (allEntries || []).filter((j: any) => {
      const t = new Date(j.date || 0).getTime();
      return t >= fromTime && t <= toTime;
    });

    const balanceMap = new Map<string, { debit: number; credit: number }>();
    const titleMap = new Map<string, string>();

    for (const j of filteredEntries) {
      const code = j.accountCode;
      if (!code) continue;
      let curr = balanceMap.get(code);
      if (!curr) {
        curr = { debit: 0, credit: 0 };
        balanceMap.set(code, curr);
      }
      curr.debit += Number(j.debit || 0);
      curr.credit += Number(j.credit || 0);

      if (j.accountTitle && !titleMap.has(code)) {
        titleMap.set(code, j.accountTitle);
      }
    }

    const accountMap = new Map((accounts || []).map((a: any) => [String(a.code), a]));

    const periodInvoices = (allInvoices || []).filter((inv: any) => {
      if (inv.status === "cancelled" || inv.status === "Cancelled") return false;
      const t = new Date(inv.date || inv.createdAt || 0).getTime();
      return t >= fromTime && t <= toTime;
    });

    // -------------------------------------------------------------
    // Step 1: Product / Invoice Profit (Trading Gross Profit)
    // -------------------------------------------------------------
    const SALE_TYPES = new Set(["sale", "non_tax_sale", "pos", "pos_counter_sale"]);
    const SALE_RETURN_TYPES = new Set(["sale_return", "non_tax_sale_return", "pos_return"]);

    const itemMap = new Map<string, any>((items || []).map((i: any) => [String(i._id || i.id), i]));
    (items || []).forEach((i: any) => {
      if (i.code) itemMap.set(String(i.code), i);
    });

    let salesRevenue = 0;
    let totalCogs = 0;

    periodInvoices.forEach((inv: any) => {
      const invType = String(inv.type || "").toLowerCase();
      const isSale = SALE_TYPES.has(invType);
      const isReturn = SALE_RETURN_TYPES.has(invType);
      if (!isSale && !isReturn) return;

      const factor = isReturn ? -1 : 1;
      const invAmt = Number(inv.totalAmount || inv.total || inv.netAmount || 0);
      salesRevenue += invAmt * factor;

      (inv.lines || []).forEach((line: any) => {
        const rawItemId = typeof line.itemId === "object" ? line.itemId?._id : line.itemId;
        const item = itemMap.get(String(rawItemId)) || itemMap.get(String(line.itemCode || line.code || ""));
        const qty = getLineQty(line, item);
        const purchaseRate = Number(item?.purchaseRate ?? line.purchaseRate ?? line.cost ?? 0);
        totalCogs += (qty * purchaseRate) * factor;
      });
    });

    // If totalCogs became negative due to edge cases, keep minimum 0
    if (totalCogs < 0) totalCogs = 0;
    const grossProfit = salesRevenue - totalCogs;

    // -------------------------------------------------------------
    // Step 2: Less Operating Expenses (Hamare Apnay Expenses)
    // Excludes Purchase accounts (5100, 5101, etc.) and COGS
    // -------------------------------------------------------------
    const isPurchaseAccount = (code: string, title: string) => {
      const c = String(code || "");
      const t = String(title || "").toLowerCase();
      if (c === "5100" || c === "5101" || c.startsWith("510")) return true;
      if (t.includes("purchase") || t.includes("kharid")) return true;
      return false;
    };

    const expenses: Array<{ title: string; code?: string; amount: number }> = [];
    let totalExpenses = 0;

    balanceMap.forEach((journal, code) => {
      // Exclude asset (1xxx), liability (2xxx), equity (3xxx), revenue (4xxx)
      if (code.startsWith("1") || code.startsWith("2") || code.startsWith("3") || code.startsWith("4")) return;

      const acc = accountMap.get(code);
      const title = acc ? acc.title : (titleMap.get(code) || `Account ${code}`);

      // Exclude purchase and purchase return accounts
      if (isPurchaseAccount(code, title)) return;

      let type = acc ? String(acc.type || "").toLowerCase() : "";
      if (!type && code.startsWith("5")) type = "expense";

      if (type === "expense") {
        const balance = journal.debit - journal.credit;
        if (balance > 0) {
          expenses.push({ title, code, amount: balance });
          totalExpenses += balance;
        }
      }
    });

    // Fallback: If no journal entries for expenses, check petty cash payments
    if (expenses.length === 0) {
      const pettyPayments = (allPayments || []).filter((p: any) => {
        if (p.status === "cancelled" || p.status === "Cancelled") return false;
        const pType = String(p.paymentType || p.mode || "").toLowerCase();
        if (pType !== "petty") return false;
        const t = new Date(p.date || p.createdAt || 0).getTime();
        return t >= fromTime && t <= toTime;
      });
      for (const p of pettyPayments) {
        if (Array.isArray(p.contraLines) && p.contraLines.length > 0) {
          for (const line of p.contraLines) {
            const amt = Number(line.amount || 0);
            if (amt > 0) {
              const title = line.accountTitle || line.description || "Petty Expense";
              expenses.push({ title, amount: amt });
              totalExpenses += amt;
            }
          }
        } else {
          const amt = Number(p.amount || p.netPaid || 0);
          if (amt > 0) {
            expenses.push({ title: p.narration || "Petty Cash Expense", amount: amt });
            totalExpenses += amt;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Step 3: Add Other Income (Other Income ka Balance)
    // -------------------------------------------------------------
    const otherIncomeList: Array<{ title: string; code?: string; amount: number }> = [];
    let totalOtherIncome = 0;
    let hasOtherIncomeJournal = false;

    balanceMap.forEach((journal, code) => {
      // Exclude 4100 (Sales Revenue) and direct sales ledger to prevent double counting with invoices
      if (code === "4100" || code.startsWith("410")) return;

      const acc = accountMap.get(code);
      const title = acc ? acc.title : (titleMap.get(code) || `Account ${code}`);
      let type = acc ? String(acc.type || "").toLowerCase() : "";
      if (!type && code.startsWith("4")) type = "income";
      else if (type === "revenue") type = "income";

      if (type === "income" || code === "40002001" || String(title).toLowerCase().includes("other income")) {
        const balance = journal.credit - journal.debit;
        if (balance > 0) {
          otherIncomeList.push({ title, code, amount: balance });
          totalOtherIncome += balance;
          hasOtherIncomeJournal = true;
        }
      }
    });

    // Fallback: If Other Incomes exist in other_incomes collection not captured via journal
    if (!hasOtherIncomeJournal) {
      const periodOtherIncomes = (otherIncomes || []).filter((inc: any) => {
        if (inc.status === "cancelled" || inc.status === "Cancelled") return false;
        const t = new Date(inc.date || inc.createdAt || 0).getTime();
        return t >= fromTime && t <= toTime;
      });
      periodOtherIncomes.forEach((inc: any) => {
        const amt = Number(inc.amount || 0);
        if (amt > 0) {
          otherIncomeList.push({
            title: inc.title || inc.description || inc.category || "Other Income",
            amount: amt
          });
          totalOtherIncome += amt;
        }
      });
    }

    // -------------------------------------------------------------
    // Step 4: Final Net Profit
    // Net Profit = Gross Profit - Operating Expenses + Other Income
    // -------------------------------------------------------------
    const netProfit = grossProfit - totalExpenses + totalOtherIncome;

    const report = {
      // Step 1: Sales Trading Profit (Product / Invoice profit)
      salesRevenue,
      cogs: totalCogs,
      grossProfit,

      // Step 2: Less Operating Expenses
      expenses,
      totalExpenses,

      // Step 3: Add Other Income
      otherIncome: otherIncomeList,
      totalOtherIncome,

      // Step 4: Final Net Profit
      netProfit,

      // Backward compatibility fields for any generic component consumers:
      totalRevenue: salesRevenue + totalOtherIncome,
      revenue: [
        { title: "Sales Revenue", amount: salesRevenue },
        ...otherIncomeList
      ]
    };

    return ok(report);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
