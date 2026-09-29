'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Activity,
    Pill,
    ClipboardList,
    User,
    MapPin,
    Heart,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Table as TableIcon
} from 'lucide-react';
import { ipdService, staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';
import VitalsEntryModal from '../components/VitalsEntryModal';
import ClinicalNotesModal from '../components/ClinicalNotesModal';
import MedicationAdministrationModal from '../components/MedicationAdministrationModal';
import AddClinicalChargeModal from '@/components/ipd/AddClinicalChargeModal';

// Helper to calculate age from DOB
const calculateAge = (dob: any) => {
    if (!dob) return "N/A";
    try {
        const birthDate = new Date(dob.$date || dob);
        if (isNaN(birthDate.getTime())) return "N/A";
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? `${age} Yrs` : "N/A";
    } catch (e) {
        return "N/A";
    }
};

// Helper to format gender
const formatGender = (gender: string | undefined) => {
    if (!gender) return 'Unknown';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
};

// Sub-components moved to top for proper hoisting and build stability
function StatCard({ icon, label, value }: any) {
    return (
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
            <div className="shrink-0">{icon}</div>
            <div>
                <p className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-[10px] sm:text-xs lg:text-sm font-black text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
}

function VitalChip({ label, value, unit, status }: any) {
    const isCritical = status === 'Critical';
    const isWarning = status === 'Warning';

    return (
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${isCritical ? 'bg-rose-50 border-rose-200 text-rose-700' :
            isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
            <span className="text-slate-400 uppercase tracking-wider text-[8px]">{label}</span>
            <span>{value}{unit}</span>
        </div>
    );
}

function VitalItem({ icon, label, value }: any) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
                {icon}
                <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] sm:text-xs font-black text-slate-900">{value}</span>
        </div>
    );
}

