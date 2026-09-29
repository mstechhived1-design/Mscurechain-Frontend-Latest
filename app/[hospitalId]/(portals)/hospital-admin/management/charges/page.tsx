"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, RotateCcw, Save, X, IndianRupee } from "lucide-react";
import { hospitalAdminService } from "@/lib/integrations/services/hospitalAdmin.service";
import toast from "react-hot-toast";

interface ICharge {
  _id: string;
  category: string;
  description: string;
  amount: number;
  isActive: boolean;
}

const DEFAULT_CATEGORIES = [
  "Room Charges",
  "Nursing Charges",
  "Consumables",
  "Procedure Charges",
  "Equipment Charges",
  "Doctor Visit",
  "Physiotherapy",
  "Emergency Services",
  "Ambulance",
  "Blood Bank",
  "Other"
];

export default function ChargesManagement() {
  const [charges, setCharges] = useState<ICharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);
  
  // Modals / Editing States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ICharge | null>(null);
  
  // Form State
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCharges();
  }, []);

  useEffect(() => {
    // Re-build category list dynamically based on database entries combined with defaults
    const dbCategories = Array.from(new Set(charges.map((c) => c.category)));
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));
    setCategoriesList(combined);
    
    // Ensure selectedCategory is valid; fallback to first item of combined list
    if (combined.length > 0 && !combined.includes(selectedCategory)) {
      setSelectedCategory(combined[0]);
    }
  }, [charges]);

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const res = await hospitalAdminService.getCharges();
      if (res.success) {
        setCharges(res.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load hospital charges");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCharge(null);
    setFormCategory(selectedCategory);
    setCustomCategoryName("");
    setFormDescription("");
    setFormAmount("");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (charge: ICharge) => {
    setEditingCharge(charge);
    setFormCategory(charge.category);
    setCustomCategoryName("");
    setFormDescription(charge.description);
    setFormAmount(String(charge.amount));
    setFormIsActive(charge.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formCategory === "__NEW__" ? customCategoryName.trim() : formCategory;
    
    if (!finalCategory) return toast.error("Please select or enter a category name");
    if (!formDescription.trim()) return toast.error("Please enter a description");
    if (!formAmount || isNaN(Number(formAmount))) return toast.error("Please enter a valid amount");

    try {
      setSaving(true);
      const payload = {
        category: finalCategory,
        description: formDescription.trim(),
        amount: Number(formAmount),
        isActive: formIsActive
      };

      if (editingCharge) {
        const res = await hospitalAdminService.updateCharge(editingCharge._id, payload);
        if (res.success) {
          toast.success("Charge updated successfully");
          setIsModalOpen(false);
          fetchCharges();
        }
      } else {
        const res = await hospitalAdminService.createCharge(payload);
        if (res.success) {
          toast.success("New charge item added");
          setIsModalOpen(false);
          setSelectedCategory(finalCategory); // Switch category focus to the newly added one
          fetchCharges();
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save charge");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (charge: ICharge) => {
    try {
      const res = await hospitalAdminService.updateCharge(charge._id, {
        isActive: !charge.isActive
      });
      if (res.success) {
        toast.success(`Charge status set to ${!charge.isActive ? 'Active' : 'Inactive'}`);
        setCharges(prev => prev.map(c => c._id === charge._id ? { ...c, isActive: !c.isActive } : c));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (chargeId: string) => {
    if (!confirm("Are you sure you want to delete this charge item?")) return;
    try {
      const res = await hospitalAdminService.deleteCharge(chargeId);
      if (res.success) {
        toast.success("Charge deleted successfully");
        setCharges(prev => prev.filter(c => c._id !== chargeId));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete charge");
    }
  };

  const handleResetToPresets = async () => {
    if (!confirm("This will overwrite all customized rates and reset to standard presets. Are you sure?")) return;
    try {
      setLoading(true);
      const res = await hospitalAdminService.resetCharges();
      if (res.success) {
        toast.success("Charges reset to default system presets");
        setCharges(res.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reset charges");
    } finally {
      setLoading(false);
    }
  };

  const filteredCharges = charges.filter(
    (charge) =>
      charge.category === selectedCategory &&
      charge.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        <div className="shrink-0 flex items-center gap-2 px-1">
          <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <IndianRupee className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
              IPD Charges Master
            </h1>
            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 line-clamp-1">
              Configure inpatient standard prices
            </p>
          </div>
        </div>

        <div className="flex flex-row items-center justify-start xl:justify-end gap-2 w-full xl:w-auto shrink-0">
          <button
            onClick={handleResetToPresets}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-2 md:px-6 py-2 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all h-[34px] shadow-sm whitespace-nowrap"
          >
            <RotateCcw size={14} className="shrink-0" /> Reset Default
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-2 md:px-6 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all h-[34px] shadow-sm whitespace-nowrap"
          >
            <Plus size={14} className="shrink-0" /> Add Charge Item
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Categories selector */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Categories</h2>
          {categoriesList.map((cat) => {
            const count = charges.filter((c) => c.category === cat).length;
            const activeCount = charges.filter((c) => c.category === cat && c.isActive).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-slate-100 text-slate-800 shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected ? "bg-white text-slate-800" : "bg-slate-100 text-slate-500"
                }`}>
                  {activeCount}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Charges list */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search in ${selectedCategory}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* List/Table */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-slate-500">Loading charges...</span>
              </div>
            ) : filteredCharges.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
                <p className="text-sm font-medium">No items found in {selectedCategory}</p>
                <button
                  onClick={handleOpenAddModal}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Create the first item
                </button>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-100">
                    <th className="p-4 pl-6">Description</th>
                    <th className="p-4">Rate (₹)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCharges.map((charge) => (
                    <tr key={charge._id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                      <td className="p-4 pl-6 font-medium text-slate-800">{charge.description}</td>
                      <td className="p-4 font-semibold text-slate-900">₹{charge.amount.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(charge)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            charge.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {charge.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4 pr-6 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(charge)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-block"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(charge._id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">
                {editingCharge ? "Edit Charge Item" : "Add New Charge Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white font-medium text-slate-700"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__NEW__" className="text-emerald-600 font-bold">+ Add New Category...</option>
                </select>
              </div>

              {/* Custom Category Text Input */}
              {formCategory === "__NEW__" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Special ICU Charges"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Subcategory Name</label>
                <input
                  type="text"
                  placeholder="e.g. Oxygen Cylinder Support (Per Day)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rate (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-semibold text-sm">₹</span>
                  <input
                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    placeholder="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 select-none">
                  Available for selection (Active)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingCharge ? "Update Item" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
