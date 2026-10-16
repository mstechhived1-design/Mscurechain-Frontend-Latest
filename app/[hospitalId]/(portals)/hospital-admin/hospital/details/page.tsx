"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Save,
  Phone,
  Mail,
  Globe,
  Stethoscope,
  Activity,
  Bed,
  Shield,
  Eye,
  Edit3,
  Truck,
  Layers,
  RefreshCw,
  Star,
  MapPin,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { PageHeader, Card, Button, FormInput, FormTextarea } from '@/components/admin';
import { LogoManager } from '@/components/hospital-admin/LogoManager';
import { ipdService } from '@/lib/integrations/services/ipd.service';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { WhatsAppSettingsHub } from '@/components/WhatsApp/WhatsAppSettingsHub';
import ClockTimePicker from '@/components/ui/ClockTimePicker';

const HospitalDetailsPage = () => {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [formData, setFormData] = useState<any>({});
  const [activeTimePicker, setActiveTimePicker] = useState<'morningStart' | 'morningEnd' | 'eveningStart' | 'eveningEnd' | null>(null);

  const parseTimeToH24 = (timeStr?: string) => {
    if (!timeStr) return { hour24: 9, minute: 0 };
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return { hour24: 9, minute: 0 };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return { hour24: h, minute: m };
  };

  const formatH24To12h = (h24: number, min: number) => {
    const period = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const mm = String(min).padStart(2, '0');
    const hh = String(h12).padStart(2, '0');
    return `${hh}:${mm} ${period}`;
  };

  const handleClockSave = (h24: number, min: number) => {
    if (!activeTimePicker) return;
    const formatted = formatH24To12h(h24, min);
    setFormData((prev: any) => ({
      ...prev,
      [activeTimePicker]: formatted
    }));
    setActiveTimePicker(null);
  };

  const params = useParams();
  const hospitalId = params?.hospitalId as string;

  const fetchHospitalData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[HospitalDetailsPage] Fetching data...");
      const [hRes, beds, meta, staffCounts] = await Promise.all([
        hospitalAdminService.getHospital(),
        ipdService.getBeds(),
        hospitalAdminService.getHospitalMetadata(),
        hospitalAdminService.getHospitalStaffCounts()
      ]);

      console.log("[HospitalDetailsPage] Data received:", { hRes, bedsLen: beds.length, metaRooms: meta.data.rooms?.length, staffCounts });

      const h = hRes.hospital;
      // Enrich hospital with live counts if missing or outdated
      const enrichedHospital: any = {
        ...h,
        totalBeds: beds.length || 0,
        availableBeds: beds.filter((b: any) => b.status === "Vacant").length || 0,
        roomCount: meta.data.rooms?.length || h.roomCount || 0,
        departmentCount: meta.data.departments?.length || h.departmentCount || 0,
        // Use live staff count
        medicalStaffCount: staffCounts.total || 0
      };

      console.log("[HospitalDetailsPage] Enriched Hospital:", enrichedHospital);

      setHospital(enrichedHospital);
      setFormData({
        name: enrichedHospital.name || '',
        address: enrichedHospital.address || '',
        phone: enrichedHospital.phone || '',
        email: enrichedHospital.email || '',
        pincode: enrichedHospital.pincode || '',
        website: enrichedHospital.website || '',
        establishedYear: enrichedHospital.establishedYear || '',
        gstNumber: enrichedHospital.gstNumber || '',
        rating: enrichedHospital.rating || '',
        operatingHours: enrichedHospital.operatingHours || '09:00 AM - 09:00 PM',
        bookingWindowDays: enrichedHospital.appointmentSettings?.bookingWindowDays ?? 10,
        morningStart: enrichedHospital.appointmentSettings?.allowedSessions?.morning?.start || '09:00 AM',
        morningEnd: enrichedHospital.appointmentSettings?.allowedSessions?.morning?.end || '01:00 PM',
        eveningStart: enrichedHospital.appointmentSettings?.allowedSessions?.evening?.start || '05:00 PM',
        eveningEnd: enrichedHospital.appointmentSettings?.allowedSessions?.evening?.end || '09:00 PM',
        ambulanceAvailability: enrichedHospital.ambulanceAvailability || false,
        specialities: enrichedHospital.specialities?.join(', ') || '',
        services: enrichedHospital.services?.join(', ') || '',
        geofenceSettings: enrichedHospital.geofenceSettings || { enabled: false, radiusMeters: 500, excludedPortals: ['hospital-admin'] },
        location: enrichedHospital.location || { lat: 0, lng: 0 },
        opdFollowUpDays: enrichedHospital.opdFollowUpDays ?? 7,
        ipdFollowUpDays: enrichedHospital.ipdFollowUpDays ?? 7,
        enableFollowUpExpiry: enrichedHospital.enableFollowUpExpiry ?? true,
      });
    } catch (error) {
      toast.error("Failed to synchronizing institutional parameters");
      console.error("[HospitalDetailsPage] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitalData();
  }, [fetchHospitalData]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      console.log("[HospitalDetailsPage] Saving form data:", formData);
      const payload = {
        ...formData,
        operatingHours: formData.operatingHours || '09:00 AM - 09:00 PM',
        appointmentSettings: {
          bookingWindowDays: Number(formData.bookingWindowDays) || 10,
          allowedSessions: {
            morning: {
              start: formData.morningStart || '09:00 AM',
              end: formData.morningEnd || '01:00 PM',
              available: true,
            },
            evening: {
              start: formData.eveningStart || '05:00 PM',
              end: formData.eveningEnd || '09:00 PM',
              available: true,
            },
          },
        },
        specialities: typeof formData.specialities === 'string' ? formData.specialities.split(',').map((s: string) => s.trim()).filter(Boolean) : formData.specialities,
        services: typeof formData.services === 'string' ? formData.services.split(',').map((s: string) => s.trim()).filter(Boolean) : formData.services,
        rating: Number(formData.rating) || 0,
        establishedYear: Number(formData.establishedYear) || 0
      };
      await hospitalAdminService.updateHospital(payload);
      toast.success("Institutional profile updated successfully");
      setMode('view');
      fetchHospitalData();
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("[HospitalDetailsPage] Save error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, fetchHospitalData]);

  const handleLogoUpload = async (base64: string) => {
    try {
      console.log("[HospitalDetailsPage] Uploading logo...");
      // Convert base64 to blob
      const res = await fetch(base64);
      const blob = await res.blob();

      const formDataUpload = new FormData();
      formDataUpload.append('logo', blob, 'hospital-logo.png');

      console.log("[HospitalDetailsPage] Calling updateHospital with FormData");
      await hospitalAdminService.updateHospital(formDataUpload as any);
      toast.success("Logo updated successfully");
      fetchHospitalData();
    } catch (error) {
      toast.error("Failed to update logo");
      console.error(error);
    }
  };

  const occupancyRate = useMemo(() => {
    const total = (hospital as any)?.totalBeds || 0;
    if (!total) return 0;
    const available = hospital.availableBeds || 0;
    return Math.min(100, Math.round(((total - available) / total) * 100));
  }, [hospital]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Hospital Data...</p>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 mb-2">
          <Building2 size={32} className="text-rose-400" />
        </div>
        <h3 className="text-sm md:text-lg font-black text-slate-900 tracking-tight">Institutional Link Offline</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center max-w-[280px]">
          Unable to establish secure connection with facility parameters. Please verify network status.
        </p>
        <button
          onClick={fetchHospitalData}
          className="mt-4 px-3 md:px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} /> Retry Handshake
        </button>
      </div>
    );
  }

  const isEdit = mode === 'edit';

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
        
        {/* Top Row: Identification, Process Button, and Stats */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4">
          
          <div className="shrink-0 flex items-center gap-2 px-1">
            <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Building2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                Hospital Profile
              </h1>
              <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                Manage hospital details, contact information, and basic settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto custom-scrollbar">
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setMode('view')}
                className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded shadow-sm text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'view' ? 'text-indigo-600 bg-white' : 'text-gray-400 hover:text-gray-600 bg-transparent shadow-none'}`}
              >
                <Eye size={14} /> View
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded shadow-sm text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'edit' ? 'text-indigo-600 bg-white' : 'text-gray-400 hover:text-gray-600 bg-transparent shadow-none'}`}
              >
                <Edit3 size={14} /> Edit
              </button>
            </div>

            {isEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 md:px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shrink-0 h-[34px] disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Comprehensive Data Matrix */}
        <div className="xl:col-span-8 space-y-8">
          <Card padding="p-0 overflow-hidden">
            {/* Section: Core Identity */}
            <div className="p-2 md:p-4 md:p-8 border-b border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Shield size={16} className="text-primary-theme" />
                    </div>
                    Hospital Information
                  </h3>
                  {!isEdit && (
                    <button
                      onClick={() => setMode('edit')}
                      className="text-[9px] font-black text-primary-theme uppercase tracking-widest hover:underline"
                    >
                      ( Change Branding )
                    </button>
                  )}
                </div>

                <div className="w-full md:w-auto">
                  {isEdit ? (
                    <LogoManager
                      currentLogo={hospital?.logo}
                      onUpload={handleLogoUpload}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {hospital?.logo ? (
                        <img src={hospital.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 size={24} className="text-slate-300" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6 md:gap-x-10 md:gap-y-8">
                <div className="md:col-span-2">
                  <FormInput
                    label="Official Hospital Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Enter hospital name"
                    className={!isEdit ? "bg-transparent border-none p-0 text-xl font-bold text-slate-900" : ""}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormInput
                    label="Physical Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Full street address"
                    className={!isEdit ? "bg-transparent border-none p-0 font-medium text-slate-600" : ""}
                  />
                </div>
                <div>
                  <FormInput
                    label="Pincode / Postal Code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Enter pincode"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
                <div>
                  <FormInput
                    label="GST Number"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="Enter GST number"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
                <div>
                  <FormInput
                    label="Established Year"
                    value={formData.establishedYear}
                    onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                    readOnly={!isEdit}
                    type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Section: Connectivity */}
            <div className="p-2 md:p-4 md:p-8 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone size={16} className="text-blue-600" />
                </div>
                Communication Nodes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                <FormInput
                  label="Contact Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Phone size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
                <FormInput
                  label="Official Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Mail size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
                <FormInput
                  label="Hospital Website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  readOnly={!isEdit}
                  icon={<Globe size={14} className="text-slate-400" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-emerald-600" : "lowercase"}
                />
                <FormInput
                  label="Quality Rating (Scale 1-5)"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  readOnly={!isEdit}
                  type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                  step="0.1"
                  icon={<Star size={14} className="text-amber-500 fill-amber-500" />}
                  className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                />
              </div>
            </div>

            {/* Section: Clinical Capability */}
            <div className="p-2 md:p-4 md:p-8">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Stethoscope size={16} className="text-emerald-600" />
                </div>
                Clinical Expertise
              </h3>

              <div className="space-y-8">
                <FormTextarea
                  label="Medical Specializations"
                  value={formData.specialities}
                  onChange={(e) => setFormData({ ...formData, specialities: e.target.value })}
                  readOnly={!isEdit}
                  rows={3}
                  placeholder="Comma separated list (e.g. Cardiology, Neurology)"
                  className={!isEdit ? "bg-transparent border-none p-0 font-medium text-slate-600" : "uppercase text-[11px]"}
                />
              </div>
            </div>

            {/* Section: Follow-up policy settings */}
            <div className="p-2 md:p-4 md:p-8 border-t border-slate-100 bg-slate-50/20">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Activity size={16} className="text-teal-600" />
                </div>
                Follow-up Consultation Policy Settings
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Enable Token Expiry Validation</h4>
                    <p className="text-xs text-slate-500 mt-1">If disabled, patients return appointments are processed without date boundary checks.</p>
                  </div>
                  {isEdit ? (
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        enableFollowUpExpiry: !formData.enableFollowUpExpiry
                      })}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${formData.enableFollowUpExpiry ? 'bg-teal-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.enableFollowUpExpiry ? 'left-5.2' : 'left-0.5'}`} />
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${formData.enableFollowUpExpiry ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                      {formData.enableFollowUpExpiry ? 'Expiry Enabled' : 'Expiry Disabled'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="OPD Follow-up Window (Days)"
                    value={formData.opdFollowUpDays || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setFormData({ ...formData, opdFollowUpDays: '' as any });
                      } else {
                        const parsed = Number(val);
                        if (parsed > 0) {
                          setFormData({ ...formData, opdFollowUpDays: parsed });
                        }
                      }
                    }}
                    onWheel={(e) => e.preventDefault()}
                    readOnly={!isEdit}
                    type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    placeholder="e.g. 7"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                  <FormInput
                    label="IPD Follow-up Window (Days)"
                    value={formData.ipdFollowUpDays || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setFormData({ ...formData, ipdFollowUpDays: '' as any });
                      } else {
                        const parsed = Number(val);
                        if (parsed > 0) {
                          setFormData({ ...formData, ipdFollowUpDays: parsed });
                        }
                      }
                    }}
                    onWheel={(e) => e.preventDefault()}
                    readOnly={!isEdit}
                    type="number" min={0} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                    placeholder="e.g. 7"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Section: Hospital OPD Working Hours & Public Appointment Engine */}
            <div className="p-2 md:p-4 md:p-8 border-t border-slate-100 bg-emerald-50/20">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Clock size={16} className="text-emerald-700" />
                </div>
                Hospital OPD Operating Hours & Appointment Engine
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Hospital OPD Operating Hours Window"
                    value={formData.operatingHours}
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    readOnly={!isEdit}
                    placeholder="e.g. 09:00 AM - 09:00 PM or 24/7 (Emergency)"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                  <FormInput
                    label="Public Booking Window (Max Days Ahead)"
                    value={formData.bookingWindowDays ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, bookingWindowDays: val === '' ? ('' as any) : Number(val) });
                    }}
                    onWheel={(e) => e.preventDefault()}
                    readOnly={!isEdit}
                    type="number" min={1} max={30}
                    placeholder="e.g. 10"
                    className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                  />
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Institutional Consultation Sessions (Public Booking Portal)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Morning Session */}
                    <div className="space-y-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        Morning Session Slot
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block">Start Time</label>
                          {isEdit ? (
                            <button
                              type="button"
                              onClick={() => setActiveTimePicker('morningStart')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-100 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm group"
                            >
                              <span>{formData.morningStart || '09:00 AM'}</span>
                              <Clock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-sm font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{formData.morningStart || '09:00 AM'}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block">End Time</label>
                          {isEdit ? (
                            <button
                              type="button"
                              onClick={() => setActiveTimePicker('morningEnd')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-100 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm group"
                            >
                              <span>{formData.morningEnd || '01:00 PM'}</span>
                              <Clock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-sm font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{formData.morningEnd || '01:00 PM'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evening Session */}
                    <div className="space-y-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                        Evening Session Slot
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block">Start Time</label>
                          {isEdit ? (
                            <button
                              type="button"
                              onClick={() => setActiveTimePicker('eveningStart')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm group"
                            >
                              <span>{formData.eveningStart || '05:00 PM'}</span>
                              <Clock className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-sm font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{formData.eveningStart || '05:00 PM'}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 mb-1 block">End Time</label>
                          {isEdit ? (
                            <button
                              type="button"
                              onClick={() => setActiveTimePicker('eveningEnd')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm group"
                            >
                              <span>{formData.eveningEnd || '09:00 PM'}</span>
                              <Clock className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-sm font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{formData.eveningEnd || '09:00 PM'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* WhatsApp Settings Configuration Hub */}
          {hospitalId && (
            <div className="mt-8">
              <WhatsAppSettingsHub hospitalId={hospitalId} />
            </div>
          )}
        </div>

        {/* Right Column: Asset Metrics */}
        <div className="xl:col-span-4 space-y-8">
          {/* Bed Occupancy Card */}
          <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-3 md:p-6 md:p-8 text-white relative overflow-hidden group shadow-xl">
            <div className="absolute -right-4 -top-4 p-2 md:p-4 md:p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <Bed size={120} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Capacity Metrics</span>
                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">REALTIME</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-1">
                  <p className="text-5xl sm:text-6xl font-black">{hospital?.totalBeds || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Inpatient Bed Matrix</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Occupancy Status</span>
                    <span className="text-emerald-400">{occupancyRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out"
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">
                      {hospital?.availableBeds || 0} Nodes Available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-rose-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ICU Beds</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital.ICUBeds || 0}</p>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-purple-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Number Of Rooms</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital?.roomCount || 0}</p>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-amber-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Number Of Departments</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital?.departmentCount || 0}</p>
            </div>
            <div className="bg-white p-3 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical Staff</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{hospital?.medicalStaffCount || 0}</p>
            </div>
          </div>

          {/* Emergency Logistics Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${formData.ambulanceAvailability ? 'bg-primary-theme/10 text-primary-theme' : 'bg-slate-100 text-slate-400'}`}>
                <Truck size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Logistics</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className={`font-bold text-sm ${formData.ambulanceAvailability ? 'text-primary-theme' : 'text-slate-500'}`}>
                    {formData.ambulanceAvailability ? 'Fleet Active' : 'Fleet Inactive'}
                  </p>
                  {isEdit && (
                    <button
                      onClick={() => setFormData({ ...formData, ambulanceAvailability: !formData.ambulanceAvailability })}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${formData.ambulanceAvailability ? 'bg-primary-theme' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.ambulanceAvailability ? 'left-5.2' : 'left-0.5'}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Support Services Provided Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-0 transition-all duration-700">
              <Stethoscope size={48} className="text-emerald-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Support Services Provided</span>
              </div>
              <FormTextarea
                label=""
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                readOnly={!isEdit}
                rows={isEdit ? 4 : 2}
                placeholder="Comma separated list (e.g. 24/7 Pharmacy, Lab, Radiology)"
                className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-900 text-sm leading-relaxed" : "uppercase text-[11px]"}
              />
            </div>
          </div>

          {/* Standalone Card: Geofence Security */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <MapPin size={16} className="text-indigo-600" />
                </div>
                Geofence Security
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Enable Geofencing</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Restrict portal access to hospital premises.</p>
                  </div>
                  {isEdit ? (
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        geofenceSettings: {
                          ...formData.geofenceSettings,
                          enabled: !formData.geofenceSettings?.enabled
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${formData.geofenceSettings?.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.geofenceSettings?.enabled ? 'left-5.2' : 'left-0.5'}`} />
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${formData.geofenceSettings?.enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      {formData.geofenceSettings?.enabled ? 'Active' : 'Disabled'}
                    </span>
                  )}
                </div>

                {formData.geofenceSettings?.enabled && (
                  <>
                    <div className="grid grid-cols-1 gap-6">
                      <FormInput
                        label="Premises Radius (Meters)"
                        value={formData.geofenceSettings?.radiusMeters}
                        onChange={(e) => setFormData({
                          ...formData,
                          geofenceSettings: {
                            ...formData.geofenceSettings,
                            radiusMeters: Number(e.target.value) || 0
                          }
                        })}
                        readOnly={!isEdit}
                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                        placeholder="e.g. 500"
                        className={!isEdit ? "bg-transparent border-none p-0 font-bold text-slate-800" : ""}
                      />
                    </div>

                    <div className="mt-6">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Portal Restrictions</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'helpdesk', label: 'Helpdesk' },
                          { id: 'pharmacy', label: 'Pharmacy' },
                          { id: 'lab', label: 'Laboratory' },
                          { id: 'hr', label: 'Human Resources' },
                          { id: 'staff', label: 'General Staff' },
                          { id: 'nurse', label: 'Nurse Station' },
                          { id: 'doctor', label: 'Doctor Terminal' }
                        ].map((portal) => {
                          const isRestricted = formData.geofenceSettings?.restrictedPortals?.includes(portal.id);
                          return (
                            <div key={portal.id} className="flex items-center justify-between p-2 bg-slate-50/30 rounded-xl border border-slate-100">
                              <span className="text-xs font-semibold text-slate-700">{portal.label}</span>
                              {isEdit ? (
                                <button
                                  onClick={() => {
                                    const current = formData.geofenceSettings?.restrictedPortals || [];
                                    const next = current.includes(portal.id) 
                                      ? current.filter((id: string) => id !== portal.id)
                                      : [...current, portal.id];
                                    
                                    setFormData({
                                      ...formData,
                                      geofenceSettings: {
                                        ...formData.geofenceSettings,
                                        restrictedPortals: next
                                      }
                                    });
                                  }}
                                  className={`relative w-9 h-5 rounded-full transition-all duration-300 ${isRestricted ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isRestricted ? 'left-4' : 'left-0.5'}`} />
                                </button>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isRestricted ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                  {isRestricted ? 'Restricted' : 'Open'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Clock Time Picker Modal */}
      {activeTimePicker && (
        <ClockTimePicker
          isOpen={true}
          initialHour24={parseTimeToH24(formData[activeTimePicker]).hour24}
          initialMinute={parseTimeToH24(formData[activeTimePicker]).minute}
          onSave={handleClockSave}
          onClose={() => setActiveTimePicker(null)}
        />
      )}
    </div>
  );
};

export default HospitalDetailsPage;
