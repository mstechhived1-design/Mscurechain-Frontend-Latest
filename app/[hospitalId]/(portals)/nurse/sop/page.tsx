'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP } from '@/lib/integrations/services/sop.service';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { SOPTable } from '@/components/sop/SOPTable';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function NurseSOPPage() {
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedSOPName, setSelectedSOPName] = useState<string | null>(null);

    const { data: sops = [], isLoading } = useQuery({
        queryKey: ['nurse-sops'],
        queryFn: () => sopService.getSOPs({ status: 'Active' }),
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            queryClient.invalidateQueries({ queryKey: ['nurse-sops'] });
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
            } catch {
                toast.error('Download failed');
            }
        }
    };

    const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

    const filteredSops = sops.filter((sop: SOP) => {
        const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
        return matchesSearch && matchesCategory;
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
        <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto min-h-screen pb-20">
            {/* Header Tier */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-6 pt-2">
                <div className="w-full sm:w-auto">
                    <div className="text-left">
                        <h1 className="text-lg md:text-xl lg:text-xl font-bold text-gray-900 dark:text-white uppercase leading-none">Nursing Protocols</h1>
                        <p className="text-gray-400 dark:text-gray-500 font-black mt-1 uppercase tracking-widest text-[8px] sm:text-[10px] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                            Staff Compliance & Standards
                        </p>
                    </div>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${showFilters
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500'
                                }`}
                        >
                            <Filter size={14} className="sm:size-[16px]" />
                            {activeCategory === 'all' ? 'Protocols & Search' : activeCategory}
                        </button>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl sm:rounded-2xl shadow-2xl z-[50] overflow-hidden p-3"
                                >
                                    <div className="relative mb-2 sm:mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:size-[14px]" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => updateSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Categories</p>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => updateCategory(cat)}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between ${activeCategory === cat
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                    : 'bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {cat}
                                                {activeCategory === cat && <ShieldCheck size={12} />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl sm:rounded-[1.5rem] border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="p-0 sm:p-6">
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
                </div>
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
