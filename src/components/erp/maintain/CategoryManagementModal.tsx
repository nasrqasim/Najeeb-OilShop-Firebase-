"use client";

import { useState, useEffect } from "react";
import ERPModal from "@/components/erp/ui/ERPModal";
import { Plus, Edit2, Trash2, Check, X, Tag, Search, AlertCircle } from "lucide-react";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "customer" | "vendor" | "item";
  title?: string;
  onCategoriesUpdated?: () => void;
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
  type,
  title,
  onCategoriesUpdated
}: CategoryManagementModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const modalTitle = title || (type === "customer" ? "Manage Customer Categories" : type === "vendor" ? "Manage Vendor Categories" : "Manage Categories");

  const fetchCategories = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/categories?type=${type}&t=${Date.now()}`);
      const json = await res.json();
      if (json.ok) {
        setCategories(json.data || []);
      } else {
        setErrorMsg(json.error || "Failed to load categories");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Network error loading categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setNewCatName("");
      setEditingId(null);
      setEditingName("");
      setErrorMsg("");
    }
  }, [isOpen, type]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), type })
      });
      const json = await res.json();
      if (json.ok) {
        setNewCatName("");
        await fetchCategories();
        if (onCategoriesUpdated) onCategoriesUpdated();
      } else {
        setErrorMsg(json.error || "Failed to create category");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat._id || cat.id);
    setEditingName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), type })
      });
      const json = await res.json();
      if (json.ok) {
        setEditingId(null);
        setEditingName("");
        await fetchCategories();
        if (onCategoriesUpdated) onCategoriesUpdated();
      } else {
        setErrorMsg(json.error || "Failed to update category");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to update category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    setErrorMsg("");
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.ok) {
        await fetchCategories();
        if (onCategoriesUpdated) onCategoriesUpdated();
      } else {
        setErrorMsg(json.error || "Failed to delete category");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete category");
    }
  };

  const filteredCategories = categories.filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ERPModal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="space-y-5 p-1">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={`Enter new ${type} category name...`}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-maroon-800/20 outline-none transition-all dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newCatName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-maroon-800 hover:bg-maroon-900 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-maroon-900/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        {/* Search within categories */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search existing categories..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-maroon-800/10 outline-none transition-all dark:text-white"
          />
        </div>

        {/* Categories List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              No categories found. Add your first category above!
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCategories.map((cat, idx) => {
                const id = cat._id || cat.id;
                const isEditing = editingId === id;

                return (
                  <li
                    key={id || idx}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-3">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-maroon-800 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 text-[10px] font-black text-slate-300 dark:text-slate-600">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-400 hover:text-maroon-800 hover:bg-maroon-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Category Name"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(id, cat.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold">
          <span>Total: {categories.length} Categories</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </ERPModal>
  );
}
