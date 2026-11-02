'use client';

import React, { useEffect, useState, use } from 'react';
import { ArrowLeft, Printer, MessageCircle, Loader2, AlertCircle } from 'lucide-react';

interface ReceiptPageProps {
  params: Promise<{ type: string; id: string }>;
}

export default function ReceiptViewPage({ params }: ReceiptPageProps) {
  const { type, id } = use(params);
  const [data, setData] = useState<{ html: string; title: string; caption: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/receipts/${type}/${id}`);
        const json = await res.json();
        if (!json.success || !json.html) {
          throw new Error(json.error || 'Failed to load receipt');
        }
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error loading receipt');
      } finally {
        setLoading(false);
      }
    }
    fetchReceipt();
  }, [type, id]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Generating official document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Document Unavailable</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Sticky Action Toolbar (Hidden during print) */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">{data.title}</h1>
            <p className="text-xs text-slate-500 font-medium">Official MSCureChain Record</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </header>

      {/* Embedded Document Frame */}
      <main className="flex-1 p-2 sm:p-6 flex justify-center">
        <iframe
          srcDoc={data.html}
          title={data.title}
          className="w-full max-w-4xl bg-white shadow-xl rounded-xl border border-slate-200 min-h-[85vh]"
          style={{ border: 'none' }}
        />
      </main>
    </div>
  );
}
