"use client";

import { 
  Bell, 
  Search, 
  Moon, 
  Sun,
  HelpCircle, 
  RefreshCw,
  LogOut
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import WidgetVisibilityPanel, { WidgetKey } from "@/components/dashboard/WidgetVisibilityPanel";
import ReorderNotificationBell from "@/components/erp/ReorderNotificationBell";


interface TopBarProps {
  title: string;
  onSearchClick?: () => void;
  widgetVisibility?: Record<WidgetKey, boolean>;
  onWidgetToggle?: (key: WidgetKey) => void;
  user: {
    name: string;
    role: string;
    oilshop?: string;
  };
}

export default function TopBar({ title, user, onSearchClick, widgetVisibility, onWidgetToggle }: TopBarProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) setTheme(savedTheme);
    
    const handleThemeChange = (e: any) => {
      setTheme(e.detail);
    };
    window.addEventListener("theme-changed", handleThemeChange as any);
    return () => window.removeEventListener("theme-changed", handleThemeChange as any);
  }, []);

  const toggleTheme = () => {
    window.dispatchEvent(new CustomEvent("toggle-theme"));
  };

  return (
    <header className="sticky top-0 h-16 bg-gradient-to-r from-maroon-900 to-maroon-800 border-b border-maroon-700/50 px-6 flex items-center justify-between z-40 shadow-lg shadow-maroon-900/10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black text-white tracking-tighter uppercase">AL HADEED TRADERS</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Removed Last 30 Days and Last updated info */}

        <div className="flex items-center gap-1 border-r border-white/10 pr-4 mr-4">
          <button 
            onClick={onSearchClick}
            className="p-2 text-maroon-200 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-all"
          >
            <Search size={20} />
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 text-maroon-200 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-all"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-maroon-200 hover:bg-white/10 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <ReorderNotificationBell />
          {/* Widget Visibility — only shown on dashboard */}
          {widgetVisibility && onWidgetToggle ? (
            <WidgetVisibilityPanel visibility={widgetVisibility} onToggle={onWidgetToggle} />
          ) : (
            <button className="p-2 text-maroon-200 hover:bg-white/10 rounded-lg transition-all">
              <span className="opacity-30"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/></svg></span>
            </button>
          )}
          <button className="p-2 text-maroon-200 hover:bg-white dark:bg-slate-900/10 rounded-lg transition-all">
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right">
              <p className="text-xs font-black text-white leading-none tracking-tight">{user.name}</p>
              <p className="text-[10px] text-maroon-200 mt-1 uppercase font-bold tracking-widest">{user.oilshop || "Al Hadeed Traders"} • {user.role}</p>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white bg-maroon-700/50 border border-maroon-600 hover:bg-maroon-700 transition-all rounded-xl"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
      </div>
    </header>
  );
}
