"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, Briefcase } from 'lucide-react';

interface TagInputProps {
    label: string;
    placeholder: string;
    options: string[];
    selectedItems: string[];
    onAdd: (item: string) => void;
    onRemove: (item: string) => void;
    icon?: React.ReactNode;
    allowCustom?: boolean;
    className?: string;
    accentColor?: string; // e.g. 'emerald', 'blue', 'amber'
}

export const TagInput: React.FC<TagInputProps> = ({
    label,
    placeholder,
    options,
    selectedItems,
    onAdd,
    onRemove,
    icon,
    allowCustom = true,
    className = "",
    accentColor = "emerald"
}) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Color mapping for dynamic themes
    const COLOR_MAP = {
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-100 dark:border-emerald-900/30',
            hoverBorder: 'hover:border-emerald-200',
            ring: 'focus:ring-emerald-500',
            tagBg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
            tagText: 'text-emerald-700 dark:text-emerald-400',
            btnBg: 'bg-emerald-600 hover:bg-emerald-700',
            pulsing: 'bg-emerald-500'
        },
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-100 dark:border-blue-900/30',
            hoverBorder: 'hover:border-blue-200',
            ring: 'focus:ring-blue-500',
            tagBg: 'bg-blue-50/50 dark:bg-blue-900/10',
            tagText: 'text-blue-700 dark:text-blue-400',
            btnBg: 'bg-blue-600 hover:bg-blue-700',
            pulsing: 'bg-blue-500'
        },
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-100 dark:border-amber-900/30',
            hoverBorder: 'hover:border-amber-200',
            ring: 'focus:ring-amber-500',
            tagBg: 'bg-amber-50/50 dark:bg-amber-900/10',
            tagText: 'text-amber-700 dark:text-amber-400',
            btnBg: 'bg-amber-600 hover:bg-amber-700',
            pulsing: 'bg-amber-500'
        },
        indigo: {
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            text: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-100 dark:border-indigo-900/30',
            hoverBorder: 'hover:border-indigo-200',
            ring: 'focus:ring-indigo-500',
            tagBg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
            tagText: 'text-indigo-700 dark:text-indigo-400',
            btnBg: 'bg-indigo-600 hover:bg-indigo-700',
            pulsing: 'bg-indigo-500'
        }
    };

    const colorClasses = COLOR_MAP[accentColor as keyof typeof COLOR_MAP] || COLOR_MAP.emerald;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(query.toLowerCase()) &&
        !selectedItems.some(item => item.toLowerCase() === opt.toLowerCase())
    );

    const handleAddItem = (item: string) => {
        if (!item.trim()) return;
        onAdd(item);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className={`space-y-4 ${className}`} ref={dropdownRef}>
            <label className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1 block">
                {label}
            </label>
            
            <div className="relative group">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem(query)}
                        placeholder={placeholder}
                        className={`w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none transition-all shadow-sm ${colorClasses.hoverBorder} dark:${colorClasses.hoverBorder.replace('hover:border-', 'hover:border-')}/30 font-medium focus:ring-2 ${colorClasses.ring}`}
                    />
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${colorClasses.text} flex items-center justify-center ${colorClasses.bg} w-8 h-8 rounded-lg shadow-inner`}>
                        <Search size={16} />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl py-3 z-[70] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-xl">
                        <div className="px-4 pb-2 mb-2 border-b border-gray-50 dark:border-gray-800/50 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Options</span>
                            <span className={`text-[10px] font-bold ${colorClasses.text} ${colorClasses.bg} px-2 py-0.5 rounded-full`}>{options.length} Total</span>
                        </div>
                        
                        {filteredOptions.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => handleAddItem(opt)}
                                className={`w-full text-left px-5 py-3 hover:${colorClasses.bg} text-sm font-bold text-gray-700 dark:text-gray-300 transition-all flex items-center justify-between group border-l-2 border-transparent hover:border-${accentColor}-500`}
                            >
                                <span>{opt}</span>
                                <div className={`w-6 h-6 rounded-full ${colorClasses.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100`}>
                                    <Plus size={14} className={colorClasses.text} />
                                </div>
                            </button>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Search size={20} className="text-gray-300" />
                                </div>
                                <p className="text-xs text-gray-400 font-bold uppercase italic tracking-wider">No matching results found</p>
                                {query.trim() && allowCustom && (
                                    <button
                                        type="button"
                                        onClick={() => handleAddItem(query)}
                                        className={`mt-4 text-[10px] ${colorClasses.btnBg} text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-${accentColor}-500/20 active:scale-95`}
                                    >
                                        Add Custom: "{query}"
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2.5 mt-4">
                {selectedItems.map((item) => (
                    <div key={item} className={`px-4 py-2.5 ${colorClasses.tagBg} ${colorClasses.tagText} rounded-xl text-xs font-black uppercase tracking-wider border ${colorClasses.border} flex items-center gap-3 group shadow-sm hover:shadow-md hover:${colorClasses.hoverBorder} transition-all animate-in zoom-in-95 duration-200`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${colorClasses.pulsing} animate-pulse`}></div>
                        {item}
                        <button
                            type="button"
                            onClick={() => onRemove(item)}
                            className={`p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-gray-300 dark:text-gray-600 hover:text-rose-500 transform transition-all hover:rotate-90`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                
                {selectedItems.length === 0 && (
                    <div className="w-full h-24 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-400 animate-pulse">
                        {icon || <Briefcase size={20} className="mb-2 opacity-20" />}
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No {label} Assigned</p>
                    </div>
                )}
            </div>
        </div>
    );
};
