"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StatutoryContributionsReportPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reports/salary/register");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
      <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Redirecting to Salary Register...</p>
    </div>
  );
}
