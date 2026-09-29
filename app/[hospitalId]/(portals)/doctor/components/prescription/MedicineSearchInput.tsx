'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Pill, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { pharmacyService } from '@/lib/integrations/services/pharmacy.service';

interface MedicineSearchInputProps {
  hospitalId: string;
  onSelect: (medicine: any) => void;
}

export const MedicineSearchInput: React.FC<MedicineSearchInputProps> = ({ hospitalId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const fetchMedicines = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        // Using existing pharmacy products endpoint to get available medicines
        const response = await pharmacyService.getProducts({
          hospitalId,
          search: debouncedQuery,
          limit: 10,
        });
        setResults(response.data || []);
      } catch (error) {
        console.error('Failed to fetch medicines:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, [debouncedQuery, hospitalId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (med: any) => {
    onSelect({
      name: med.name,
      productId: med._id,
      genericName: med.genericName,
      dosage: med.strength || '100mg', // Default to existing strength if available
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleCustomAdd = () => {
    if (query.trim()) {
      onSelect({
        name: query.trim(),
        productId: null,
        dosage: '100mg'
      });
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search size={16} />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-theme rounded-xl text-sm focus:ring-2 focus:ring-primary-theme outline-none transition-all"
          placeholder="Search for medicines by brand or generic name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results.length > 0) handleSelect(results[0]);
              else handleCustomAdd();
            }
          }}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-theme">
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-900 border border-border-theme rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 pb-1">Pharmacy Inventory Matches</div>
              {results.map((med) => (
                <button
                  key={med._id}
                  className="w-full text-left px-3 py-2 hover:bg-primary-theme/10 dark:hover:bg-gray-800 rounded-lg flex items-start gap-3 transition-colors"
                  onClick={() => handleSelect(med)}
                >
                  <div className="mt-1 w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Pill size={12} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{med.name}</div>
                    <div className="text-[10px] text-muted-foreground flex gap-2">
                      <span>{med.genericName || 'No Generic Info'}</span>
                      {med.strength && <span>• {med.strength}</span>}
                      {med.stock > 0 ? (
                        <span className="text-emerald-500 font-medium">• In Stock ({med.stock})</span>
                      ) : (
                        <span className="text-rose-500 font-medium">• Out of Stock</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <div className="border-t border-border-theme my-2"></div>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors text-primary-theme text-sm font-bold"
                onClick={handleCustomAdd}
              >
                <Search size={14} /> Add custom medicine "{query}"
              </button>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">No inventory matches found for "{query}"</p>
              <button
                className="px-4 py-2 bg-primary-theme/10 text-primary-theme hover:bg-primary-theme/20 rounded-lg flex items-center justify-center gap-2 transition-colors w-full text-sm font-bold"
                onClick={handleCustomAdd}
              >
                <Check size={16} /> Add as Custom Medicine
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
