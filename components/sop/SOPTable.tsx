'use client';

import React, { useState } from 'react';
import {
  Search,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { SOP } from '@/lib/integrations/services/sop.service';

interface SOPTableProps {
  sops: SOP[];
  isLoading: boolean;
  onAcknowledge: (id: string) => Promise<void>;
  onDownload: (id: string, fileName: string) => Promise<void>;
  acknowledgingId: string | null;
  downloadingId: string | null;
  showInternalFilters?: boolean;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  hidePagination?: boolean;
}

export const SOPTable: React.FC<SOPTableProps> = ({
  sops,
  isLoading,
  onAcknowledge,
  onDownload,
  acknowledgingId,
  downloadingId,
  showInternalFilters = true,
  currentPage: externalPage,
  onPageChange: externalOnPageChange,
  itemsPerPage = 7,
  hidePagination = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [internalPage, setInternalPage] = useState(1);

  const currentPage = externalPage ?? internalPage;
  const onPageChange = externalOnPageChange ?? setInternalPage;

  const categories = ['all', 'OPD', 'IPD', 'Billing', 'Infection Control', 'Emergency', 'HR', 'Pharmacy', 'Lab', 'General'];

  const filteredSops = sops.filter(sop => {
    const matchesSearch = sop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || sop.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredSops.length / itemsPerPage);
  const paginatedSops = filteredSops.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Protocol Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Internal Filters Section (if enabled) */}
      {showInternalFilters && (
        <div className="flex flex-col md:flex-row gap-1 items-center justify-between bg-white dark:bg-gray-800 p-1 sm:p-2 rounded border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap gap-0.5 justify-center md:justify-start">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  onPageChange(1);
                }}
                className={`px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded text-[6px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat
                  ? 'bg-primary-theme text-white border border-primary-theme'
                  : 'bg-transparent text-gray-400 hover:text-emerald-600 border border-transparent'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-48">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={8} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onPageChange(1);
              }}
              className="w-full pl-6 pr-2 py-1 bg-gray-50 dark:bg-gray-900 border-none rounded text-[8px] font-bold outline-none focus:ring-1 focus:ring-emerald-500/10"
            />
          </div>
        </div>
      )}

      {paginatedSops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-gray-800/50 rounded-[0.5rem] border border-dashed border-gray-200 dark:border-gray-700">
          <AlertCircle className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No matching protocols found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Protocol</th>
                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Version</th>
                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Acknowledgment</th>
                    <th className="px-3 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginatedSops.map((sop) => (
                    <tr key={sop._id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <FileCheck size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight">{sop.name}</p>
                            <p className="text-[8px] text-gray-400 font-black uppercase mt-0.5 flex items-center gap-1">
                              <Clock size={8} /> {format(new Date(sop.lastUpdated), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-[8px] font-black uppercase rounded-md">
                          {sop.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">v{sop.version}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => !sop.isAcknowledged && onAcknowledge(sop._id)}
                            disabled={sop.isAcknowledged || acknowledgingId === sop._id}
                            className={`p-1.5 rounded-lg flex items-center gap-1.5 transition-all ${sop.isAcknowledged
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                              : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 dark:bg-gray-900'
                              }`}
                          >
                            {sop.isAcknowledged ? <CheckSquare size={14} /> : <Square size={14} />}
                            <span className="text-[8px] font-black uppercase">{sop.isAcknowledged ? 'Accepted' : 'Accept'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onDownload(sop._id, sop.fileName)}
                          disabled={!sop.isAcknowledged || downloadingId === sop._id}
                          className={`px-3 py-1.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-wider inline-flex items-center justify-center min-w-[60px] ${sop.isAcknowledged
                            ? 'bg-primary-theme dark:bg-white text-white dark:text-black hover:bg-primary-theme/80 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white'
                            : 'bg-primary-theme/50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                            }`}
                          title={sop.isAcknowledged ? "View" : "Accept first"}
                        >
                          {downloadingId === sop._id ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            "View"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-0.5 p-0 bg-transparent">
            {paginatedSops.map((sop) => (
              <div key={sop._id} className="bg-white dark:bg-gray-800 p-1 rounded border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-1 transition-all">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded shrink-0">
                      <FileCheck size={10} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 dark:text-white text-[8px] leading-none uppercase tracking-tighter truncate">{sop.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[5px] font-mono text-emerald-600 font-black border border-emerald-100/50 px-0.5 rounded-sm">v{sop.version}</span>
                        <span className="text-[5px] text-gray-400 font-bold uppercase">{format(new Date(sop.lastUpdated), 'MMM dd')}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-1 py-0.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 text-gray-400 text-[5px] font-black uppercase rounded-sm shrink-0">
                    {sop.category}
                  </span>
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-gray-50 dark:border-gray-800">
                  <button
                    onClick={() => !sop.isAcknowledged && onAcknowledge(sop._id)}
                    disabled={sop.isAcknowledged || acknowledgingId === sop._id}
                    className={`flex-1 py-0.5 px-1 rounded-sm flex items-center justify-center gap-1 text-[7px] font-black uppercase tracking-widest ${sop.isAcknowledged
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                      : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100'
                      }`}
                  >
                    {sop.isAcknowledged ? <CheckSquare size={10} /> : <Square size={10} />}
                    {sop.isAcknowledged ? 'Done' : 'Accept'}
                  </button>

                  <button
                    onClick={() => onDownload(sop._id, sop.fileName)}
                    disabled={!sop.isAcknowledged || downloadingId === sop._id}
                    className={`flex-1 py-0.5 px-1 rounded-sm text-[7px] font-black uppercase tracking-widest flex items-center justify-center ${sop.isAcknowledged
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                  >
                    {downloadingId === sop._id ? <Loader2 className="animate-spin" size={8} /> : <span>View Index</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!hidePagination && totalPages > 1 && (
        <div className="px-1.5 py-1 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between rounded-lg">
          <p className=" hidden md:block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
            Page {currentPage} of {totalPages}
          </p>
          <p className="md:hidden text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">
            {currentPage} / {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded text-gray-400 hover:text-emerald-500 disabled:opacity-50 transition-all active:scale-95 shadow-xs"
            >
              <ChevronLeft size={10} />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded text-gray-400 hover:text-emerald-500 disabled:opacity-50 transition-all active:scale-95 shadow-xs"
            >
              <ChevronRight size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
