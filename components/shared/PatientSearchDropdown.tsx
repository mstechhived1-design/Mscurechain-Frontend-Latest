"use client";
import React, { useState, useEffect } from "react";
import { Search, User, X } from "lucide-react";
import { useHelpdeskPatients } from "@/lib/integrations";
import { formatPatientDisplayName } from "@/lib/utils/name-utils";

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function PatientSearchDropdown({ onSelect, onCancel }: { onSelect: (patient: any) => void, onCancel?: () => void }) {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebouncedValue(searchTerm, 300);
    const { data: patientsRaw, isLoading } = useHelpdeskPatients(debouncedSearch, 1, 50, undefined, undefined, true);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onCancel?.();
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onCancel?.();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onCancel]);

    const patients = React.useMemo(() => {
        const raw: any = patientsRaw;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        return raw.data || [];
    }, [patientsRaw]);

    return (
        <div ref={dropdownRef} className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by name, MRN, phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border-0 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                        autoFocus
                    />
                </div>
                {onCancel && (
                    <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {isLoading ? (
                    <div className="p-4 text-center text-xs font-bold text-slate-400">Searching...</div>
                ) : patients.length === 0 ? (
                    <div className="p-4 text-center text-xs font-bold text-slate-400">No patients found</div>
                ) : (
                    patients.map((p: any) => {
                        const pId = p.user?._id || p._id || p.id;
                        const name = formatPatientDisplayName(p);
                        const mrn = p.mrn || p.profile?.mrn || 'N/A';
                        const mobile = p.user?.mobile || p.profile?.contactNumber || p.mobile || 'N/A';
                        
                        return (
                            <button
                                key={pId}
                                onClick={() => onSelect({ ...p, _id: pId, name, mrn, mobile })}
                                className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg transition-colors group flex items-start gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-500">MRN: {mrn}</span>
                                        <span className="text-[10px] text-slate-300">•</span>
                                        <span className="text-[10px] font-medium text-slate-500">{mobile}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
