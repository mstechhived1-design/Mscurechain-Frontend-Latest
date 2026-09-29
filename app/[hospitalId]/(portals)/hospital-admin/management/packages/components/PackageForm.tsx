"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/integrations/api/apiClient";
import { HOSPITAL_ADMIN_ENDPOINTS } from "@/lib/integrations/config/endpoints";
import toast from "react-hot-toast";

interface BreakdownItem {
  name: string;
  amount: number;
  testId?: string;
}

type CategoryKey = "doctorFees" | "labCharges" | "pharmacyCharges" | "radiologyCharges" | "roomCharges" | "otherCharges";

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  color: string;
  bgColor: string;
  placeholder: string;
  searchable?: boolean; // lab tests are searchable
}

const CATEGORIES: CategoryConfig[] = [
  { key: "doctorFees", label: "Doctor Fees", color: "#2563eb", bgColor: "#eff6ff", placeholder: "e.g., Surgeon Fee, Anesthesia Fee" },
  { key: "labCharges", label: "Lab Charges", color: "#059669", bgColor: "#ecfdf5", placeholder: "Search existing lab tests...", searchable: true },
  { key: "pharmacyCharges", label: "Pharmacy Charges", color: "#d97706", bgColor: "#fffbeb", placeholder: "e.g., IV Fluids, Antibiotics Kit" },
  { key: "radiologyCharges", label: "Radiology Charges", color: "#7c3aed", bgColor: "#f5f3ff", placeholder: "e.g., X-Ray, CT Scan, MRI" },
  { key: "roomCharges", label: "Room/Bed Charges", color: "#dc2626", bgColor: "#fef2f2", placeholder: "e.g., General Ward 3 Days, ICU 1 Day" },
  { key: "otherCharges", label: "Other/Misc Charges", color: "#6b7280", bgColor: "#f9fafb", placeholder: "e.g., OT Charges, Dressing Kit" },
];

interface IPackageFormProps {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PackageForm({ initialData, onClose, onSuccess }: IPackageFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isActive, setIsActive] = useState(initialData?.isActive !== false);

  // Category toggles & items
  const [enabledCategories, setEnabledCategories] = useState<Record<CategoryKey, boolean>>(() => {
    const defaults: Record<CategoryKey, boolean> = {
      doctorFees: false, labCharges: false, pharmacyCharges: false,
      radiologyCharges: false, roomCharges: false, otherCharges: false,
    };
    if (initialData?.breakdownItems) {
      for (const key of Object.keys(defaults) as CategoryKey[]) {
        if (initialData.breakdownItems[key]?.length > 0) defaults[key] = true;
      }
    } else if (initialData?.breakdown) {
      for (const key of Object.keys(defaults) as CategoryKey[]) {
        if ((initialData.breakdown as any)[key] > 0) defaults[key] = true;
      }
    }
    return defaults;
  });

  const [categoryItems, setCategoryItems] = useState<Record<CategoryKey, BreakdownItem[]>>(() => {
    const defaults: Record<CategoryKey, BreakdownItem[]> = {
      doctorFees: [], labCharges: [], pharmacyCharges: [],
      radiologyCharges: [], roomCharges: [], otherCharges: [],
    };
    if (initialData?.breakdownItems) {
      for (const key of Object.keys(defaults) as CategoryKey[]) {
        if (initialData.breakdownItems[key]?.length > 0) {
          defaults[key] = initialData.breakdownItems[key].map((i: any) => ({
            name: i.name, amount: i.amount, testId: i.testId
          }));
        }
      }
    } else if (initialData?.breakdown) {
      // Legacy: convert flat number to a single item
      for (const key of Object.keys(defaults) as CategoryKey[]) {
        const val = (initialData.breakdown as any)[key];
        if (val > 0) {
          const cat = CATEGORIES.find(c => c.key === key);
          defaults[key] = [{ name: cat?.label || key, amount: val }];
        }
      }
    }
    return defaults;
  });

