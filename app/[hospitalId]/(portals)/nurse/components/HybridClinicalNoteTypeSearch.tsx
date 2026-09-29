'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { NurseService } from '@/lib/integrations/services/nurse.service';
import toast from 'react-hot-toast';

interface NoteType {
    _id: string;
    text: string;
}

interface HybridClinicalNoteTypeSearchProps {
    value: string;
    onSelect: (type: string) => void;
    className?: string;
}

const DEFAULT_NOTE_TYPES = [
    'Progress Note',
    'Nursing Assessment',
    'Medication Administration Note',
    'Post-Op Monitoring',
    'Incident',
    'Shift Handover'
];

const HybridClinicalNoteTypeSearch: React.FC<HybridClinicalNoteTypeSearchProps> = ({
    value,
    onSelect,
    className = "",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNoteTypes = async () => {
        try {
            setLoading(true);
            const data = await NurseService.getQuickNotes();
            setNoteTypes(data || []);
        } catch (error) {
            console.error("Failed to fetch nurse note types:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNoteTypes();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddType = async () => {
        if (!searchTerm.trim()) return;
        try {
            setAdding(true);
            await NurseService.addQuickNote({ text: searchTerm.trim() });
            toast.success("New template added");
            setSearchTerm("");
            fetchNoteTypes();
        } catch (error) {
            toast.error("Failed to add template");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteType = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await NurseService.deleteQuickNote(id);
            toast.success("Template removed");
            fetchNoteTypes();
            if (value === noteTypes.find(t => t._id === id)?.text) {
                onSelect("");
            }
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const allTypes = [
        ...DEFAULT_NOTE_TYPES.map(text => ({ _id: `default-${text}`, text, isDefault: true })),
        ...noteTypes
    ];

    const filteredTypes = allTypes.filter((t) =>
        t.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold cursor-pointer hover:border-teal-500 transition-all shadow-sm"
            >
                <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{value || "Select Note Type"}</span>
                </div>
                <div className="flex items-center gap-2">
                    {value && (
                        <X
                            size={14}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded-full hover:bg-rose-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect("");
                            }}
                        />
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size={14}
                            />
                            <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold outline-none focus:border-teal-500 transition-all placeholder:text-slate-300"
                                placeholder="Search or add type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchTerm && filteredTypes.length === 0) {
                                        e.preventDefault();
                                        handleAddType();
                                    }
                                }}
                                autoFocus
                            />
                            {searchTerm && filteredTypes.length === 0 && !loading && (
                                <button
                                    onClick={handleAddType}
                                    disabled={adding}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                                >
                                    {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {loading && noteTypes.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin text-teal-600" size={20} />
                            </div>
                        ) : filteredTypes.length > 0 ? (
                            filteredTypes.map((type) => (
                                <div
                                    key={type._id}
                                    onClick={() => {
                                        onSelect(type.text);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`group flex items-center justify-between px-4 py-3 text-[10px] sm:text-xs font-bold tracking-tight hover:bg-teal-50 hover:text-teal-700 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${value === type.text ? "bg-teal-50 text-teal-700" : "text-slate-600"}`}
                                >
                                    <span className="truncate">{type.text}</span>
                                    {!('isDefault' in type) && (
                                        <button
                                            onClick={(e) => handleDeleteType(e, type._id)}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center bg-white">
                                <FileText className="mx-auto text-slate-100 mb-2" size={32} />
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {searchTerm ? "No match found. Press Enter to add." : "No templates saved."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HybridClinicalNoteTypeSearch;
