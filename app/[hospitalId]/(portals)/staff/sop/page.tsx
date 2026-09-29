'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP } from '@/lib/integrations/services/sop.service';
import { ShieldCheck, Info, Search } from 'lucide-react';
import { SOPTable } from '@/components/sop/SOPTable';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function GeneralStaffSOPPage() {
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedSOPName, setSelectedSOPName] = useState<string | null>(null);

    const { data: sops = [], isLoading } = useQuery({
        queryKey: ['staff-general-sops'],
        queryFn: () => sopService.getSOPs({ status: 'Active' }),
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            queryClient.invalidateQueries({ queryKey: ['staff-general-sops'] });
        } catch (error) {
            console.error('Acknowledgment error:', error);
            toast.error('Failed to acknowledge protocol');
        } finally {
            setAcknowledgingId(null);
        }
    };

    const handleView = async (id: string, fileName: string) => {
        try {
            setDownloadingId(id);
            const response = await sopService.fetchSignedUrl(id);
            if (response.downloadUrl) {
                try {
                    // Fetch directly to ensure PDF type
                    const pdfResponse = await fetch(response.downloadUrl);
                    if (!pdfResponse.ok) throw new Error('Fetch failed');

                    const blob = await pdfResponse.blob();
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const blobUrl = window.URL.createObjectURL(pdfBlob);

                    setPreviewUrl(blobUrl);
                    setSelectedSOPName(fileName);
                    setIsPreviewModalOpen(true);
                } catch (err) {
                    console.warn('Blob fetch failed, falling back to direct tab', err);
                    window.open(response.downloadUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('View error:', error);
            toast.error('Failed to view protocol');
        } finally {
            setDownloadingId(null);
        }
    };

    const triggerDirectDownload = async () => {
        if (previewUrl && selectedSOPName) {
            try {
                const link = document.createElement('a');

                // If blob, use directly
                if (previewUrl.startsWith('blob:')) {
                    link.href = previewUrl;
                } else {
                    // Fetch again if needed (fallback)
                    const response = await fetch(previewUrl);
                    const blob = await response.blob();
                    link.href = window.URL.createObjectURL(blob);
                }

                const safeName = selectedSOPName.replace(/[^a-zA-Z0-9-_]/g, '_');
                link.download = `${safeName}.pdf`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (!previewUrl.startsWith('blob:')) {
                    window.URL.revokeObjectURL(link.href);
                }
                toast.success('Download started');
            } catch (error) {
                toast.error('Download failed');
            }
        }
    };

    const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

    const filteredSops = sops.filter((sop: SOP) => {
        const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
        
        let matchesDate = true;
        if (startDate) {
            const sopDate = new Date(sop.lastUpdated);
            sopDate.setHours(0, 0, 0, 0);
            const filterStart = new Date(startDate);
            filterStart.setHours(0, 0, 0, 0);
            if (sopDate < filterStart) matchesDate = false;
        }
        if (endDate) {
            const sopDate = new Date(sop.lastUpdated);
            sopDate.setHours(23, 59, 59, 999);
            const filterEnd = new Date(endDate);
            filterEnd.setHours(23, 59, 59, 999);
            if (sopDate > filterEnd) matchesDate = false;
        }
        return matchesSearch && matchesCategory && matchesDate;
    });

    // Reset pagination on filter change
    const updateSearch = (val: string) => {
        setSearchTerm(val);
        setCurrentPage(1);
    };

    const updateCategory = (cat: string) => {
        setActiveCategory(cat);
        setCurrentPage(1);
        setShowFilters(false);
    };

    return (
        <div className="space-y-3 sm:space-y-6 w-full max-w-full overflow-x-hidden mx-auto pb-4 sm:pb-8">
            {/* Header Tier */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 px-1 sm:px-0">
                <div className="space-y-1 sm:space-y-4">

                    <div>
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Institutional Registry</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-bold mt-0.5 uppercase tracking-widest text-[6px] sm:text-[8px] sm:ml-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                            Compliance Protocols
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Date range picker */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 shadow-sm text-[8px] sm:text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Date:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-[8px] sm:text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300 py-0"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-[8px] sm:text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300 py-0"
                        />
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); setCurrentPage(1); }}
                                className="text-[10px] font-black text-rose-500 hover:text-rose-700 ml-1"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="relative w-full md:w-auto">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto px-2 py-1 sm:px-4 sm:py-2.5 rounded text-[6px] sm:text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 leading-none ${showFilters
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-emerald-500/50 hover:text-emerald-600 shadow-sm'
                                }`}
                        >
                            <div className="flex items-center gap-1">
                                <Search size={8} className="sm:size-[14px]" />
                                <span className="truncate leading-none">{activeCategory === 'all' ? 'Browse Library' : activeCategory}</span>
                            </div>
                            <Info size={8} className="sm:hidden opacity-50" />
                        </button>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 mt-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl z-[50] overflow-hidden p-2"
                                >
                                    <div className="relative mb-1">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                        <input
                                            type="text"
                                            placeholder="Search Categories..."
                                            value={searchTerm}
                                            onChange={(e) => updateSearch(e.target.value)}
                                            className="w-full pl-6 pr-2 py-1.5 bg-gray-50 dark:bg-gray-900 border-none rounded text-[8px] font-bold outline-none leading-none"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => updateCategory(cat)}
                                                className={`w-full text-left px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-wider transition-all mb-0.5 leading-none ${activeCategory === cat
                                                    ? 'bg-primary-theme text-white shadow-sm'
                                                    : 'bg-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="bg-transparent p-0 md:p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <SOPTable
                    sops={filteredSops}
                    isLoading={isLoading}
                    onAcknowledge={handleAcknowledge}
                    onDownload={handleView}
                    acknowledgingId={acknowledgingId}
                    downloadingId={downloadingId}
                    showInternalFilters={false}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <PDFViewerModal
                isOpen={isPreviewModalOpen}
                onClose={() => {
                    if (previewUrl && previewUrl.startsWith('blob:')) {
                        window.URL.revokeObjectURL(previewUrl);
                    }
                    setIsPreviewModalOpen(false);
                    setPreviewUrl(null);
                }}
                pdfUrl={previewUrl}
                sopName={selectedSOPName || 'Document'}
                onDownload={triggerDirectDownload}
            />
        </div>
    );
}
