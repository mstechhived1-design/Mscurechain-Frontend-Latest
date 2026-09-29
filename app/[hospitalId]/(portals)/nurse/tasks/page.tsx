'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    ChevronLeft,
    ChevronRight,
    ListTodo,
    AlertCircle,
    Filter,
    Calendar,
    Activity,
    FileText,
    User2
} from 'lucide-react';
import { NurseService } from '@/lib/integrations/services/nurse.service';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientCard {
    admissionId: string;
    patientName: string;
    admissionRef: string;
    tasks: any[]; // Vitals + Clinical Notes only
}

// ─── Task type config ─────────────────────────────────────────────────────────
const TASK_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    Vitals: {
        icon: <Activity size={12} className="shrink-0" />,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-100',
    },
    'Clinical Notes': {
        icon: <FileText size={12} className="shrink-0" />,
        color: 'text-sky-600',
        bg: 'bg-sky-50 border-sky-100',
    },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DailyTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isHistorical, setIsHistorical] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchTasks = React.useCallback(async () => {
        try {
            setLoading(true);

            const response = await NurseService.getTasks(1, 100, { date: selectedDate });

            if (response.data) {
                // Keep only Vitals & Clinical Notes — medications are in /nurse/patients
                const relevant = response.data.filter(
                    (t: any) => t.type !== 'Medication'
                );
                setTasks(relevant);
                setIsHistorical(response.isHistorical || false);
            }
        } catch (error) {
            console.error('Fetch tasks error:', error);
            toast.error('Failed to load tasks from server');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // ── Toggle completion ──────────────────────────────────────────────────────
    const toggleTask = async (taskId: string, currentStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (isHistorical) {
            toast.error('Historical tasks cannot be modified');
            return;
        }

        const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

        try {
            await NurseService.updateTaskStatus(taskId, newStatus as any);
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
            toast.success(`Task marked as ${newStatus}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update task');
        }
    };

    // ── Date nav ───────────────────────────────────────────────────────────────
    const handleDateChange = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    // ── Filter tasks ───────────────────────────────────────────────────────────
    const filteredTasks =
        filter === 'All'
            ? tasks
            : filter === 'Pending'
                ? tasks.filter(t => t.status !== 'Completed')
                : tasks.filter(t => t.status === 'Completed');

    // ── Group by patient / admission ───────────────────────────────────────────
    const groupByPatient = (taskList: any[]): PatientCard[] => {
        const map = new Map<string, PatientCard>();

        taskList.forEach(task => {
            const key = task.admission?._id || task.admission || task.patient?._id || task._id;
            if (!map.has(key)) {
                map.set(key, {
                    admissionId: key,
                    patientName: task.patient?.name || 'Unknown Patient',
                    admissionRef: task.admission?.admissionId || '',
                    tasks: [],
                });
            }
            map.get(key)!.tasks.push(task);
        });

        return Array.from(map.values());
    };

    const patientCards = groupByPatient(filteredTasks);

    const completedCount = tasks.filter(t => t.status === 'Completed').length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Loading Task Board...</p>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl lg:text-xl font-bold text-slate-900 uppercase tracking-tighter sm:tracking-tight">
                                Nurse Dashboard
                            </h1>
                            <p className="text-[10px] sm:text-sm text-slate-500 mt-1">
                                {new Date(selectedDate).toLocaleDateString('en-US', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                })}
                                {isHistorical && (
                                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] uppercase font-bold">
                                        Historical View
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Date navigation */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 shadow-inner">
                            <button
                                onClick={() => handleDateChange(-1)}
                                className="p-2 hover:bg-white hover:text-emerald-600 transition-all rounded-lg text-slate-400"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 text-xs font-bold text-slate-600 min-w-[100px] text-center">
                                {isHistorical ? selectedDate : 'Today'}
                            </span>
                            <button
                                onClick={() => handleDateChange(1)}
                                className="p-2 hover:bg-white hover:text-emerald-600 transition-all rounded-lg text-slate-400"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Progress ring */}
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 shadow-sm">
                            <div className="text-right">
                                <p className="text-[7px] sm:text-xs text-emerald-600/60 font-bold uppercase tracking-wider leading-none mb-1">
                                    Shift Progress
                                </p>
                                <p className="text-[10px] sm:text-sm font-bold text-emerald-700 leading-none">
                                    {completedCount} / {totalCount}
                                </p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-emerald-100/50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className="text-emerald-500 transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                </svg>
                                <span className="absolute text-[8px] sm:text-[10px] font-black text-emerald-600">
                                    {progress}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── FILTERS + CONTENT ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

                    {/* Left sidebar */}
                    <div className="lg:col-span-1 space-y-3 sm:space-y-4">
                        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] sm:text-sm font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <Filter size={12} className="text-slate-400 sm:size-4" /> Filter Tasks
                            </h3>
                            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:space-y-2">
                                {['All', 'Pending', 'Completed'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all ${filter === f
                                            ? 'bg-primary-theme text-white shadow-md'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span>{f}</span>
                                        <span className={`hidden lg:inline px-2 py-0.5 rounded text-[10px] font-bold ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {f === 'All'
                                                ? tasks.length
                                                : f === 'Pending'
                                                    ? tasks.filter(t => t.status !== 'Completed').length
                                                    : tasks.filter(t => t.status === 'Completed').length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Info box */}
                        <div className="bg-blue-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-100 hidden sm:block">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5 sm:size-5" />
                                <div>
                                    <h4 className="text-[10px] sm:text-sm font-bold text-blue-900">Task Policy</h4>
                                    <p className="text-[8px] sm:text-xs text-blue-700 mt-1 leading-relaxed">
                                        Tasks activate only after data entry. Medication administration is handled in <strong>Patient Monitoring</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main task list */}
                    <div className="lg:col-span-3 space-y-3 sm:space-y-4">
                        {patientCards.length > 0 ? (
                            patientCards.map((card) => (
                                <PatientTaskCard
                                    key={card.admissionId}
                                    card={card}
                                    isHistorical={isHistorical}
                                    onToggle={toggleTask}
                                />
                            ))
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                    <ListTodo size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                                <p className="text-sm text-slate-500">No tasks matching your current filter.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Patient Card Component ────────────────────────────────────────────────────
function PatientTaskCard({
    card,
    isHistorical,
    onToggle,
}: {
    card: PatientCard;
    isHistorical: boolean;
    onToggle: (id: string, status: string, e: React.MouseEvent) => void;
}) {
    const allDone = card.tasks.every(t => t.status === 'Completed');
    const someDone = card.tasks.some(t => t.status === 'Completed');

    return (
        <div
            className={`rounded-xl sm:rounded-2xl border overflow-hidden transition-all shadow-sm ${allDone
                ? 'bg-slate-50 border-slate-100'
                : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md'
                }`}
        >
            {/* Patient header */}
            <div
                className={`flex items-center gap-3 px-4 sm:px-5 py-3 border-b ${allDone ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-slate-50/60'
                    }`}
            >
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${allDone
                        ? 'bg-emerald-500 text-white'
                        : someDone
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                >
                    <User2 size={13} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm font-black truncate ${allDone ? 'text-slate-400' : 'text-slate-900'}`}>
                        {card.patientName}
                    </p>
                    {card.admissionRef && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            ADMISSION: {card.admissionRef}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${allDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : someDone
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {card.tasks.filter(t => t.status === 'Completed').length}/{card.tasks.length}
                    </span>
                </div>
            </div>

            {/* Sub-tasks (Vitals + Clinical Notes) */}
            <div className="divide-y divide-slate-50">
                {card.tasks.map((task: any) => {
                    const cfg = TASK_TYPE_CONFIG[task.type] || {
                        icon: <Circle size={12} />,
                        color: 'text-slate-500',
                        bg: 'bg-slate-100 border-slate-200',
                    };
                    const isDone = task.status === 'Completed';

                    return (
                        <div
                            key={task._id}
                            onClick={(e) => onToggle(task._id, task.status, e)}
                            className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 cursor-pointer transition-colors ${isDone
                                ? 'opacity-60'
                                : isHistorical
                                    ? 'opacity-70'
                                    : 'hover:bg-slate-50'
                                }`}
                        >
                            {/* Checkbox */}
                            <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : !isHistorical
                                        ? 'border-2 border-slate-300 hover:border-emerald-400'
                                        : 'bg-slate-100 border-2 border-slate-100'
                                    }`}
                            >
                                {isDone && <CheckCircle2 size={12} />}
                            </div>

                            {/* Task type badge + description */}
                            <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] sm:text-[11px] font-bold uppercase tracking-tight border shrink-0 ${cfg.bg} ${cfg.color}`}>
                                    {cfg.icon}
                                    {task.type}
                                </span>
                                <span className={`text-[11px] sm:text-xs font-medium truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                    {task.description || task.title}
                                </span>
                            </div>

                            {/* Priority badge */}
                            {(task.priority === 'High' || task.priority === 'Critical') && !isDone && (
                                <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-wide rounded border border-rose-100 shrink-0">
                                    {task.priority}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