export default function PatientMonitoringPage() {
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
    const [isVitalsOpen, setIsVitalsOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isMedsOpen, setIsMedsOpen] = useState(false);
    const [selectedAdmissionForCharge, setSelectedAdmissionForCharge] = useState<string | null>(null);
    const [nurseDept, setNurseDept] = useState<string | string[] | null>(null);
    const apiLimit = 10;

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    const fetchAdmissions = async (silent: boolean = false) => {
        try {
            if (!silent) setLoading(true);
            const profileData = await staffService.getProfile();
            const dept = profileData.staff.department;
            setNurseDept(dept || null);

            // Handle both single department string and multiple departments array
            const deptParam = Array.isArray(dept) ? dept.filter(Boolean).join(',') : (dept || undefined);
            const data = await ipdService.getActiveAdmissions(deptParam);
            console.log("Nurse Dashboard Admission Data Analysis:", data);

            const activeAdmissions = data.filter((adm: any) => adm.status !== 'Discharged');
            setAdmissions(activeAdmissions);
        } catch (e) {
            toast.error("Failed to load patient data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmissions();
    }, []);

    const filteredAdmissions = admissions.filter(adm =>
        adm.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adm.admissionId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredAdmissions.length / apiLimit);
    const paginatedAdmissions = filteredAdmissions.slice(
        (currentPage - 1) * apiLimit,
        currentPage * apiLimit
    );

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Loading Patient Registry...</p>
                </div>
            </div>
        );
    }

    const TableView = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">Patient Details</th>
                            <th className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">Location</th>
                            <th className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Doctor</th>
                            <th className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedAdmissions.length > 0 ? (
                            paginatedAdmissions.map((adm) => {
                                const patient = adm.patient || {};
                                const profile = adm.patientProfile || {};
                                const dob = patient.dateOfBirth || profile.dob || profile.dateOfBirth;
                                const ageDisplay = calculateAge(dob);
                                const genderDisplay = formatGender(patient.gender || profile.gender);
                                const mrnDisplay = patient.mrn || profile.mrn || adm.admissionId || 'N/A';

                                return (
                                    <tr key={adm._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-2 sm:px-4 py-2 sm:py-2.5">
                                            <div className="flex items-center gap-1.5 sm:gap-3">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[9px] sm:text-xs shadow-sm">
                                                    {patient.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                                                        {patient.name || 'Unknown'}
                                                    </h3>
                                                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                                                        <span className={`text-[7px] sm:text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest ${genderDisplay === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {ageDisplay} &bull; {genderDisplay}
                                                        </span>
                                                        <span className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[150px]">
                                                            ID: {mrnDisplay}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-2.5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 w-fit">
                                                    {adm.bed?.type || 'Standard'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <MapPin size={8} className="text-slate-400 sm:text-[10px]" />
                                                    <span className="text-[9px] sm:text-xs font-bold uppercase tracking-tight whitespace-nowrap">
                                                        {adm.bed?.room ? `R-${adm.bed.room}` : 'No Room'}
                                                    </span>
                                                    <span className="px-1 py-0.5 bg-slate-100 rounded text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                        B-{adm.bed?.bedId || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-2.5">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-700">
                                                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                                                    <User size={10} />
                                                </div>
                                                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-tight text-indigo-600 truncate max-w-[180px]">
                                                    {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-2.5">
                                            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                                <button onClick={() => { setSelectedAdmission(adm); setIsVitalsOpen(true); }} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-400 rounded-lg transition-all shadow-sm">
                                                    <Activity size={12} className="sm:size-[14px]" />
                                                </button>
                                                <button onClick={() => { setSelectedAdmission(adm); setIsMedsOpen(true); }} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 text-slate-400 rounded-lg transition-all shadow-sm">
                                                    <Pill size={12} className="sm:size-[14px]" />
                                                </button>
                                                <button onClick={() => { setSelectedAdmission(adm); setIsNotesOpen(true); }} className="p-1.5 sm:p-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-400 rounded-lg transition-all shadow-sm">
                                                    <ClipboardList size={12} className="sm:size-[14px]" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4}>
                                    <NoDataFound />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const GridView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
            {paginatedAdmissions.length > 0 ? (
                paginatedAdmissions.map((adm) => {
                    const patient = adm.patient || {};
                    const profile = adm.patientProfile || {};
                    const dob = patient.dateOfBirth || profile.dob || profile.dateOfBirth;
                    const ageDisplay = calculateAge(dob);
                    const genderDisplay = formatGender(patient.gender || profile.gender);
                    const mrnDisplay = patient.mrn || profile.mrn || adm.admissionId || 'N/A';

                    return (
                        <div key={adm._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shadow-sm">
                                        {patient.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{patient.name || 'Unknown'}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ageDisplay} • {genderDisplay}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">
                                        Room {adm.bed?.room || '-'}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">ID: {mrnDisplay}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Bed</p>
                                    <p className="text-xs font-bold text-slate-900">{adm.bed?.bedId || 'N/A'}</p>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doctor</p>
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-tight">
                                        {adm.primaryDoctor?.user?.name || adm.primaryDoctor?.name || 'Unassigned'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedAdmission(adm); setIsVitalsOpen(true); }} className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all">
                                    Vitals
                                </button>
                                <button onClick={() => { setSelectedAdmission(adm); setIsMedsOpen(true); }} className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all">
                                    Meds
                                </button>
                                <button onClick={() => { setSelectedAdmission(adm); setIsNotesOpen(true); }} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all">
                                    Notes
                                </button>
                            </div>
                        </div>
                    );
                })
            ) : <NoDataFound />}
        </div>
    );

    const NoDataFound = () => (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <User size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 uppercase">No Patients Found</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Try adjusting your filters</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <div className="max-w-7xl mx-auto space-y-2 sm:space-y-4">


                {/* PAGE HEADING */}
                <div className="px-1 sm:px-0 mb-4">
                    <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-800 uppercase tracking-tight">
                        Patient Monitoring
                    </h1>
                </div>

                {/* STATS & SEARCH BAR COMBO */}
                <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-6 mx-1 sm:mx-0">
                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        <StatCard icon={<UserCheck className="text-emerald-600 sm:size-[14px]" size={10} />} label="Total" value={admissions.length} />
                        <StatCard icon={<Heart className="text-rose-500 sm:size-[14px]" size={10} />} label="Alerts" value="0" />
                        <StatCard icon={<ClipboardList className="text-blue-600 sm:size-[14px]" size={10} />} label="Tasks" value={admissions.length} />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 lg:ml-auto">
                        <div className="flex items-center gap-2 justify-between sm:justify-start">
                            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                                    <LayoutGrid size={10} className="sm:size-[12px]" /> Card
                                </button>
                                <button onClick={() => setViewMode('table')} className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                                    <TableIcon size={10} className="sm:size-[12px]" /> Table
                                </button>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-1 px-2 py-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} /></button>
                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-900 tracking-tighter">{currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={14} /></button>
                                </div>
                            )}
                        </div>

                        <div className="relative group flex-1 min-w-0 sm:min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Find Patient..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-lg bg-slate-50 border border-slate-100 focus:border-emerald-500 outline-none text-[9px] sm:text-[11px] font-bold uppercase tracking-widest transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                {viewMode === 'table' ? <TableView /> : <GridView />}

                {/* MODALS */}
                {selectedAdmission && (
                    <>
                        <VitalsEntryModal
                            isOpen={isVitalsOpen}
                            onClose={() => setIsVitalsOpen(false)}
                            admissionId={selectedAdmission.admissionId}
                            patientName={selectedAdmission.patient?.name}
                            onSuccess={fetchAdmissions}
                        />
                        <ClinicalNotesModal
                            isOpen={isNotesOpen}
                            onClose={() => setIsNotesOpen(false)}
                            admissionId={selectedAdmission.admissionId}
                            patientName={selectedAdmission.patient?.name}
                            onSuccess={fetchAdmissions}
                        />
                        <MedicationAdministrationModal
                            isOpen={isMedsOpen}
                            onClose={() => setIsMedsOpen(false)}
                            admissionId={selectedAdmission.admissionId}
                            patientName={selectedAdmission.patient?.name}
                            onSuccess={() => fetchAdmissions(true)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}