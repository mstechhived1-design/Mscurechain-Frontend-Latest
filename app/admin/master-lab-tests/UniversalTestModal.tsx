"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { UniversalLabTest, UniversalTestParameter } from "@/lib/integrations/services/universalLabService";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UniversalLabTest>) => Promise<void>;
  initialData?: UniversalLabTest | null;
}

const DEPARTMENTS = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Pathology",
  "Immunology",
  "Serology",
  "Clinical Pathology",
  "Molecular Biology",
  "Cytology",
  "Others"
];

export default function UniversalTestModal({ isOpen, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<Partial<UniversalLabTest>>({
    testCode: "",
    testName: "",
    departmentName: "Hematology",
    suggestedPrice: 0,
    isActive: true,
    displayOrder: 0,
    resultType: "numeric",
    sampleType: "",
    methodology: "",
    turnaroundTime: "",
    parameters: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        testCode: "",
        testName: "",
        departmentName: "Hematology",
        suggestedPrice: 0,
        isActive: true,
        displayOrder: 0,
        resultType: "numeric",
        sampleType: "",
        methodology: "",
        turnaroundTime: "",
        parameters: []
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testCode || !formData.testName) {
      toast.error("Test code and name are required");
      return;
    }
    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [
        ...(prev.parameters || []),
        { name: "", inputType: "number", displayOrder: (prev.parameters?.length || 0) } as UniversalTestParameter
      ]
    }));
  };

  const updateParameter = (index: number, field: keyof UniversalTestParameter, value: any) => {
    setFormData(prev => {
      const newParams = [...(prev.parameters || [])];
      newParams[index] = { ...newParams[index], [field]: value };
      return { ...prev, parameters: newParams };
    });
  };

  const removeParameter = (index: number) => {
    setFormData(prev => {
      const newParams = [...(prev.parameters || [])];
      newParams.splice(index, 1);
      return { ...prev, parameters: newParams };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border-theme flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border-theme">
          <h2 className="text-xl font-black text-foreground">
            {initialData ? "Edit Universal Test" : "Add Universal Test"}
          </h2>
          <button onClick={onClose} className="p-2 text-muted hover:bg-muted/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="universal-test-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Details */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4 border-b border-border-theme pb-2">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Test Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.testCode}
                    onChange={e => setFormData({ ...formData, testCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="e.g. CBC-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Test Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.testName}
                    onChange={e => setFormData({ ...formData, testName: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Complete Blood Count"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Department *</label>
                  <select
                    value={formData.departmentName}
                    onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-500 mb-1">Suggested Price (₹) *</label>
                  <input
                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    required
                    value={formData.suggestedPrice}
                    onChange={e => setFormData({ ...formData, suggestedPrice: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Sample Type</label>
                  <input
                    type="text"
                    value={formData.sampleType}
                    onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Blood, Urine"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Result Type</label>
                  <select
                    value={formData.resultType}
                    onChange={e => setFormData({ ...formData, resultType: e.target.value as any })}
                    className="w-full px-4 py-2 bg-background border border-border-theme rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="numeric">Numeric Value</option>
                    <option value="text">Text/Descriptive</option>
                    <option value="boolean">Positive/Negative</option>
                    <option value="multiple">Multiple Parameters (Profile)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Parameters (If multiple) */}
            {formData.resultType === 'multiple' && (
              <div>
                <div className="flex items-center justify-between border-b border-border-theme pb-2 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Test Parameters</h3>
                  <button
                    type="button"
                    onClick={addParameter}
                    className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Parameter
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.parameters?.map((param, index) => (
                    <div key={index} className="flex gap-3 items-start bg-muted/5 p-3 rounded-xl border border-border-theme relative group">
                      <div className="mt-2 text-muted cursor-move">
                        <GripVertical size={16} />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Parameter Name (e.g. Hemoglobin)"
                            value={param.name}
                            onChange={e => updateParameter(index, "name", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background border border-border-theme rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <select
                            value={param.inputType || "number"}
                            onChange={e => updateParameter(index, "inputType", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background border border-border-theme rounded-lg text-sm"
                          >
                            <option value="number">Numeric</option>
                            <option value="text">Text</option>
                            <option value="boolean">Pos/Neg</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Unit (e.g. g/dL)"
                            value={param.unit || ""}
                            onChange={e => updateParameter(index, "unit", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background border border-border-theme rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            placeholder="Reference Range (e.g. 13.0 - 17.0)"
                            value={param.referenceRange || ""}
                            onChange={e => updateParameter(index, "referenceRange", e.target.value)}
                            className="w-full px-3 py-1.5 bg-background border border-border-theme rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeParameter(index)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors mt-0.5 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!formData.parameters || formData.parameters.length === 0) && (
                    <div className="text-center py-6 text-sm text-muted bg-muted/5 rounded-xl border border-dashed border-border-theme">
                      No parameters added. Click "Add Parameter" to start building this profile.
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-border-theme flex items-center justify-end gap-3 bg-muted/5">
          <label className="flex items-center gap-2 mr-auto cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-border-theme text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Active Test</span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold text-foreground hover:bg-muted/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="universal-test-form"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
