"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import { apiClient } from "@/lib/integrations/api/apiClient";
import { HOSPITAL_ADMIN_ENDPOINTS } from "@/lib/integrations/config/endpoints";
import toast from "react-hot-toast";
import PackageForm from "./components/PackageForm";

interface IPackage {
  _id: string;
  name: string;
  description: string;
  totalPrice: number;
  breakdown: {
    doctorFees: number;
    labCharges: number;
    pharmacyCharges: number;
    radiologyCharges: number;
    roomCharges: number;
    otherCharges: number;
  };
  isActive: boolean;
}

export default function PackagesManagement() {
  const [packages, setPackages] = useState<IPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<IPackage | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await apiClient<{ success: boolean; data: IPackage[] }>(
        HOSPITAL_ADMIN_ENDPOINTS.PACKAGES
      );
      if (res.success) {
        setPackages(res.data);
      }
    } catch (error) {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (pkgId: string) => {
    try {
      const res = await apiClient<{ success: boolean }>(
        HOSPITAL_ADMIN_ENDPOINTS.PACKAGE_STATUS(pkgId),
        { method: "PATCH" }
      );
      if (res.success) {
        toast.success("Package status updated");
        fetchPackages();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (pkgId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await apiClient<{ success: boolean }>(
        HOSPITAL_ADMIN_ENDPOINTS.PACKAGE_DETAIL(pkgId),
        { method: "DELETE" }
      );
      if (res.success) {
        toast.success("Package deleted successfully");
        fetchPackages();
      }
    } catch (error) {
      toast.error("Failed to delete package");
    }
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        <div className="shrink-0 flex items-center gap-2 px-1">
          <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600">
            <Package className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
              Hospital Packages
            </h1>
            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
              Manage surgery and care packages
            </p>
          </div>
        </div>

        {/* Search Bar - Takes remaining width */}
        <div className="relative flex-1 w-full xl:w-auto xl:mx-8">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search packages..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
          <button
            onClick={() => {
              setEditingPackage(null);
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 w-full xl:w-auto px-3 md:px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shrink-0 h-[34px] shadow-sm"
          >
            <Plus size={14} className="shrink-0" /> Create Package
          </button>
        </div>
        
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div key={pkg._id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                      pkg.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {pkg.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">₹{Math.round(pkg.totalPrice).toLocaleString()}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 flex-grow">{pkg.description}</p>

              <div className="space-y-2 mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase">Breakdown</div>
                {[
                  { key: "doctorFees", label: "Doctor", color: "#2563eb" },
                  { key: "labCharges", label: "Lab", color: "#059669" },
                  { key: "pharmacyCharges", label: "Pharma", color: "#d97706" },
                  { key: "radiologyCharges", label: "Radiology", color: "#7c3aed" },
                  { key: "roomCharges", label: "Room", color: "#dc2626" },
                  { key: "otherCharges", label: "Other", color: "#6b7280" },
                ].filter(c => (pkg.breakdown as any)[c.key] > 0).map(c => {
                  const items = (pkg as any).breakdownItems?.[c.key] || [];
                  return (
                    <div key={c.key} className="text-xs">
                      <div className="flex justify-between items-center font-semibold" style={{ color: c.color }}>
                        <span>{c.label}</span>
                        <span>₹{(pkg.breakdown as any)[c.key]?.toLocaleString()}</span>
                      </div>
                      {items.length > 0 && (
                        <div className="ml-3 mt-1 space-y-0.5">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-gray-500">
                              <span className="truncate mr-2">{item.name}</span>
                              <span className="text-gray-700 font-medium whitespace-nowrap">₹{item.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t mt-auto">
                <button
                  onClick={() => handleToggleStatus(pkg._id)}
                  className="flex-1 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50"
                >
                  {pkg.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    setEditingPackage(pkg);
                    setIsFormOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pkg._id)}
                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredPackages.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed">
              No packages found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <PackageForm
          initialData={editingPackage}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchPackages();
          }}
        />
      )}
    </div>
  );
}
