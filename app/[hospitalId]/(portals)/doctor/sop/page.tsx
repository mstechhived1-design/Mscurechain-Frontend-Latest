'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sopService, SOP } from '@/lib/integrations/services/sop.service';
import { ShieldCheck, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SOPTable } from '@/components/sop/SOPTable';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { PDFViewerModal } from '@/components/sop/PDFViewerModal';

export default function StaffSOPPage() {
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
        queryKey: ['staff-sops'],
        queryFn: () => sopService.getSOPs({ status: 'Active' }), // Only active for staff
        refetchInterval: 5000 // Real-time updates every 5 seconds
    });

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            queryClient.invalidateQueries({ queryKey: ['staff-sops'] });
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

    const ITEMS_PER_PAGE = 7; // Matches SOPTable internal default
    const totalPages = Math.ceil(filteredSops.length / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen space-y-4 sm:space-y-6 pt-2 sm:pt-4 pb-16 max-w-7xl mx-auto">
         {/* Dynamic Header */}
         <div className="flex flex-col gap-3 bg-white dark:bg-[#111] py-3 px-3 md:py-3 md:px-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 mx-1 sm:mx-0 relative overflow-hidden mb-4 z-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            
            {/* Top Row: Title, Pagination */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full relative z-10">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                     <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                     <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                        SOP Registry
                     </h1>
                     <p className="text-[9px] md:text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1 hidden sm:flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Active Institutional Standards Network
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                  {/* Pagination Controls */}
                  {totalPages > 0 && (
                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest whitespace-nowrap hidden sm:block px-1">
                           <span className="text-gray-900 dark:text-white">Page {currentPage}</span> / {totalPages}
                        </div>
                        <div className="flex items-center gap-1">
                           <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-emerald-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronLeft size={12} />
                           </button>
                           <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages || totalPages === 0}
                              className="p-1 rounded bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:text-emerald-600 disabled:opacity-30 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
                           >
                              <ChevronRight size={12} />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Bottom Row: Control Center (Category Button, Search) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-3 relative z-10">
               <div className="relative w-full lg:w-64 shrink-0">
                  <button
                     onClick={() => setShowFilters(!showFilters)}
                     className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${showFilters
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-none'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                  >
                     <div className="flex items-center gap-2 truncate">
                        <Search size={12} />
                        <span className="truncate">{activeCategory === 'all' ? 'Protocol Analytics' : activeCategory}</span>
                     </div>
                     <motion.div animate={{ rotate: showFilters ? 180 : 0 }} className="shrink-0">
                        <X size={12} className={showFilters ? 'opacity-100' : 'opacity-40'} />
                     </motion.div>
                  </button>

                  <AnimatePresence>
                     {showFilters && (
                        <motion.div
                           initial={{ opacity: 0, scale: 0.95, y: 5 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: 5 }}
                           className="absolute left-0 mt-2 w-full sm:w-80 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden p-2"
                        >
                           <div className="relative mb-2">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                              <input
                                 type="text"
                                 placeholder="SEARCH DOMAINS..."
                                 value={searchTerm}
                                 onChange={(e) => updateSearch(e.target.value)}
                                 className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                              />
                           </div>
                           <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                              {categories.map(cat => (
                                 <button
                                    key={cat}
                                    onClick={() => updateCategory(cat)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between group ${activeCategory === cat
                                       ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                       : 'bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                       }`}
                                 >
                                    <span className="truncate pr-2">{cat}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${activeCategory === cat ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600'}`} />
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
            <div className="bg-card rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-border-theme shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-secondary-theme/5 pointer-events-none"></div>
                <div className="relative z-10">
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
                        hidePagination={true}
                    />
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
