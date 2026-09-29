'use client';

import React, { useState, useEffect, useRef } from "react";
import { adminService } from "@/lib/integrations";
import { UserPlus, Building2, Stethoscope, Briefcase, Search, X, Plus, ChevronDown, Check, Trash2, Edit3, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  PageHeader,
  Card,
  Button
} from "@/components/admin";
import type { Hospital, Doctor } from "@/lib/integrations";

// --- Custom Searchable Select Component ---
const SearchableSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  loading,
  icon: Icon
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  loading?: boolean;
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div 
        onClick={() => !loading && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border ${isOpen ? 'border-primary-theme ring-4 ring-primary-theme/5' : 'border-slate-200'} rounded-2xl cursor-pointer transition-all group`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {Icon && <Icon size={16} className={value ? "text-primary-theme" : "text-slate-400"} />}
          <span className={`text-sm font-bold truncate ${!value ? "text-slate-300" : "text-slate-900"}`}>
            {loading ? "Loading..." : selectedOption?.label || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <X 
              size={14} 
              className="text-slate-300 hover:text-red-500 transition-colors" 
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
            />
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden mt-1"
          >
            <div className="p-3 border-b border-slate-50 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Filter options..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-primary-theme transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div 
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      value === opt.value ? 'bg-primary-theme/10 text-primary-theme' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    {value === opt.value && <Check size={14} />}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-slate-400 italic">No results found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function AssignDoctor() {
  const [formData, setFormData] = useState({
    hospitalId: "",
    doctorId: "",
    specialties: [] as string[],
    consultationFee: ""
  });

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  // Role Specialties CRUD (Frontend only)
  const [predefinedSpecialties, setPredefinedSpecialties] = useState(["Cardiology", "Neurology", "Pediatrics", "Emergency", "OPD", "Gynaecology", "Dermatology"]);
  const [isManagingSpecialties, setIsManagingSpecialties] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [hData, dData] = await Promise.all([
          adminService.getHospitalsClient(),
          adminService.getDoctorsClient()
        ]);

        const normalizedHospitals = Array.isArray(hData) ? hData : (hData as any)?.hospitals || (hData as any)?.data || [];
        const normalizedDoctors = Array.isArray(dData) ? dData : (dData as any)?.users || (dData as any)?.doctors || (dData as any)?.data || [];

        setHospitals(normalizedHospitals);
        setDoctors(normalizedDoctors);
      } catch (err) {
        console.error("Failed to load dependency data", err);
      } finally {
        setFetchingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hospitalId || !formData.doctorId || formData.specialties.length === 0 || !formData.consultationFee) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await adminService.assignDoctorClient({
        hospitalId: formData.hospitalId,
        doctorProfileId: formData.doctorId,
        specialties: formData.specialties,
        consultationFee: Number(formData.consultationFee)
      });
      toast.success("Doctor successfully assigned to hospital!");
      setFormData({ hospitalId: "", doctorId: "", specialties: [], consultationFee: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign doctor");
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (s: string) => {
    if (formData.specialties.includes(s)) {
      setFormData({ ...formData, specialties: formData.specialties.filter(item => item !== s) });
    } else {
      setFormData({ ...formData, specialties: [...formData.specialties, s] });
    }
  };

  const addPredefinedSpecialty = () => {
    if (newSpecialty && !predefinedSpecialties.includes(newSpecialty)) {
      setPredefinedSpecialties([...predefinedSpecialties, newSpecialty]);
      setNewSpecialty("");
    }
  };

  const deletePredefinedSpecialty = (s: string) => {
    setPredefinedSpecialties(predefinedSpecialties.filter(item => item !== s));
    if (formData.specialties.includes(s)) {
      setFormData({ ...formData, specialties: formData.specialties.filter(item => item !== s) });
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Associate Healthcare Staff"
        subtitle="Assign doctors to hospitals with specific roles and fees"
        icon={<Briefcase className="text-indigo-500" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Assignment Configuration" padding="p-8">
          <div className="space-y-8">
            {/* Custom Searchable Selects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SearchableSelect 
                label="Select Hospital"
                placeholder="Choose Hospital"
                value={formData.hospitalId}
                onChange={(val) => setFormData({ ...formData, hospitalId: val })}
                loading={fetchingData}
                icon={Building2}
                options={hospitals.map(h => ({ label: h.name, value: h._id }))}
              />

              <SearchableSelect 
                label="Select Doctor"
                placeholder="Choose Doctor"
                value={formData.doctorId}
                onChange={(val) => setFormData({ ...formData, doctorId: val })}
                loading={fetchingData}
                icon={Stethoscope}
                options={doctors.map(d => ({ 
                  label: `${d.name} (${d.employeeId || d.doctorId || d.medicalRegistrationNumber || 'No ID'})`, 
                  value: d._id 
                }))}
              />
            </div>

            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Building2 className="text-blue-500" size={16} />
              </div>
              <div className="text-xs text-blue-600 font-medium leading-relaxed mt-1">
                Once assigned, the doctor will be able to manage appointments and records for this specific hospital location.
              </div>
            </div>

            {/* Role Specialties Tag System */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Specialties</label>
                <button 
                  type="button"
                  onClick={() => setIsManagingSpecialties(!isManagingSpecialties)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-primary-theme uppercase tracking-wider hover:underline"
                >
                  <Settings2 size={12} />
                  {isManagingSpecialties ? "Finish Managing" : "Manage List"}
                </button>
              </div>

              {isManagingSpecialties && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 italic">Add or remove specialties from the master list...</p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. Oncology"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-primary-theme transition-all"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPredefinedSpecialty())}
                    />
                    <button 
                      type="button"
                      onClick={addPredefinedSpecialty}
                      className="p-2 bg-slate-900 text-white rounded-xl hover:bg-primary-theme transition-colors shadow-lg shadow-slate-900/10"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {predefinedSpecialties.map(s => (
                      <div key={s} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-slate-600">{s}</span>
                        <button type="button" onClick={() => deletePredefinedSpecialty(s)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 min-h-[50px] p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                {predefinedSpecialties.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                      formData.specialties.includes(s)
                        ? 'bg-primary-theme text-white border-primary-theme shadow-primary-theme/20 ring-4 ring-primary-theme/10 scale-105'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {formData.specialties.includes(s) ? <Check size={14} /> : <Plus size={14} className="text-slate-300" />}
                    {s}
                  </button>
                ))}
                
                {formData.specialties.length === 0 && (
                  <p className="text-xs font-bold text-slate-300 italic flex items-center h-full pl-2">
                    Click to select specialties above...
                  </p>
                )}
              </div>
            </div>

            {/* Consultation Fee with restrictions */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Consultation Fee (₹)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none group-focus-within:text-primary-theme transition-colors">₹</div>
                <input 
                  type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                  step="50"
                  placeholder="Eg. 500"
                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-theme/5 focus:border-primary-theme transition-all outline-none font-black text-sm text-slate-900 placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={formData.consultationFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || Number(val) >= 0) {
                      setFormData({ ...formData, consultationFee: val });
                    }
                  }}
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium pl-1 italic">Enter base consultation fee for this doctor at this location.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            icon={<UserPlus size={18} />}
            className="w-full md:w-auto px-16 py-4 rounded-2xl shadow-2xl shadow-primary-theme/20"
          >
            Confirm Assignment
          </Button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(AssignDoctor);
