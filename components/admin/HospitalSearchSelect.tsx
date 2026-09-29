'use client';

/**
 * HospitalSearchSelect
 * ─────────────────────────────────────────────────────────────────────────────
 * A reusable, accessible search-dropdown for selecting a hospital.
 *
 * Features:
 *  • Hybrid search: instant substring match across name, hospitalId, city, address
 *  • Keyboard accessible (arrow-up / arrow-down / Enter / Escape)
 *  • Click-outside dismissal
 *  • Clear (×) button once a hospital is selected
 *  • Skeleton loading state while hospitals are being fetched
 *  • Optimistic data: accepts an already-fetched hospitals list so it never
 *    fires its own API call — the parent controls the data lifecycle
 *
 * Usage:
 *   <HospitalSearchSelect
 *     hospitals={hospitals}
 *     loading={fetchingHospitals}
 *     value={formData.hospitalId}
 *     onChange={(id) => setFormData(p => ({ ...p, hospitalId: id }))}
 *     accentColor="blue"    // optional, default "blue"
 *     required
 *   />
 */

import React, { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { Search, X, Building2, ChevronDown, Loader2 } from 'lucide-react';
import type { Hospital } from '@/lib/integrations';

type AccentColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'cyan';

interface HospitalSearchSelectProps {
  hospitals: Hospital[];
  loading?: boolean;
  value: string;                        // selected hospitalId (_id)
  onChange: (hospitalId: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  accentColor?: AccentColor;
  className?: string;
  disabled?: boolean;
}

const ACCENT: Record<AccentColor, { ring: string; badge: string; text: string; hover: string }> = {
  blue:   { ring: 'focus-within:ring-blue-500/30',   badge: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',   text: 'text-blue-600',   hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/10' },
  purple: { ring: 'focus-within:ring-purple-500/30', badge: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300', text: 'text-purple-600', hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/10' },
  green:  { ring: 'focus-within:ring-green-500/30',  badge: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',   text: 'text-green-600',  hover: 'hover:bg-green-50 dark:hover:bg-green-900/10' },
  red:    { ring: 'focus-within:ring-red-500/30',    badge: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',             text: 'text-red-600',    hover: 'hover:bg-red-50 dark:hover:bg-red-900/10' },
  orange: { ring: 'focus-within:ring-orange-500/30', badge: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300', text: 'text-orange-600', hover: 'hover:bg-orange-50 dark:hover:bg-orange-900/10' },
  cyan:   { ring: 'focus-within:ring-cyan-500/30',   badge: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',   text: 'text-cyan-600',   hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/10' },
};

// Hybrid search: name, hospitalId, city, address, pincode
function filterHospitals(hospitals: Hospital[], query: string): Hospital[] {
  if (!query.trim()) return hospitals;
  const q = query.toLowerCase();
  return hospitals.filter(h =>
    h.name?.toLowerCase().includes(q) ||
    h.hospitalId?.toLowerCase().includes(q) ||
    (h as any).city?.toLowerCase().includes(q) ||
    h.address?.toLowerCase().includes(q) ||
    (h as any).pincode?.toLowerCase().includes(q)
  );
}

export function HospitalSearchSelect({
  hospitals,
  loading = false,
  value,
  onChange,
  label = 'Assign to Hospital',
  required = false,
  placeholder = 'Search hospital by name, ID, or city…',
  accentColor = 'blue',
  className = '',
  disabled = false,
}: HospitalSearchSelectProps) {
  const accent = ACCENT[accentColor];
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const selectedHospital = hospitals.find(h => h._id === value) ?? null;
  const filtered = filterHospitals(hospitals, query);

  // ── Close on click-outside ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Reset cursor when filtered list changes ────────────────────────────────
  useEffect(() => { setCursor(-1); }, [query]);

  // ── Scroll active item into view ──────────────────────────────────────────
  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const el = listRef.current.children[cursor] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [cursor]);

  const handleSelect = useCallback((hospital: Hospital) => {
    onChange(hospital._id);
    setQuery('');
    setOpen(false);
    setCursor(-1);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
    setOpen(true);
  }, [onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCursor(c => Math.min(c + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCursor(c => Math.max(c - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (cursor >= 0 && filtered[cursor]) handleSelect(filtered[cursor]);
        break;
      case 'Escape':
        setOpen(false);
        setCursor(-1);
        break;
    }
  };

  // ── Hidden native input for required constraint ────────────────────────────
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label */}
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Trigger / Search Input */}
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-200 ${accent.ring} focus-within:ring-2 ${
          selectedHospital
            ? `border-2 ${accent.badge}`
            : 'border'
        } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-text'}`}
        style={{ borderColor: selectedHospital ? undefined : 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
      >
        {/* Icon */}
        <div className="pl-3 shrink-0">
          {loading
            ? <Loader2 size={16} className="animate-spin text-gray-400" />
            : <Search size={16} className="text-gray-400" />
          }
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={selectedHospital && !query ? selectedHospital.name : query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading hospitals…' : placeholder}
          disabled={disabled || loading}
          className="flex-1 px-3 py-3 bg-transparent outline-none text-sm font-medium placeholder:text-gray-400 placeholder:font-normal"
          style={{ color: 'var(--text-color)' }}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear or Chevron */}
        <div className="pr-3 shrink-0 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Hidden required proxy */}
      {required && (
        <input
          tabIndex={-1}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          required
          value={value}
          onChange={() => {}}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-[100] w-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          {/* Skeleton while loading */}
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-1 py-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm opacity-50 italic">
              No hospitals match &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div ref={listRef} className="max-h-60 overflow-y-auto">
              {filtered.map((hospital, idx) => (
                <button
                  key={hospital._id}
                  type="button"
                  onClick={() => handleSelect(hospital)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b last:border-b-0 transition-colors ${
                    idx === cursor ? (accent.hover + ' ' + accent.text) : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  } ${hospital._id === value ? 'font-semibold ' + accent.text : ''}`}
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    hospital._id === value ? accent.badge : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Building2 size={14} className={hospital._id === value ? accent.text : 'text-gray-400'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-color)' }}>
                      {hospital.name}
                    </p>
                    <p className="text-[10px] opacity-50 uppercase tracking-tighter mt-0.5 truncate">
                      {[(hospital as any).hospitalId, (hospital as any).city, (hospital as any).pincode]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {hospital._id === value && (
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${accent.badge} shrink-0`}>
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HospitalSearchSelect;
