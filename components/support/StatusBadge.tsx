import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
    const normalize = (str: string) => str?.toLowerCase().trim() || '';
    let style = 'bg-slate-50 text-slate-400 border border-slate-100';
    let Icon = AlertCircle;
    let label = status || 'Node';

    const normalizedStatus = normalize(status);

    if (normalizedStatus === 'open') {
        style = 'bg-rose-50 text-rose-600 border border-rose-100';
    } else if (normalizedStatus === 'in-progress' || normalizedStatus === 'in progress') {
        style = 'bg-teal-50 text-teal-600 border border-teal-100';
        Icon = Clock;
        label = 'In Progress';
    } else if (normalizedStatus === 'resolved') {
        style = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        Icon = CheckCircle;
    } else if (normalizedStatus === 'closed') {
        style = 'bg-slate-100 text-slate-500 border border-slate-200';
        Icon = CheckCircle;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${style} ${className}`}>
            <Icon size={10} />
            {label}
        </span>
    );
};

export default StatusBadge;
