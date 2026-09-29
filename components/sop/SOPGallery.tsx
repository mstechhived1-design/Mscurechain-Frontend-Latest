'use client';

import React, { useState } from 'react';
import {
    FileText,
    Download,
    Clock,
    User,
    AlertCircle,
    Search,
    Archive,
    Loader2,
    CheckSquare,
    Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { SOP, sopService } from '@/lib/integrations/services/sop.service';

interface SOPGalleryProps {
    sops: SOP[];
    isLoading: boolean;
    isAdmin?: boolean;
    onArchive?: (id: string) => void;
    onViewHistory?: (name: string) => void;
    onAcknowledge?: () => void;
}

export const SOPGallery: React.FC<SOPGalleryProps> = ({
    sops,
    isLoading,
    isAdmin = false,
    onArchive,
    onViewHistory,
    onAcknowledge
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadedSops, setDownloadedSops] = useState<Set<string>>(new Set());
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    const handleDownload = async (id: string, fileName: string) => {
        try {
            setDownloadingId(id);
            const response = await sopService.fetchSignedUrl(id);
            if (response.downloadUrl) {
                window.open(response.downloadUrl, '_blank');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to view protocol');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            await sopService.acknowledgeSOP(id);
            toast.success('Protocol acknowledged');
            onAcknowledge?.();
        } catch (error) {
            console.error('Acknowledgment error:', error);
            toast.error('Failed to acknowledge protocol');
        } finally {
            setAcknowledgingId(null);
        }
    };

    const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

    const filteredSops = sops.filter(sop => {
        const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Protocol Registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Gallery Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeCategory === cat
                                ? 'bg-primary-theme text-white shadow-lg'
                                : 'bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>
            </div>

            {/* Documents Grid */}
            {filteredSops.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <AlertCircle className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No matching documents found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSops.map((sop) => (
                        <div
                            key={sop._id}
                            className="group bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 relative overflow-hidden"
                        >
                            {/* Category Badge */}
                            <div className="absolute top-0 right-0 p-3">
                                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded-lg">
                                    {sop.category}
                                </span>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase text-sm leading-tight line-clamp-2">{sop.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${sop.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                            v{sop.version} {sop.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <Clock size={8} /> Updated
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                        {format(new Date(sop.lastUpdated), 'MMM dd, yyyy')}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <User size={8} /> By
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">
                                        {sop.uploadedBy?.name || 'Admin'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => handleDownload(sop._id, sop.fileName)}
                                    disabled={downloadingId === sop._id}
                                    className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors disabled:opacity-50"
                                >
                                    {downloadingId === sop._id ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    {downloadingId === sop._id ? 'Generating...' : 'Download Protocol'}
                                </button>
                                {isAdmin && sop.status === 'Active' && (
                                    <button
                                        onClick={() => onArchive?.(sop._id)}
                                        className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all group"
                                        title="Archive Version"
                                    >
                                        <Archive size={14} />
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => onViewHistory?.(sop.name)}
                                        className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-primary-theme hover:text-white transition-all"
                                        title="Version History"
                                    >
                                        <Clock size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Acknowledgment Checkbox (Staff View) - Now below Download */}
                            {!isAdmin && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => !sop.isAcknowledged && downloadedSops.has(sop._id) && handleAcknowledge(sop._id)}
                                            disabled={sop.isAcknowledged || !downloadedSops.has(sop._id) || acknowledgingId === sop._id}
                                            className={`transition-colors ${sop.isAcknowledged ? 'text-emerald-500' : downloadedSops.has(sop._id) ? 'text-gray-400 hover:text-emerald-500' : 'text-gray-200 cursor-not-allowed'}`}
                                        >
                                            {sop.isAcknowledged ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${sop.isAcknowledged ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            {sop.isAcknowledged ? 'Acknowledged' : 'Read & Accept Protocol'}
                                        </span>
                                    </div>
                                    {!sop.isAcknowledged && !downloadedSops.has(sop._id) && (
                                        <span className="text-[7px] font-bold text-amber-500 uppercase tracking-tighter">Download first</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
