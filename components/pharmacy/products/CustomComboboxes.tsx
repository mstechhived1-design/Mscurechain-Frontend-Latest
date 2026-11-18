'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Sparkles, Check } from 'lucide-react';
import { useParams } from 'next/navigation';

const DEFAULT_FORMS = [
    'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT',
    'DROPS', 'POWDER', 'SUSPENSION', 'GEL', 'LOTION', 'INHALER',
    'SPRAY', 'PATCH', 'SACHET', 'SUPPOSITORY', 'SOLUTION',
    'SR TAB', 'SR CAP', 'GRANULES', 'RESPULES', 'CHEWABLE',
    'EMULSION', 'ELIXIR', 'MOUTHWASH', 'EYE DROP', 'EAR DROP', 'NASAL SPRAY',
    'LINIMENT', 'PASTE', 'PAINT', 'TINCTURE', 'VACCINE', 'INFUSION', 'OTHER'
];

const DEFAULT_SCHEDULES = [
    'OTC (Over the Counter)',
    'H (Schedule H)',
    'H1 (Schedule H1)',
    'X (Schedule X)',
    'G (Schedule G)',
    'K (Schedule K)',
    'Ayurvedic',
    'Narcotic',
    'Schedule C',
    'Prescription Only',
    'Unscheduled',
];

interface ComboboxProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    storageKeyPrefix: 'form' | 'schedule';
    defaultOptions: string[];
}

export const CustomCombobox: React.FC<ComboboxProps> = ({
    value,
    onChange,
    placeholder = 'Type or select...',
    storageKeyPrefix,
    defaultOptions,
}) => {
    const params = useParams();
    const hospitalId = (params?.hospitalId as string) || 'default_pharma';
    const storageKey = `msc_custom_${storageKeyPrefix}_${hospitalId}`;

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [customOptions, setCustomOptions] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Load custom words for this pharmacy from storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setCustomOptions(parsed);
                }
            }
        } catch {
            // Ignore
        }
    }, [storageKey]);

    const saveCustomWord = (word: string) => {
        const trimmed = word.trim();
        if (!trimmed) return;
        const exists = defaultOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase()) ||
            customOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
            const updated = [trimmed, ...customOptions].slice(0, 50);
            setCustomOptions(updated);
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch {
                // Ignore
            }
        }
    };

    // Combined unique list
    const allOptions = Array.from(new Set([...customOptions, ...defaultOptions]));

    // Check if the user is actively typing a search filter that differs from current value
    const isUserTyping =
        open &&
        search.trim() !== '' &&
        search.trim().toLowerCase() !== (value || '').trim().toLowerCase();

    const filtered = allOptions.filter((opt) =>
        opt.toLowerCase().includes(search.trim().toLowerCase())
    );

    // If the user opened the dropdown without typing a new search, show ALL options!
    const displayOptions = isUserTyping ? filtered : allOptions;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                if (open && isUserTyping && search.trim()) {
                    saveCustomWord(search);
                }
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, isUserTyping, search, customOptions]);

    const handleSelect = (opt: string) => {
        onChange(opt);
        saveCustomWord(opt);
        setSearch('');
        setOpen(false);
    };

    const isCustomTyped =
        isUserTyping &&
        !allOptions.some((o) => o.toLowerCase() === search.trim().toLowerCase());

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={open ? search : (value || '')}
                    placeholder={placeholder}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none pr-10"
                    onFocus={() => {
                        setOpen(true);
                        setSearch(value || '');
                        setTimeout(() => inputRef.current?.select(), 40);
                    }}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearch(val);
                        setOpen(true);
                        onChange(val);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (search.trim()) {
                                handleSelect(search.trim());
                            }
                        }
                    }}
                />
                <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => {
                        if (!open) {
                            setOpen(true);
                            setSearch(value || '');
                            inputRef.current?.focus();
                            setTimeout(() => inputRef.current?.select(), 40);
                        } else {
                            setOpen(false);
                        }
                    }}
                    tabIndex={-1}
                >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl divide-y divide-gray-100 dark:divide-gray-700">
                    {/* Add Custom Word Prompt */}
                    {isCustomTyped && (
                        <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-xs font-black text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center justify-between transition-colors bg-teal-50/50"
                            onClick={() => handleSelect(search.trim())}
                        >
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={13} className="text-teal-500" />
                                Add Custom: <span className="underline decoration-teal-500">{search.trim()}</span>
                            </span>
                            <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.5 rounded">
                                Save
                            </span>
                        </button>
                    )}

                    {displayOptions.length > 0 ? (
                        displayOptions.map((opt) => {
                            const isSelected = opt.toLowerCase() === (value || '').toLowerCase();
                            const isCustomSaved = customOptions.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                                        isSelected
                                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isSelected && <Check size={13} className="text-teal-600" />}
                                        <span>{opt}</span>
                                    </div>
                                    {isCustomSaved && (
                                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                            Custom
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="p-3 text-center text-xs text-gray-400">
                            Press Enter to use <span className="font-bold text-gray-700 dark:text-gray-200">"{search}"</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const FormCombobox: React.FC<{ value: string; onChange: (val: string) => void }> = ({
    value,
    onChange,
}) => (
    <CustomCombobox
        value={value}
        onChange={onChange}
        placeholder="Type or select form factor (e.g. TABLET, SYRUP)..."
        storageKeyPrefix="form"
        defaultOptions={DEFAULT_FORMS}
    />
);

export const ScheduleCombobox: React.FC<{ value: string; onChange: (val: string) => void }> = ({
    value,
    onChange,
}) => (
    <CustomCombobox
        value={value}
        onChange={onChange}
        placeholder="Type or select schedule (e.g. OTC, Schedule H)..."
        storageKeyPrefix="schedule"
        defaultOptions={DEFAULT_SCHEDULES}
    />
);
