'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP, SOPReportResponse } from '@/lib/integrations/services/sop.service';
import {
    FilePlus,
    ShieldCheck,
    History,
    X,
    Upload,
    Search,
    AlertCircle,
    Loader2,
    Eye,
    Clock as ClockIcon,
    ChevronRight,
    ChevronDown,
    FileEdit,
    ClipboardList,
    Trash2,
    ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

import { format } from 'date-fns';
import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function SOPManagementPage() {
    const queryClient = useQueryClient();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSOPForEdit, setSelectedSOPForEdit] = useState<SOP | null>(null);
    const [sopToDelete, setSopToDelete] = useState<SOP | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editData, setEditData] = useState<{
        name: string;
        category: string;
        role: string;
        file: File | null;
    }>({
        name: '',
        category: 'General',
        role: 'Staff',
        file: null
    });

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedSOPForPreview, setSelectedSOPForPreview] = useState<SOP | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Queries
    const { data: sops = [], isLoading } = useQuery({
        queryKey: ['admin-sops'],
        queryFn: () => sopService.getSOPs(),
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    // State for UI Interactions
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [selectedSOPName, setSelectedSOPName] = useState<string | null>(null);
    const [selectedSOPId, setSelectedSOPId] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadData, setUploadData] = useState<{
        name: string;
        category: string;
        roles: string[];   // ✅ Changed from role: string to roles: string[]
        file: File | null;
    }>({
        name: '',
        category: 'General',
        roles: ['Staff'],  // Default: Staff selected
        file: null
    });

    const AVAILABLE_ROLES = ['Staff', 'Doctor', 'Nurse'];

    const toggleUploadRole = (role: string) => {
        setUploadData(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role) // deselect
                : [...prev.roles, role]              // select
        }));
    };

    // Mutations
    const archiveMutation = useMutation({
        mutationFn: (id: string) => sopService.archiveSOP(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-sops'] });
            toast.success('Protocol archived successfully');
        },
        onError: (error: any) => {
            console.error('[SOP Archive] Archive error:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to archive protocol';
            toast.error(errorMessage);
        }
    });

    // Open Edit Modal
    const openEditModal = (sop: SOP) => {
        setSelectedSOPForEdit(sop);
        setEditData({
            name: sop.name,
            category: sop.category,
            role: sop.assignedRole,
            file: null
        });
        setIsEditModalOpen(true);
    };

    // Handle Edit Submit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSOPForEdit) return;

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('name', editData.name);
            formData.append('category', editData.category);
            formData.append('assignedRole', editData.role);

            // Only append file if a new one was selected
            if (editData.file) {
                formData.append('sopFile', editData.file);
            }

            await sopService.updateSOP(selectedSOPForEdit._id, formData);

            toast.success(editData.file
                ? 'Protocol updated with new document version'
                : 'Protocol updated successfully'
            );
            setIsEditModalOpen(false);
            setSelectedSOPForEdit(null);
            setEditData({ name: '', category: 'General', role: 'Staff', file: null });
            queryClient.invalidateQueries({ queryKey: ['admin-sops'] });
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update protocol');
        } finally {
            setIsSubmitting(false);
        }
    };

    const { data: history = [], isLoading: isHistoryLoading } = useQuery({
        queryKey: ['sop-history', selectedSOPName],
        queryFn: () => sopService.getHistory(selectedSOPName!),
        enabled: !!selectedSOPName
    });

    const { data: report, isLoading: isReportLoading } = useQuery({
        queryKey: ['sop-report', selectedSOPId],
        queryFn: () => sopService.getSOPReport(selectedSOPId!),
        enabled: !!selectedSOPId && isReportModalOpen,
        refetchInterval: 5000 // Real-time updates for the compliance report
    });

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadData.file || !uploadData.name) {
            toast.error('Please provide both name and file');
            return;
        }
        if (uploadData.roles.length === 0) {
            toast.error('Please select at least one role');
            return;
        }

        try {
            setIsSubmitting(true);
            const rolesToUpload = uploadData.roles;

            // Upload once per role (backend supports one role per SOP)
            for (let i = 0; i < rolesToUpload.length; i++) {
                const role = rolesToUpload[i];
                const formData = new FormData();
                formData.append('sopFile', uploadData.file);
                formData.append('name', rolesToUpload.length > 1
                    ? `${uploadData.name} (${role})`  // e.g. "Protocol Name (Doctor)"
                    : uploadData.name
                );
                formData.append('category', uploadData.category);
                formData.append('assignedRole', role);

                if (rolesToUpload.length > 1) {
                    toast.loading(`Uploading ${i + 1} of ${rolesToUpload.length}: ${role}...`, { id: 'sop-upload' });
                }

                await sopService.uploadSOP(formData);
            }

            toast.dismiss('sop-upload');
            toast.success(
                rolesToUpload.length > 1
                    ? `Document published for ${rolesToUpload.join(', ')}`
                    : 'Document published successfully'
            );
            setIsUploadModalOpen(false);
            setUploadData({ name: '', category: 'General', roles: ['Staff'], file: null });
            queryClient.invalidateQueries({ queryKey: ['admin-sops'] });
        } catch (error) {
            toast.dismiss('sop-upload');
            console.error('Upload error:', error);
            toast.error('Failed to publish document');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

    const filteredSops = sops.filter((sop: SOP) => {
        const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredSops.length / itemsPerPage));
    const paginatedSops = filteredSops.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeCategory]);

    // const handleDownload = async (sop: SOP) => {
    //     try {
    //         console.log(`[FRONTEND DEBUG] Attempting to view SOP: ${sop.name} (${sop._id})`);
    //         setDownloadingId(sop._id);
    //         const response = await sopService.fetchSignedUrl(sop._id);
    //         console.log(`[FRONTEND DEBUG] Received response from backend:`, response);
    //         if (response.downloadUrl) {
    //             setPreviewUrl(response.downloadUrl);
    //             setSelectedSOPForPreview(sop);
    //             setIsPreviewModalOpen(true);
    //         }
    //         let finalUrl = response.downloadUrl;
    //         if (!finalUrl.toLowerCase().endsWith('.pdf')) {
    //             finalUrl = finalUrl.replace(/(\?.*)?$/, '.pdf$1');  // add before query params
    //         }
    //         setPreviewUrl(finalUrl);    
    //     } catch (error) {
    //         console.error('[FRONTEND DEBUG] Download error:', error);
    //         toast.error('Failed to view protocol');
    //     } finally {
    //         setDownloadingId(null);
    //     }
    // };
    const handleView = async (sop: SOP) => {
        try {
            console.log('[SOP View] Starting view for:', sop.name, sop._id);
            setDownloadingId(sop._id);
            const response = await sopService.fetchSignedUrl(sop._id);
            console.log('[SOP View] Received signed URL response:', response);

            if (response.downloadUrl) {
                try {
                    // Try to fetch the PDF as a blob to avoid 401 errors
                    const pdfResponse = await fetch(response.downloadUrl);

                    if (!pdfResponse.ok) {
                        console.warn(`[SOP View] Blob fetch failed with status ${pdfResponse.status}, falling back to direct URL`);
                        // Fallback: Open in new tab if blob fetch fails
                        window.open(response.downloadUrl, '_blank');
                        toast.success('Opening document in new tab');
                        return;
                    }

                    // CRITICAL FIX: Force the blob type to be application/pdf
                    // This prevents the browser from trying to download "generic" binary data
                    const blob = await pdfResponse.blob();
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });

                    // Create a local blob URL
                    const blobUrl = window.URL.createObjectURL(pdfBlob);

                    setPreviewUrl(blobUrl);
                    setSelectedSOPForPreview(sop);
                    setIsPreviewModalOpen(true);
                    console.log('[SOP View] Preview modal opened successfully');
                } catch (blobError) {
                    console.warn('[SOP View] Blob conversion failed, falling back to direct URL:', blobError);
                    // Fallback: Open in new tab if blob conversion fails
                    window.open(response.downloadUrl, '_blank');
                    toast.success('Opening document in new tab');
                }
            } else {
                toast.error('No download URL received from server');
            }
        } catch (error: any) {
            console.error('[SOP View] Preview error:', error);
            toast.error(error?.message || 'Failed to open preview');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownload = async (sop: SOP) => {
        try {
            console.log('[SOP Download] Starting download for:', sop.name, sop._id);
            setDownloadingId(sop._id);
            // Request signed URL from backend with download=true
            const response = await sopService.fetchSignedUrl(sop._id, true);
            console.log('[SOP Download] Received download URL response:', response);

            if (response.downloadUrl) {
                try {
                    // Try to fetch the file as a blob to control the filename
                    const fileResponse = await fetch(response.downloadUrl);

                    if (!fileResponse.ok) {
                        console.warn(`[SOP Download] Blob fetch failed with status ${fileResponse.status}, using direct download`);
                        // Fallback: Use direct download URL (Cloudinary will handle filename)
                        window.open(response.downloadUrl, '_blank');
                        toast.success('Download started');
                        return;
                    }

                    const blob = await fileResponse.blob();

                    // Create object URL
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;

                    // Construct filename: Use SOP name, sanitize it, ensure .pdf extension
                    const safeName = sop.name.replace(/[^a-zA-Z0-9-_]/g, '_');
                    link.download = `${safeName}.pdf`;

                    document.body.appendChild(link);
                    link.click();

                    // Cleanup
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    toast.success('Download started');
                    console.log('[SOP Download] Download completed successfully');
                } catch (blobError) {
                    console.warn('[SOP Download] Blob download failed, using direct download:', blobError);
                    // Fallback: Use direct download URL
                    window.open(response.downloadUrl, '_blank');
                    toast.success('Download started');
                }
            } else {
                toast.error('No download URL received from server');
            }
        } catch (error: any) {
            console.error('[SOP Download] Download error:', error);
            toast.error(error?.message || 'Download failed');
        } finally {
            setDownloadingId(null);
        }
    };
    const triggerDirectDownload = async () => {
        if (previewUrl && selectedSOPForPreview) {
            try {
                // If it's already a blob URL, we can download it directly
                if (previewUrl.startsWith('blob:')) {
                    const link = document.createElement('a');
                    link.href = previewUrl;

                    const safeName = selectedSOPForPreview.name.replace(/[^a-zA-Z0-9-_]/g, '_');
                    link.download = `${safeName}.pdf`;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Download started');
                    return;
                }

                toast.loading('Preparing download...');
                const response = await fetch(previewUrl);
                const blob = await response.blob();

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                // Construct filename: Use SOP name, sanitize it, ensure .pdf extension
                const safeName = selectedSOPForPreview.name.replace(/[^a-zA-Z0-9-_]/g, '_');
                link.download = `${safeName}.pdf`;

                document.body.appendChild(link);
                link.click();

                // Cleanup
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.dismiss();
                toast.success('Download started');
            } catch (error) {
                console.error('[SOP Download] Download error:', error);
                toast.error('Download failed');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 space-y-6">
            {/* Dynamic Header with Advanced Filters */}
            <div className="flex flex-col gap-4 bg-white py-3 px-4 md:py-4 md:px-5 rounded-2xl border border-gray-100 shadow-sm shrink-0 mb-6">
                
                {/* Top Row: Identification, Process Button, and Stats */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-gray-50">
                    
                    <div className="shrink-0 flex items-center gap-2 px-1">
                        <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight leading-none uppercase">
                                SOP & Policies
                            </h1>
                            <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
                                Manage hospital policies and procedures
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 xl:pb-0 w-full xl:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><FilePlus className="w-4 h-4 text-gray-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Total Versions</span>
                                <span className="text-sm font-bold text-gray-700 leading-none">{sops.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-lg border border-emerald-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><ShieldCheck className="w-4 h-4 text-emerald-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70">Active Policies</span>
                                <span className="text-sm font-bold text-emerald-700 leading-none">
                                    {sops.filter((s: SOP) => s.status === 'Active').length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
                            <div className="p-1.5 bg-white rounded-md shadow-sm"><History className="w-4 h-4 text-amber-500" /></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/70">Departments</span>
                                <span className="text-sm font-bold text-amber-700 leading-none">
                                    {categories.length - 1}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center gap-2 px-3 md:px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shrink-0 h-[34px]"
                        >
                            <FilePlus size={14} className="shrink-0" /> Upload Policy
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Control Center (Search & Pagination) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:flex-1">
                        
                        {/* Search Bar - Takes remaining width */}
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search Categories or Protocols..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="relative shrink-0 sm:w-44">
                           <select
                              value={activeCategory}
                              onChange={(e) => setActiveCategory(e.target.value)}
                              className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                           >
                              {categories.map(cat => (
                                 <option key={cat} value={cat}>{cat === 'all' ? 'All Departments' : cat}</option>
                              ))}
                           </select>
                           <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Header Pagination */}
                        <div className="flex items-center justify-between sm:justify-center gap-2 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <span className="text-[10px] font-black tracking-widest text-gray-400 px-2 flex items-center gap-1">
                                <span className="text-indigo-600">{currentPage}</span> / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white disabled:opacity-30 transition-all rounded shadow-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Main Content: Table View */}
            <div className="bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-2 md:px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Name</th>
                                <th className="px-2 md:px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                <th className="px-2 md:px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ver</th>
                                <th className="px-2 md:px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Updated</th>
                                <th className="px-2 md:px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">By</th>
                                <th className="px-2 md:px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-2 md:px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Loading Records...</p>
                                    </td>
                                </tr>
                            ) : paginatedSops.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <AlertCircle className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
                                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No matching documents found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedSops.map((sop: SOP) => (
                                    <tr key={sop._id} className="group border-b border-gray-100 dark:border-gray-700 transition-colors">
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg">
                                                    <FilePlus size={16} />
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">{sop.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase rounded-lg">
                                                {sop.category}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">v{sop.version}</span>
                                        </td>
                                        <td className="px-2 md:px-6 py-4">
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {format(new Date(sop.lastUpdated), 'MMM dd, yyyy')}
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                                                {format(new Date(sop.lastUpdated), 'HH:mm')}
                                            </p>
                                        </td>
                                        <td className="px-2 md:px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[9px] font-black text-indigo-500">
                                                    {(sop.uploadedBy?.name || 'A')[0]}
                                                </div>
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                    {sop.uploadedBy?.name || 'Admin'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${sop.status === 'Active'
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {sop.status}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                <button
                                                    onClick={() => handleView(sop)}
                                                    disabled={downloadingId === sop._id}
                                                    title="View Policy"
                                                    className="p-2.5 rounded-xl transition-all text-gray-400 bg-gray-50 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-500/10"
                                                >
                                                    {downloadingId === sop._id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                                </button>

                                                {sop.status === 'Active' && (
                                                    <button
                                                        onClick={() => openEditModal(sop)}
                                                        title="Edit Policy"
                                                        className="p-2.5 text-gray-400 bg-gray-50 hover:text-amber-500 hover:bg-amber-50 dark:bg-gray-800 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                                                    >
                                                        <FileEdit size={16} />
                                                    </button>
                                                )}

                                                {sop.status === 'Active' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSOPId(sop._id);
                                                            setIsReportModalOpen(true);
                                                        }}
                                                        title="Compliance Report"
                                                        className="p-2.5 text-gray-400 bg-gray-50 hover:text-blue-500 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                                                    >
                                                        <ClipboardList size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        setSelectedSOPName(sop.name);
                                                        setIsHistoryModalOpen(true);
                                                    }}
                                                    title="History"
                                                    className="p-2.5 text-gray-400 bg-gray-50 hover:text-violet-500 hover:bg-violet-50 dark:bg-gray-800 dark:hover:bg-violet-500/10 rounded-xl transition-all"
                                                >
                                                    <History size={16} />
                                                </button>

                                                {sop.status === 'Active' && (
                                                    <button
                                                        onClick={() => {
                                                            setSopToDelete(sop);
                                                            setIsDeleteConfirmOpen(true);
                                                        }}
                                                        title="Archive Policy"
                                                        className="p-2.5 text-gray-400 bg-gray-50 hover:text-red-500 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 md:px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-[10px] font-black pointer-events-none text-gray-400 uppercase tracking-widest">
                            Showing Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-emerald-500/50 transition-all active:scale-95"
                            >
                                <ChevronLeft size={14} />
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary-theme text-white dark:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-theme/80 dark:hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-gray-500/10"
                            >
                                Next
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {isUploadModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsUploadModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[0.5rem] p-3 md:p-6 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 md:p-4">
                                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-black hover:text-white transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">New Policy</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload a new policy document</p>
                                </div>

                                <form onSubmit={handleFileUpload} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Infection Control Protocol 2026"
                                            value={uploadData.name}
                                            onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                                            className="w-full px-3 md:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={uploadData.category}
                                                onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                                                className="w-full px-3 md:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                                            >
                                                {['OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* ✅ Multi-Role Toggle (replaces single select) */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                                Target Role Access
                                                <span className="ml-1 text-emerald-500">(multi-select)</span>
                                            </label>
                                            <div className="flex flex-col gap-2 pt-1">
                                                {AVAILABLE_ROLES.map(role => {
                                                    const isSelected = uploadData.roles.includes(role);
                                                    return (
                                                        <button
                                                            key={role}
                                                            type="button"
                                                            onClick={() => toggleUploadRole(role)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isSelected
                                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                                                    : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:text-emerald-500'
                                                                }`}
                                                        >
                                                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'bg-white border-white' : 'border-gray-300'
                                                                }`}>
                                                                {isSelected && (
                                                                    <svg viewBox="0 0 10 10" className="w-2 h-2 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <polyline points="1,5 4,8 9,2" />
                                                                    </svg>
                                                                )}
                                                            </span>
                                                            {role}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {uploadData.roles.length === 0 && (
                                                <p className="text-[9px] text-red-400 font-black uppercase ml-1">Select at least one role</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Attachment (PDF)</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex flex-col items-center justify-center py-3 px-3 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] group-hover:border-emerald-500/50 transition-all">
                                                <Upload className="text-gray-400 mb-2 group-hover:text-emerald-500 transition-colors" size={24} />
                                                <p className="text-[9px] font-black uppercase text-gray-500 text-center">
                                                    {uploadData.file ? uploadData.file.name : 'Click or Drag to Upload Managed Document'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-primary-theme dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-theme/80 dark:hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                        Submit
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && selectedSOPForEdit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[0.5rem] p-3 md:p-6 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 md:p-4">
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-black hover:text-white transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Edit Policy</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        Current Version: v{selectedSOPForEdit.version}
                                    </p>
                                </div>

                                <form onSubmit={handleEditSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Infection Control Protocol 2026"
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            className="w-full px-3 md:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={editData.category}
                                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                className="w-full px-3 md:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                                            >
                                                {['OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Role Access</label>
                                            <select
                                                value={editData.role}
                                                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                                className="w-full px-3 md:px-6 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                                            >
                                                {['Staff', 'Doctor', 'Nurse'].map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            Document Attachment (PDF)
                                            <span className="text-amber-500 ml-1">• Optional</span>
                                        </label>
                                        <p className="text-[9px] text-gray-400 ml-1 mb-2">
                                            Upload a new document to create Version {selectedSOPForEdit.version + 1}
                                        </p>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => setEditData({ ...editData, file: e.target.files?.[0] || null })}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`flex flex-col items-center justify-center py-3 px-3 border-2 border-dashed rounded-[2rem] transition-all ${editData.file
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                                                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 group-hover:border-amber-500/50'
                                                }`}>
                                                <Upload className={`mb-2 transition-colors ${editData.file ? 'text-emerald-500' : 'text-gray-400 group-hover:text-amber-500'}`} size={24} />
                                                <p className="text-[9px] font-black uppercase text-center">
                                                    {editData.file ? (
                                                        <span className="text-emerald-600">{editData.file.name}</span>
                                                    ) : (
                                                        <span className="text-gray-500">Click to Replace Document (Creates New Version)</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !editData.name}
                                        className="w-full py-4 bg-primary-theme text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-theme/80 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileEdit size={16} />}
                                        {editData.file ? 'Update & Publish New Version' : 'Update Policy'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* History Modal */}
            <AnimatePresence>
                {isHistoryModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[0.5rem] p-10 shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedSOPName}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Version History</p>
                                </div>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-black hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {isHistoryLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                                    </div>
                                ) : history.length === 0 ? (
                                    <p className="text-center text-gray-400 py-10 uppercase text-[10px] font-black">No history found</p>
                                ) : (
                                    history.map((h, idx) => (
                                        <div key={h._id} className="relative p-3 md:p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                                            {idx !== history.length - 1 && (
                                                <div className="absolute left-1/2 -bottom-4 w-px h-4 bg-gray-200 dark:bg-gray-700" />
                                            )}
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${h.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                                                    <History size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">Version {h.version}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Uploaded {format(new Date(h.createdAt), 'MM/dd/yyyy HH:mm')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${h.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'}`}>
                                                    {h.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Compliance Report Modal */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReportModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-[0.5rem] p-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Acknowledgement Report</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {report?.sopName} • {report?.assignedRole} Registry
                                    </p>
                                </div>
                                <button onClick={() => setIsReportModalOpen(false)} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-black hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {isReportLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20">
                                    <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compiling Report Data...</p>
                                </div>
                            ) : report ? (
                                <>
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        <div className="p-2 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assigned</p>
                                            <p className="text-2xl font-black text-gray-900 dark:text-white">{report.stats.total}</p>
                                        </div>
                                        <div className="p-2 md:p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                                            <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Acknowledged</p>
                                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{report.stats.acknowledged}</p>
                                        </div>
                                        <div className="p-2 md:p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                                            <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Pending</p>
                                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{report.stats.pending}</p>
                                        </div>
                                    </div>

                                    {/* Report Table */}
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="overflow-y-auto custom-scrollbar flex-1">
                                            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full">
                                                <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                                        <th className="py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>

                                                        <th className="py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                        <th className="py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                    {report.report.map((user) => (
                                                        <tr key={user._id} className="group transition-colors h-14">
                                                            <td className="py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-black text-gray-500 uppercase">
                                                                        {user.name[0]}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{user.name}</p>
                                                                        <p className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{user.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="py-3 text-center">
                                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${user.hasAcknowledged
                                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                                                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                                                                    }`}>
                                                                    {user.hasAcknowledged ? 'Acknowledged' : 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-right">
                                                                {user.hasAcknowledged && user.acknowledgedAt ? (
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                                                                            {format(new Date(user.acknowledgedAt), 'MMM dd, yyyy')}
                                                                        </p>
                                                                        <p className="text-[8px] text-gray-400 font-mono">
                                                                            {format(new Date(user.acknowledgedAt), 'HH:mm:ss')}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-300 font-black uppercase tracking-tighter">-- : --</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table></div>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <PDFViewerModal
                isOpen={isPreviewModalOpen}
                onClose={() => {
                    // Cleanup blob URL to prevent memory leaks
                    if (previewUrl && previewUrl.startsWith('blob:')) {
                        window.URL.revokeObjectURL(previewUrl);
                    }
                    setIsPreviewModalOpen(false);
                    setPreviewUrl(null);
                }}
                pdfUrl={previewUrl}
                sopName={selectedSOPForPreview?.name || ''}
                onDownload={triggerDirectDownload}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteConfirmOpen && sopToDelete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsDeleteConfirmOpen(false);
                                setSopToDelete(null);
                            }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-2 md:p-4 md:p-8 shadow-2xl"
                        >
                            {/* Warning Icon */}
                            <div className="flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl mx-auto mb-6">
                                <Trash2 size={32} className="text-red-500" />
                            </div>

                            <h3 className="text-sm md:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight text-center">Archive Protocol?</h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center mt-2">
                                This action cannot be undone
                            </p>

                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                                <p className="text-sm font-bold text-red-700 dark:text-red-400 text-center leading-snug">
                                    &ldquo;{sopToDelete.name}&rdquo;
                                </p>
                                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest text-center mt-1">
                                    Category: {sopToDelete.category} &bull; v{sopToDelete.version}
                                </p>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                                Archiving this policy will make it unavailable to staff. The history will be preserved for reference.
                            </p>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setIsDeleteConfirmOpen(false);
                                        setSopToDelete(null);
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (sopToDelete) {
                                            archiveMutation.mutate(sopToDelete._id);
                                        }
                                        setIsDeleteConfirmOpen(false);
                                        setSopToDelete(null);
                                    }}
                                    disabled={archiveMutation.isPending}
                                    className="flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {archiveMutation.isPending ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                    Archive
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
