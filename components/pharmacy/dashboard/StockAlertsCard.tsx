import React from 'react';
import { BellRing, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface StockAlertsCardProps {
    lowStockCount: number;
    expiringSoonCount: number;
    onViewAlerts?: () => void;
}

const StockAlertsCard: React.FC<StockAlertsCardProps> = ({ lowStockCount, expiringSoonCount, onViewAlerts }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
                            <BellRing size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Stock Alerts</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Critical Inventory Monitor</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="group flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-700/50 transition-all hover:bg-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Low Stock SKUs</span>
                        </div>
                        <span className="text-xl font-black text-red-600 transition-transform group-hover:scale-110">{lowStockCount}</span>
                    </div>

                    <div className="group flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-700/50 transition-all hover:bg-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Expiring Soon</span>
                        </div>
                        <span className="text-xl font-black text-amber-600 transition-transform group-hover:scale-110">{expiringSoonCount}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <button
                    onClick={onViewAlerts}
                    className="w-full py-3.5 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                >
                    System Registry Audit
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default StockAlertsCard;
