/**
 * Global Dynamic Date Helpers for ERP
 * Ensures From Date is ALWAYS the 1st of current month (YYYY-MM-01)
 * and To Date is ALWAYS today (YYYY-MM-DD), formatted in local time.
 */

export function getStartOfMonthStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function getCurrentDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultDateRange(): { fromDate: string; toDate: string } {
  return {
    fromDate: getStartOfMonthStr(),
    toDate: getCurrentDateStr()
  };
}
