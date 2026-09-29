'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Zap } from 'lucide-react';
import { ClinicalAlert } from '@/lib/clinical/ClinicalRules';

interface ClinicalAlertPanelProps {
    alerts: ClinicalAlert[];
}

export const ClinicalAlertPanel: React.FC<ClinicalAlertPanelProps> = ({ alerts }) => {
    if (!alerts.length) return null;

    const colors: Record<string, string> = {
        emergency: 'bg-red-50 border-red-600 text-red-900',
        error:     'bg-rose-50 border-rose-500 text-rose-800',
        warning:   'bg-amber-50 border-amber-500 text-amber-800',
        info:      'bg-cyan-50 border-cyan-400 text-cyan-800',
    };

    return (
        <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-amber-500 fill-amber-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real-time Clinical Safety Monitor</h4>
            </div>
            {alerts.map((alert) => (
                <div 
                    key={alert.id} 
                    className={`flex items-start gap-4 p-4 rounded-2xl border-l-4 shadow-sm transition-all hover:scale-[1.01] ${colors[alert.type]}`}
                >
                    <div className="shrink-0 mt-0.5">
                        {alert.type === 'emergency' || alert.type === 'error' 
                            ? <ShieldAlert size={18} /> 
                            : alert.type === 'warning' 
                            ? <AlertTriangle size={18} /> 
                            : <Info size={18} />
                        }
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">{alert.specialty} ALERT</span>
                            {alert.type === 'emergency' && <span className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Critical</span>}
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-tight leading-snug">{alert.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
