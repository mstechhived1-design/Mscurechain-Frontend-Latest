'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    ChevronRight,
    X,
    MessageSquare,
    ShieldCheck,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Search,
    ChevronLeft,
    ImageIcon,
    Download,
    Clock
} from 'lucide-react';
import { Incident } from '@/lib/integrations/types/incident';

interface IncidentActivityLogProps {
    incidents: Incident[];
    isLoading: boolean;
}

export default function IncidentActivityLog({ incidents, isLoading }: IncidentActivityLogProps) {
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    const filteredIncidents = incidents.filter(i =>
        i.incidentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.incidentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset to first page when search term changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-6">
            {/* Search Filter */}
            <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                    type="text"
                    placeholder="Search incident logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-emerald-500 rounded outline-hidden transition-all text-[10px] font-bold"
                />
            </div>

            {/* Content View: Desktop Table & Mobile Cards */}
            <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] md:rounded-[0.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm md:shadow-none">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching Logs...</p>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">No matching incidents found</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/80 text-gray-500 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest leading-none">Incident ID</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest leading-none">Type</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest leading-none">Description</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest leading-none">Date & Time</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-center leading-none">Severity</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-center leading-none">Status</th>
                                        <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-right leading-none">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {paginatedIncidents.map((incident) => (
                                        <tr
                                            key={incident._id}
                                            onClick={() => setSelectedIncident(incident)}
                                            className="group hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-2 py-2">
                                                <span className="text-[10px] font-black text-gray-900 dark:text-white font-mono leading-none">{incident.incidentId}</span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-none">{incident.incidentType}</span>
                                            </td>
                                            <td className="px-2 py-2 min-w-[150px]">
                                                <p className="text-[9px] text-gray-500 line-clamp-1 max-w-[200px] leading-tight">{incident.description}</p>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] font-black uppercase italic leading-none">{format(new Date(incident.incidentDate), 'MMM dd, yyyy')}</span>
                                                    <span className="text-[8px] text-gray-400 font-bold leading-none">{format(new Date(incident.incidentDate), 'HH:mm')}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex justify-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter leading-none ${incident.severity === 'High' ? 'bg-red-100 text-red-700' :
                                                        incident.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {incident.severity}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex justify-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase leading-none ${incident.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                                        incident.status === 'IN REVIEW' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {incident.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="flex justify-end">
                                                    <div className="w-5 h-5 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:bg-emerald-100/50 transition-all">
                                                        <ChevronRight size={10} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col gap-2 p-2 bg-slate-50 dark:bg-gray-950/20">
                            {paginatedIncidents.map((incident) => (
                                <div
                                    key={incident._id}
                                    onClick={() => setSelectedIncident(incident)}
                                    className="bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${incident.severity === 'High' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' :
                                                    incident.severity === 'Medium' ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]' :
                                                        'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'
                                                    }`} />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-mono leading-none">{incident.incidentId}</span>
                                            </div>
                                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white leading-none mt-1">{incident.incidentType}</h4>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase leading-none ${incident.status === 'OPEN' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                            incident.status === 'IN REVIEW' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            }`}>
                                            {incident.status}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-1.5 rounded border border-gray-100 dark:border-gray-800/50 mb-2">
                                        <p className="text-[9px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight font-medium">
                                            {incident.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-wide leading-none">
                                                <Calendar size={8} className="text-emerald-500" />
                                                {format(new Date(incident.incidentDate), 'MMM dd')}
                                            </div>
                                            <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-wide leading-none">
                                                <Clock size={8} className="text-blue-500" />
                                                {format(new Date(incident.incidentDate), 'HH:mm')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 text-[8px] font-black uppercase text-emerald-600 leading-none">
                                            Details <ChevronRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-2 md:px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="hidden md:block text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Showing <span className="text-gray-900 dark:text-white">{startIndex + 1}</span> to <span className="text-gray-900 dark:text-white">{Math.min(startIndex + ITEMS_PER_PAGE, filteredIncidents.length)}</span> of {filteredIncidents.length}
                        </div>
                        <div className="block md:hidden text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Page {currentPage} / {totalPages}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <ChevronLeft size={12} />
                            </button>

                            <div className="hidden md:flex gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-6 h-6 rounded text-[8px] font-black transition-all ${currentPage === page
                                            ? 'bg-emerald-500 text-white '
                                            : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-gray-800'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setSelectedIncident(null)}
                    />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900 z-10">
                            <div>
                                <h3 className="text-lg md:text-xl font-black font-semibold text-gray-900 dark:text-white uppercase tracking-tight">
                                    Incident Review
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    ID: {selectedIncident.incidentId} • Severity: {selectedIncident.severity}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedIncident(null)}
                                className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 overflow-y-auto space-y-6 md:space-y-8 hide-scrollbar">
                            {/* Incident Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-2 opacity-60">
                                        <AlertTriangle size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Occurrence</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase italic">{selectedIncident.incidentType}</p>
                                </div>
                                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-2 opacity-60">
                                        <Calendar size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Reported On</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase italic">
                                        {format(new Date(selectedIncident.createdAt), 'MMM dd | HH:mm')}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 mb-3 opacity-60">
                                    <MessageSquare size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Clinical Narrative</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                    {selectedIncident.description}
                                </p>
                            </div>

                            {/* Photo Evidence Section */}
                            {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                                <div className="p-6 bg-purple-50 dark:bg-purple-500/5 rounded-3xl border border-purple-100 dark:border-purple-500/20">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-purple-500 text-white rounded-lg">
                                            <ImageIcon size={16} />
                                        </div>
                                        <h4 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">Photo Evidence</h4>
                                        <span className="ml-auto text-[10px] font-bold text-purple-600/60">
                                            {selectedIncident.attachments.length} {selectedIncident.attachments.length === 1 ? 'Image' : 'Images'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {selectedIncident.attachments.map((attachment: any, index: number) => (
                                            <a
                                                key={attachment._id || index}
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative aspect-square rounded-xl overflow-hidden border-2 border-purple-100 dark:border-purple-500/20 hover:border-purple-500 transition-all hover:scale-105"
                                            >
                                                <img
                                                    src={attachment.url}
                                                    alt={attachment.fileName || `Evidence ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="p-2 bg-white rounded-lg">
                                                            <Download size={16} className="text-gray-900" />
                                                        </div>
                                                    </div>
                                                </div>
                                                {attachment.fileName && (
                                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                                        <p className="text-[8px] font-bold text-white truncate">
                                                            {attachment.fileName}
                                                        </p>
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Admin Response Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <h4 className="text-lg font-black uppercase font-semibold"> Response</h4>
                                </div>

                                {selectedIncident.adminResponse ? (
                                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[0.5rem] border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-black">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-gray-400 t dark:text-black/50  tracking-widest mb-2">Administrator Feedback</p>
                                                <p className="text-base font-bold italic leading-relaxed">
                                                    "{selectedIncident.adminResponse.message}"
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 py-4 border-y border-white/10 dark:border-black/10">
                                                <div className="p-2 bg-white/10 dark:bg-black/10 rounded-xl">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-gray-400 dark:text-black/50 uppercase tracking-widest">Remediation Action</p>
                                                    <p className="text-sm font-bold uppercase">{selectedIncident.adminResponse.actionTaken}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center opacity-40">
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Authored by {selectedIncident.adminResponse.adminId.name}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest">{format(new Date(selectedIncident.adminResponse.respondedAt), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 md:p-10 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl text-gray-300 mb-4">
                                            <AlertCircle size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">Response Protocol Pending</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Awaiting administrative oversight</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
