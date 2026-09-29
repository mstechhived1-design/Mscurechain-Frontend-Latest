'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Clock, Mail, LogOut, RefreshCcw } from 'lucide-react';

interface LicenseLockProps {
    message: string;
    onRefresh: () => void;
    onLogout: () => void;
    hospitalId?: string;
    portalName?: string;
}

const LicenseLock: React.FC<LicenseLockProps> = ({ 
    message, 
    onRefresh, 
    onLogout, 
    hospitalId,
    portalName = 'Portal'
}) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-50/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden"
            >
                {/* Clean header accent */}
                <div className="h-2 w-full bg-indigo-600"></div>

                <div className="p-10 text-center">
                    {/* Icon container */}
                    <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-8 shadow-inner">
                        <ShieldAlert size={48} strokeWidth={1.5} />
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                        Access Restricted
                    </h2>
                    
                    <div className="space-y-4 mb-10">
                        <p className="text-slate-500 text-base leading-relaxed font-medium">
                            {message}
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock size={12} />
                            Pending License Renewal
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={onRefresh}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4.5 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-base active:scale-95"
                        >
                            <RefreshCcw size={18} /> Refresh Status
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => window.open(`mailto:support@curechain.com?subject=${portalName} Access Restricted - ${hospitalId}`)}
                                className="bg-white hover:bg-slate-50 text-slate-600 font-bold py-3.5 rounded-2xl transition-all border border-slate-200 text-sm active:scale-95"
                            >
                                Contact Support
                            </button>
                            <button 
                                onClick={onLogout}
                                className="bg-white hover:bg-red-50 text-red-500 font-bold py-3.5 rounded-2xl transition-all border border-red-100 text-sm active:scale-95"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">
                            CureChain Institutional Governance
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LicenseLock;