  // Generalized Search & Catalogs
  const [catalogs, setCatalogs] = useState<Record<CategoryKey, any[]>>({
    doctorFees: [], labCharges: [], pharmacyCharges: [],
    radiologyCharges: [], roomCharges: [], otherCharges: [],
  });
  const [searches, setSearches] = useState<Record<CategoryKey, string>>({
    doctorFees: "", labCharges: "", pharmacyCharges: "",
    radiologyCharges: "", roomCharges: "", otherCharges: "",
  });
  const [activeDropdown, setActiveDropdown] = useState<CategoryKey | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline add form states per category
  const [inlineNames, setInlineNames] = useState<Record<CategoryKey, string>>({
    doctorFees: "", labCharges: "", pharmacyCharges: "",
    radiologyCharges: "", roomCharges: "", otherCharges: "",
  });
  const [inlineAmounts, setInlineAmounts] = useState<Record<CategoryKey, string>>({
    doctorFees: "", labCharges: "", pharmacyCharges: "",
    radiologyCharges: "", roomCharges: "", otherCharges: "",
  });

  useEffect(() => {
    const fetchAllCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [labRes, docRes, rxRes, roomRes] = await Promise.allSettled([
          apiClient("/hospital/lab-tests-catalog").catch(() => apiClient("/lab/tests")),
          apiClient("/hospital/users?role=doctor"),
          apiClient("/pharmacy/products"),
          apiClient("/ipd/beds/rooms"),
        ]);

        const newCatalogs = {
          doctorFees: [] as any[], labCharges: [] as any[], pharmacyCharges: [] as any[],
          radiologyCharges: [] as any[], roomCharges: [] as any[], otherCharges: [] as any[],
        };

        if (labRes.status === 'fulfilled') {
          const d: any = labRes.value;
          const labs = d?.tests || d?.data || d || [];
          newCatalogs.labCharges = Array.isArray(labs) ? labs.map((t: any) => ({ _id: t._id, name: t.name, subtitle: t.category || 'Lab', price: t.price || 0 })) : [];
        }
        if (docRes.status === 'fulfilled') {
          const d: any = docRes.value;
          // Look for users array in various possible nested structures
          const docs = d?.users || d?.data?.users || d?.data || d || [];
          newCatalogs.doctorFees = Array.isArray(docs) ? docs.map((t: any) => ({ _id: t._id, name: t.name, subtitle: t.specialization || t.department || 'Doctor', price: t.consultationFee || 0 })) : [];
        }
        if (rxRes.status === 'fulfilled') {
          const d: any = rxRes.value;
          const rxs = d?.data?.docs || d?.docs || d?.data || d || [];
          newCatalogs.pharmacyCharges = Array.isArray(rxs) ? rxs.map((t: any) => ({ _id: t._id, name: t.name, subtitle: t.category || 'Medicine', price: t.mrp || t.price || 0 })) : [];
        }
        if (roomRes.status === 'fulfilled') {
          const d: any = roomRes.value;
          const rms = d?.rooms || d?.data?.rooms || d?.data || d || [];
          newCatalogs.roomCharges = Array.isArray(rms) ? rms.map((t: any) => ({ _id: t._id, name: t.type || t.roomId || t.name || 'Room', subtitle: t.floor || t.ward || 'Room', price: t.pricePerDay || t.price || 0 })) : [];
        }
        
        // Mock some radiology/other data if empty to allow search UX to work
        newCatalogs.radiologyCharges = [
          { _id: 'rad1', name: 'X-Ray Chest PA', subtitle: 'Radiology', price: 500 },
          { _id: 'rad2', name: 'MRI Brain', subtitle: 'Radiology', price: 6500 },
          { _id: 'rad3', name: 'CT Scan Abdomen', subtitle: 'Radiology', price: 4000 },
          { _id: 'rad4', name: 'USG Whole Abdomen', subtitle: 'Radiology', price: 1200 },
        ];
        newCatalogs.otherCharges = [
          { _id: 'oth1', name: 'OT Charges', subtitle: 'Misc', price: 10000 },
          { _id: 'oth2', name: 'Dressing Charges', subtitle: 'Misc', price: 300 },
          { _id: 'oth3', name: 'Nursing Charges (Per Day)', subtitle: 'Misc', price: 1000 },
          { _id: 'oth4', name: 'Diet/Food Charges', subtitle: 'Misc', price: 500 },
        ];

        setCatalogs(newCatalogs);
      } catch (e) {
        console.error("Failed to load catalogs", e);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    fetchAllCatalogs();
  }, []);

