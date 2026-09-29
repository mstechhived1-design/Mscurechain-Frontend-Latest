'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    FileEdit,
    Printer,
    ChevronLeft,
    ChevronRight,
    User,
    Calendar,
    Filter,
    Trash2,
    ArrowLeft,
    Plus,
    CreditCard,
    LayoutGrid,
    Table as TableIcon
} from 'lucide-react';
import { Card, Button } from '@/components/admin';
import { dischargeService, hospitalAdminService } from '@/lib/integrations/services';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import ClinicalReceipt from '@/components/helpdesk/ClinicalReceipt';
import { useTenantLink } from '@/hooks/useTenantLink';
import toast from 'react-hot-toast';

interface DischargeHistoryProps {
    basePath: string;
}

export function DischargeHistory({ basePath }: DischargeHistoryProps) {
    const router = useRouter();
    const { getPath } = useTenantLink();
    const { user } = useAuthStore();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit] = useState(6);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1
    });

    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

    // Printing state
    const [receiptData, setReceiptData] = useState<any>(null);
    const [hospitalDetails, setHospitalDetails] = useState<any>({ name: 'Hospital' });

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const res = await hospitalAdminService.getHospital();
                if (res?.hospital) setHospitalDetails(res.hospital);
            } catch (e) {
                console.error("Failed to fetch hospital info", e);
            }
        };
        fetchHospital();
    }, []);

    // Debounce search - reduced to 300ms for snappier feel
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
                setDebouncedSearch(searchTerm);
                setPage(1); // Reset to first page on new search
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await dischargeService.getHistory(page, limit, debouncedSearch);

            // Atomic update to prevent UI flickering
            if (response.data) {
                setRecords(response.data);
                if (response.pagination) {
                    setPagination({
                        total: response.pagination.total,
                        totalPages: response.pagination.totalPages
                    });
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load history");
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch]);

    // Fetch data whenever fetchHistory definition changes (which is tied to page/search)
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleEdit = (id: string) => {
        router.push(`${basePath}?id=${id}`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this record")) {
            return;
        }

        try {
            await dischargeService.deleteRecord(id);
            toast.success("Record deleted successfully", {
                icon: '🗑️',
                duration: 4000
            });
            // Refresh records
            fetchHistory();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete record");
        }
    };

    const triggerPrint = async (record: any) => {
        try {
            setLoading(true);
            const response = await dischargeService.getRecordById(record._id);
            const data = response.data;

            setReceiptData({
                patient: {
                    name: data.patientName,
                    mrn: data.mrn,
                    age: data.age,
                    gender: data.gender,
                    mobile: data.phone,
                    email: data.email,
                    address: data.address,
                    emergencyContact: data.attendantName ? `${data.attendantName} (${data.attendantPhone})` : '',
                    bloodGroup: data.bloodGroup,
                    dateOfBirth: data.dob,
                    allergies: data.allergyHistory,
                    medicalHistory: data.pastMedicalHistory,
                    symptoms: data.reasonForAdmission,
                    diagnosis: data.diagnosis,
                    provisionalDiagnosis: data.provisionalDiagnosis,
                    treatmentGiven: data.treatmentGiven,
                    surgicalProcedures: data.surgicalProcedures,
                    investigationsPerformed: data.investigationsPerformed,
                    hospitalCourse: data.hospitalCourse,
                    conditionAtDischarge: data.conditionAtDischarge,
                    medicationsPrescribed: data.medicationsPrescribed,
                    adviceAtDischarge: data.adviceAtDischarge,
                    activityRestrictions: data.activityRestrictions,
                    dietInstructions: data.dietInstructions,
                    warningSigns: data.warningSigns,
                    followUpDate: data.followUpDate,
                    dischargeType: data.dischargeType || 'Final Discharge',
                    vitals: data.vitals
                },
                appointment: {
                    type: 'Final Discharge Summary',
                    doctorName: data.consultants?.[0] || data.primaryDoctor || data.suggestedDoctorName || 'Assigned Physician',
                    appointmentId: data._id || `DIS-${Date.now()}`,
                    date: data.admissionDate ? new Date(data.admissionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
                    time: data.admissionDate ? new Date(data.admissionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(),
                },
                payment: {
                    amount: Math.round(data.totalBillAmount || 0),
                    status: 'Settled',
                    method: data.paymentMode || 'Cash',
                    receiptNumber: data._id,
                    advanceAmount: Math.round(data.advanceAmount || 0),
                    remainingPaid: Math.round(data.remainingAmount || (data.totalPaidAmount - data.advanceAmount) || 0),
                    totalPaidAmount: Math.round(data.totalPaidAmount > data.advanceAmount ? data.totalPaidAmount : (data.advanceAmount + (data.remainingAmount || 0))),
                    totalBillAmount: Math.round(data.totalBillAmount || 0)
                }
            });
        } catch (err: any) {
            toast.error("Failed to fetch full record for printing");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const NoRecordsFound = ({ variant = 'table' }: { variant?: 'table' | 'grid' }) => {
        const content = (
            <div className={`py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 ${variant === 'grid' ? 'col-span-full' : ''}`}>
                <div className="max-w-xs mx-auto space-y-4">
                    <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Search size={40} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">No records found</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">Try adjusting your search filters or create a new discharge summary for this hospital.</p>
                </div>
            </div>
        );

        if (variant === 'grid') return content;

        return (
            <tr>
                <td colSpan={5} className="p-0">
                    {content}
                </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="w-full p-1 sm:p-2 space-y-4 md:space-y-6">
                {/* CONSOLIDATED HEADER & CONTROLS */}
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => router.push(basePath)}
                                className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200 shadow-sm"
                                title="Back to Portal"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    DISCHARGE HISTORY
                                </h1>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {pagination.total} Committed Summaries
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
                            <div className="relative flex-1 sm:w-80 group">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 size-[14px] sm:size-[16px] group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH BY NAME OR MRN..."
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-blue-500 shadow-inner transition-all"
                                />
                            </div>

                            {user?.role === 'hospital-admin' && (
                                <Link
                                    href={getPath("/hospital-admin/transactions?type=Discharge")}
                                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:bg-emerald-700 transition-all text-[9px] sm:text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-200"
                                >
                                    <CreditCard size={14} className="sm:size-[16px]" /> <span className="hidden sm:inline">Transactions</span><span className="sm:hidden">TXN</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics Overview */}
                <div className="flex flex-row items-stretch gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                    {/* TOTAL SUMMARIES */}
                    <div className="flex-1 sm:flex-none min-w-[80px] sm:min-w-0 p-3 sm:p-5 bg-white border border-slate-200 text-slate-900 rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-slate-50 rounded-full -mr-8 sm:-mr-12 -mt-8 sm:-mt-12 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-1.5 sm:p-2.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl">
                                <FileEdit size={14} className="sm:size-[20px]" />
                            </div>
                            <div className="relative z-10">
                                <p className="hidden sm:block text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Summaries</p>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none sm:mt-1 tracking-tighter">{pagination.total}</h3>
                            </div>
                        </div>
                    </div>

                    {/* VIEW MODE */}
                    <div className="flex-1 sm:flex-none min-w-[100px] sm:min-w-0 p-2 sm:p-5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            <div className="p-1.5 sm:p-2.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl">
                                <Filter size={14} className="sm:size-[20px]" />
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">View Mode</p>
                                <h3 className="text-[9px] sm:text-[10px] font-black text-blue-600 mt-1 uppercase leading-none">
                                    {debouncedSearch ? 'Filtered' : 'Comprehensive'}
                                </h3>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200/50">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={12} className="sm:mr-1.5" /> <span className="hidden sm:inline">Card</span>
                            </button>
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setViewMode('table')}
                                className={`flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <TableIcon size={12} className="sm:mr-1.5" /> <span className="hidden sm:inline">Table</span>
                            </button>
                        </div>
                    </div>

                    {/* PAGINATION */}
                    <div className="flex-1 sm:flex-none min-w-[120px] sm:min-w-0 p-2 sm:p-5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            <div className="p-1.5 sm:p-2.5 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl">
                                <Calendar size={14} className="sm:size-[20px]" />
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Page Index</p>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1 uppercase leading-none">
                                    {page} <span className="text-[10px] text-slate-300 mx-0.5 sm:mx-1">/</span> {pagination.totalPages}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200/50">
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 sm:p-2 rounded-md sm:rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all font-black text-[9px] sm:text-xs"
                            >
                                <ChevronLeft size={14} className="sm:size-[16px]" />
                            </button>
                            <div className="px-1.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-black text-blue-600 bg-white rounded shadow-sm min-w-[20px] sm:min-w-[40px] text-center">
                                {page}
                            </div>
                            <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || pagination.totalPages === 0}
                                className="p-1 sm:p-2 rounded-md sm:rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all font-black"
                            >
                                <ChevronRight size={14} className="sm:size-[16px]" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {viewMode === 'table' ? (
                    <Card className="rounded-2xl border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
                        <div className="scroll-x-container">
                            <table className="w-full text-left border-collapse min-w-[1000px] sm:min-w-0">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">ID Identifiers</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Team</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Status / Date</th>
                                        <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="">
                                                <td colSpan={5} className="px-8 py-6">
                                                    <div className="h-8 bg-slate-100 rounded-xl w-full animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : records.length === 0 ? (
                                        <NoRecordsFound variant="table" />
                                    ) : (
                                        records.map((record) => (
                                            <tr key={record._id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-50 last:border-0 group">
                                                <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                    <div className="flex items-center gap-1.5 sm:gap-3">
                                                        <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] sm:text-sm shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            {record.patientName?.charAt(0) || 'P'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-blue-600 text-[9px] sm:text-sm leading-tight uppercase tracking-tight">{record.patientName}</h4>
                                                            <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase mt-0.5">{record.gender} • {record.age}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-1 py-0.5 bg-slate-50 border border-slate-100 rounded text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">MRN: {record.mrn}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8px] sm:text-xs font-bold text-indigo-600 line-clamp-1 italic uppercase tracking-tight">
                                                            {record.primaryDoctor || record.suggestedDoctorName || 'N/A'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-6 py-2 sm:py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${record.conditionAtDischarge === 'Stable' || record.conditionAtDischarge === 'Improved' ? 'bg-emerald-500' : record.conditionAtDischarge === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                            <span className="text-[7px] sm:text-[10px] font-black text-slate-700 uppercase tracking-widest">{record.conditionAtDischarge || record.status || 'Completed'}</span>
                                                        </div>
                                                        <p className="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {new Date(record.dischargeDate || record.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-6 py-2 sm:py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                                                        {user?.role === 'helpdesk' && (
                                                            <button
                                                                type="button"
                                                                suppressHydrationWarning
                                                                onClick={() => handleEdit(record._id)}
                                                                className="p-1.5 sm:p-2.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm"
                                                                title="Edit Summary"
                                                            >
                                                                <FileEdit size={14} className="sm:w-[16px] sm:h-[16px]" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            suppressHydrationWarning
                                                            onClick={() => triggerPrint(record)}
                                                            className="p-1.5 sm:p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-800 hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm"
                                                            title="Print Directly"
                                                        >
                                                            <Printer size={14} className="sm:w-[16px] sm:h-[16px]" />
                                                        </button>
                                                        {user?.role === 'hospital-admin' && (
                                                            <button
                                                                type="button"
                                                                suppressHydrationWarning
                                                                onClick={() => handleDelete(record._id)}
                                                                className="p-1.5 sm:p-2.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm"
                                                                title="Delete Record"
                                                            >
                                                                <Trash2 size={14} className="sm:w-[16px] sm:h-[16px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="h-24 bg-slate-50 rounded-2xl" />
                                    <div className="h-10 bg-slate-100 rounded-xl" />
                                </div>
                            ))
                        ) : records.length === 0 ? (
                            <NoRecordsFound variant="grid" />
                        ) : (
                            records.map((record) => (
                                <div key={record._id} className="bg-white p-2 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 shadow-sm hover:border-blue-400 transition-all flex flex-col gap-2 sm:gap-6 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-100 transition-opacity">
                                        <div className="flex gap-1.5">
                                            <button type="button" suppressHydrationWarning onClick={() => triggerPrint(record)} className="p-1.5 sm:p-2 bg-slate-900 text-white rounded-lg sm:rounded-xl shadow-lg hover:bg-blue-600 transition-colors"><Printer size={12} className="sm:w-[14px] sm:h-[14px]" /></button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <div className="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-xl shadow-lg shadow-blue-200">
                                            {record.patientName?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-[10px] sm:text-sm uppercase tracking-tight">{record.patientName}</h4>
                                            <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.gender} • {record.age}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1 sm:space-y-4 pt-1 sm:pt-4 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Team</span>
                                            <span className="text-[8px] sm:text-[11px] font-black text-blue-600 uppercase italic">{record.primaryDoctor || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Discharge Date</span>
                                            <span className="text-[8px] sm:text-[11px] font-bold text-slate-700 uppercase">{new Date(record.dischargeDate || record.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-2 flex gap-2">
                                        {user?.role === 'helpdesk' && (
                                            <button
                                                type="button"
                                                suppressHydrationWarning
                                                onClick={() => handleEdit(record._id)}
                                                className="w-full py-2 border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 text-[9px] uppercase font-bold"
                                            >
                                                <FileEdit size={14} /> Edit Summary
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Enhanced Receipt Modal */}
            {receiptData && (
                <ClinicalReceipt
                    hospital={hospitalDetails}
                    patient={receiptData.patient}
                    appointment={receiptData.appointment}
                    payment={receiptData.payment}
                    onClose={() => setReceiptData(null)}
                />
            )}
        </div>
    );
}

export default React.memo(DischargeHistory);
