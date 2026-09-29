'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ExternalLink, 
  TrendingUp, 
  ArrowUpRight, 
  Wallet,
  CreditCard,
  Banknote,
  Info,
  ChevronRight,
  Search
} from 'lucide-react';
import { staffService } from '@/lib/integrations';
import toast from 'react-hot-toast';

function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayroll();
  }, []);

  const loadPayroll = async () => {
    try {
      setLoading(true);
      const data = await staffService.getPayroll();
      setPayroll(data.payroll || []);
    } catch (error) {
      console.error('Failed to load payroll:', error);
      toast.error('Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const latestPay = payroll[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll & Salary</h1>
          <p className="text-gray-500 mt-1">Manage your payslips, tax certificates, and banking information.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95">
            <Download className="w-4 h-4" /> Latest Payslip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Latest Summary Card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-stretch relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100"></div>
            
            <div className="flex-1 space-y-6">
              <div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-indigo-100">Latest Payment</span>
                <h2 className="text-4xl font-black text-gray-900 mt-3">{formatCurrency(latestPay?.netPay || 0)}</h2>
                <p className="text-gray-500 text-sm mt-1">For {latestPay?.month} {latestPay?.year} • Paid on {new Date(latestPay?.paidAt).toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Base Salary</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(latestPay?.baseSalary || 0)}</p>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest">Allowances</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">+{formatCurrency(latestPay?.allowances || 0)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 bg-gray-900 rounded-3xl text-white md:w-64 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-indigo-600 opacity-10 pointer-events-none"></div>
               <div>
                  <div className="flex items-center justify-between mb-4">
                    <Wallet className="w-6 h-6 text-indigo-400" />
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Net Pay</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(latestPay?.netPay || 0)}</p>
               </div>
               
               <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Tax Deductions</span>
                    <span className="text-red-400 font-bold">-{formatCurrency(latestPay?.deductions || 0)}</span>
                  </div>
                  <div className="w-full h-px bg-white/10"></div>
                  <button className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10">
                    View Structure <ExternalLink className="w-3 h-3" />
                  </button>
               </div>
            </div>
          </div>

          {/* History List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
               <h3 className="font-bold text-gray-900">Payment History</h3>
               <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                     <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input type="text" placeholder="Search year..." className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-32" />
                  </div>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 hover:bg-indigo-50 rounded-lg">Export All</button>
               </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Month/Year</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Net Pay</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payroll.map((pay) => (
                  <tr key={pay.id} className="hover:bg-gray-50 group text-sm">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{pay.month}</span>
                        <span className="text-gray-400 text-xs">{pay.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(pay.netPay)}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                         pay.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                         {pay.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 hover:bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 opacity-0 group-hover:opacity-100">
                         <Download className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-4 bg-gray-50/30 border-t border-gray-100 text-center">
               <button className="text-xs font-bold text-gray-400 hover:text-indigo-600">Load earlier payment records</button>
            </div>
          </div>
        </div>

        {/* Sidebar Info Area */}
        <div className="lg:col-span-1 space-y-6">
           {/* Bank Info */}
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-indigo-600" />
                Bank Details
              </h3>
              
              <div className="space-y-4">
                 <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-indigo-200">
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150"></div>
                    <div className="relative z-10 flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Primary Account</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">HDFC **** 8921</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 border-dashed hover:bg-indigo-50/30 hover:border-indigo-300 group flex items-center gap-4 cursor-pointer">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-gray-400 group-hover:text-indigo-600 group-hover:border-indigo-200">
                       <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-indigo-600">Investment/PF Settings</span>
                 </div>
              </div>

              <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-3">
                 <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-indigo-700 leading-relaxed font-bold">Salary is usually credited by the 5th of every month. Please ensure your PAN and Bank details are updated for seamless credit.</p>
              </div>
           </div>

           {/* Stats/Quick Actions */}
           <div className="bg-indigo-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150"></div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Total Earnings (2025)</p>
              <h3 className="text-2xl font-black mt-2">{formatCurrency(540000)}</h3>
              
              <div className="mt-8 space-y-4">
                 <button className="w-full flex items-center justify-between text-sm py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/5 shadow-inner">
                    <span>Tax Declaration</span>
                    <ChevronRight className="w-4 h-4 text-indigo-300" />
                 </button>
                 <button className="w-full flex items-center justify-between text-sm py-3 px-4 bg-white hover:bg-indigo-50 text-indigo-900 font-bold rounded-xl shadow-lg active:scale-95">
                    <span>Income Certificate (Form 16)</span>
                    <ChevronRight className="w-4 h-4 text-indigo-600 opacity-50" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PayrollPage);