  // Discount States
  const [discountType, setDiscountType] = useState<"percentage" | "flat">(
    initialData?.discountAmount && !initialData?.discountPercentage ? "flat" : "percentage"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initialData?.discountAmount && !initialData?.discountPercentage 
      ? initialData.discountAmount.toString() 
      : (initialData?.discountPercentage ? initialData.discountPercentage.toString() : "")
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Computed totals
  const getCategoryTotal = (key: CategoryKey) =>
    enabledCategories[key] ? categoryItems[key].reduce((s, i) => s + i.amount, 0) : 0;

  const subtotalPrice = Math.round(CATEGORIES.reduce((s, c) => s + getCategoryTotal(c.key), 0));

  const parsedDiscount = parseFloat(discountValue) || 0;
  const discountAmount = Math.round(discountType === "percentage" ? (subtotalPrice * parsedDiscount / 100) : parsedDiscount);
  const finalPrice = Math.max(0, subtotalPrice - discountAmount);

  const toggleCategory = (key: CategoryKey) => {
    setEnabledCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addItem = (key: CategoryKey, item: BreakdownItem) => {
    setCategoryItems(prev => ({ ...prev, [key]: [...prev[key], item] }));
  };

  const removeItem = (key: CategoryKey, index: number) => {
    setCategoryItems(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const addInlineItem = (key: CategoryKey) => {
    const itemName = inlineNames[key].trim();
    const itemAmount = parseFloat(inlineAmounts[key]);
    if (!itemName) return toast.error("Enter item name");
    if (!itemAmount || itemAmount <= 0) return toast.error("Enter valid amount");
    addItem(key, { name: itemName, amount: itemAmount });
    setInlineNames(prev => ({ ...prev, [key]: "" }));
    setInlineAmounts(prev => ({ ...prev, [key]: "" }));
  };

  const getFilteredItems = (key: CategoryKey) => {
    const term = searches[key]?.toLowerCase() || "";
    if (term.length < 1) return [];
    return catalogs[key].filter((t: any) =>
      t.name?.toLowerCase().includes(term) ||
      t.subtitle?.toLowerCase().includes(term)
    ).slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Package name is required");
    if (subtotalPrice <= 0) return toast.error("Add at least one item to a category");

    // Build breakdown totals
    const breakdown: Record<string, number> = {};
    const breakdownItems: Record<string, BreakdownItem[]> = {};
    for (const cat of CATEGORIES) {
      breakdown[cat.key] = getCategoryTotal(cat.key);
      breakdownItems[cat.key] = enabledCategories[cat.key] ? categoryItems[cat.key] : [];
    }

    try {
      setLoading(true);
      const endpoint = initialData
        ? HOSPITAL_ADMIN_ENDPOINTS.PACKAGE_DETAIL(initialData._id)
        : HOSPITAL_ADMIN_ENDPOINTS.PACKAGES;

      const payload = {
        name: name.trim(),
        description: description.trim(),
        totalPrice: finalPrice,
        discountPercentage: discountType === 'percentage' ? parsedDiscount : undefined,
        discountAmount: discountType === 'flat' ? parsedDiscount : undefined,
        breakdown,
        breakdownItems,
        isActive,
      };

      const res = await apiClient<{ success: boolean }>(endpoint, {
        method: initialData ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        toast.success(initialData ? "Package updated!" : "Package created!");
        onSuccess();
      } else {
        toast.error("Failed to save package");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>{initialData ? "Edit Package" : "Create Package"}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {/* Name & Description */}
          <div style={styles.field}>
            <label style={styles.label}>Package Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={styles.input}
              placeholder="e.g., General Surgery Package"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ ...styles.input, resize: "vertical" as any }}
              placeholder="Brief description of what's included..."
            />
          </div>

          {/* Category Toggles */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>
              Package Items
            </div>

            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{ marginBottom: 12, borderRadius: 14, border: `1px solid ${enabledCategories[cat.key] ? cat.color + '40' : '#e2e8f0'}`, overflow: "hidden", transition: "all 0.2s" }}>
                {/* Toggle Header */}
                <div
                  onClick={() => toggleCategory(cat.key)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", cursor: "pointer", userSelect: "none" as const,
                    background: enabledCategories[cat.key] ? cat.bgColor : "#fafafa",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Toggle Switch */}
                    <div style={{
                      width: 40, height: 22, borderRadius: 11,
                      background: enabledCategories[cat.key] ? cat.color : "#d1d5db",
                      position: "relative" as const, transition: "background 0.2s",
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", background: "white",
                        position: "absolute" as const, top: 2,
                        left: enabledCategories[cat.key] ? 20 : 2,
                        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: enabledCategories[cat.key] ? cat.color : "#94a3b8" }}>
                      {cat.label}
                    </span>
                  </div>
                  {enabledCategories[cat.key] && categoryItems[cat.key].length > 0 && (
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: cat.color }}>
                      ₹{getCategoryTotal(cat.key).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Expanded Content */}
                {enabledCategories[cat.key] && (
                  <div style={{ padding: "12px 16px", background: "white", borderTop: `1px solid ${cat.color}20` }}>
                    {/* Existing Items */}
                    {categoryItems[cat.key].map((item, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                        background: cat.bgColor, borderRadius: 10, marginBottom: 6,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                            {item.name}
                          </div>
                          {item.testId && <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Catalog Item</div>}
                        </div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: cat.color, whiteSpace: "nowrap" as const }}>
                          ₹{item.amount.toLocaleString()}
                        </div>
                        <button type="button" onClick={() => removeItem(cat.key, idx)} style={{
                          background: "none", border: "none", cursor: "pointer", color: "#ef4444",
                          padding: 4, borderRadius: 6, display: "flex",
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Catalog Search */}
                    <div style={{ position: "relative" as const, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                        <input
                          type="text"
                          value={searches[cat.key]}
                          onChange={e => {
                            setSearches(prev => ({ ...prev, [cat.key]: e.target.value }));
                            setActiveDropdown(cat.key);
                          }}
                          onFocus={() => {
                            if (searches[cat.key].length >= 1) setActiveDropdown(cat.key);
                          }}
                          placeholder={`Search ${cat.label.toLowerCase()}...`}
                          style={{ flex: 1, border: "none", background: "transparent", fontSize: "0.8rem", outline: "none", color: "#0f172a" }}
                        />
                        {loadingCatalogs && <Loader2 size={14} className="animate-spin" style={{ color: cat.color }} />}
                      </div>
                      
                      {activeDropdown === cat.key && getFilteredItems(cat.key).length > 0 && (
                        <div ref={dropdownRef} style={{
                          position: "absolute" as const, top: "100%", left: 0, right: 0, marginTop: 4,
                          background: "white", borderRadius: 10, border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 200, overflowY: "auto" as const,
                        }}>
                          {getFilteredItems(cat.key).map((test: any) => (
                            <div
                              key={test._id}
                              onClick={() => {
                                addItem(cat.key, { name: test.name, amount: test.price || 0, testId: test._id });
                                setSearches(prev => ({ ...prev, [cat.key]: "" }));
                                setActiveDropdown(null);
                                toast.success(`Added: ${test.name}`);
                              }}
                              style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "8px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                                fontSize: "0.8rem", transition: "background 0.1s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = cat.bgColor)}
                              onMouseLeave={e => (e.currentTarget.style.background = "white")}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{test.name}</div>
                                <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{test.subtitle}</div>
                              </div>
                              <span style={{ fontWeight: 700, color: cat.color }}>₹{test.price?.toLocaleString() || 0}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Item Inline */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        value={inlineNames[cat.key]}
                        onChange={e => setInlineNames(prev => ({ ...prev, [cat.key]: e.target.value }))}
                        placeholder={cat.placeholder}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none", background: "#f8fafc" }}
                      />
                      <div style={{ position: "relative" as const, width: 100 }}>
                        <span style={{ position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.78rem", pointerEvents: "none" as const }}>₹</span>
                        <input
                          type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                          value={inlineAmounts[cat.key]}
                          onChange={e => setInlineAmounts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                          placeholder="0"
                          style={{ width: "100%", padding: "8px 10px 8px 24px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none", background: "#f8fafc" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addInlineItem(cat.key)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 34, height: 34, borderRadius: 8, border: "none",
                          background: cat.color, color: "white", cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Discount & Total */}
          <div style={{
            background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
            borderRadius: 12, marginTop: 12, border: "1px solid #e2e8f0", overflow: "hidden"
          }}>
            {/* Discount Row */}
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed #cbd5e1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#475569" }}>Discount</span>
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 6, padding: 2 }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    style={{
                      border: "none", background: discountType === "percentage" ? "white" : "transparent",
                      color: discountType === "percentage" ? "#0f172a" : "#64748b",
                      padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, borderRadius: 4, cursor: "pointer",
                      boxShadow: discountType === "percentage" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    style={{
                      border: "none", background: discountType === "flat" ? "white" : "transparent",
                      color: discountType === "flat" ? "#0f172a" : "#64748b",
                      padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, borderRadius: 4, cursor: "pointer",
                      boxShadow: discountType === "flat" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                  >₹</button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder="0"
                  max={discountType === "percentage" ? "100" : undefined}
                  style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", textAlign: "right" }}
                />
              </div>
            </div>

            {/* Subtotal Row (only show if discount exists) */}
            {discountAmount > 0 && (
              <div style={{ padding: "8px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#64748b" }}>Subtotal</span>
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#64748b", textDecoration: "line-through" }}>₹{subtotalPrice.toLocaleString()}</span>
              </div>
            )}

            {/* Final Price Row */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", background: "linear-gradient(135deg, #eff6ff, #e0f2fe)",
            }}>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e40af" }}>Final Package Price</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: "1.3rem", color: "#1e40af" }}>₹{finalPrice.toLocaleString()}</div>
                {discountAmount > 0 && (
                  <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>Saved ₹{discountAmount.toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#2563eb" }}
            />
            <label htmlFor="isActive" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
              Active (Available for billing)
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...styles.saveBtn, opacity: loading ? 0.6 : 1 }}>
              <Save size={14} />
              {loading ? "Saving..." : "Save Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
  },
  modal: {
    background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px", borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: { fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
    padding: 6, borderRadius: 8, display: "flex",
  },
  body: { padding: "20px 24px", overflowY: "auto", flex: 1 },
  field: { marginBottom: 14 },
  label: {
    display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
  },
  input: {
    width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 10,
    fontSize: "0.85rem", fontWeight: 500, color: "#0f172a", background: "#f8fafc",
    outline: "none", transition: "all 0.2s",
  },
  cancelBtn: {
    padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0",
    background: "white", color: "#64748b", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
  },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 20px", borderRadius: 10, border: "none",
    background: "#2563eb", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
  },
};
