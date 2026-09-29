'use client';

import React from 'react';
import { 
    Brain, 
    ShieldAlert, 
    UserPlus, 
    Mic2, 
    Heart, 
    Zap, 
    Coffee, 
    Scale,
    Activity,
    AlertCircle
} from 'lucide-react';

export const PsychiatryModule = ({ formData, setFormData }: any) => {
    const p = formData.psychiatryData || {};

    const updateData = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            psychiatryData: {
                ...(prev.psychiatryData || {}),
                [field]: value
            }
        }));
    };

    const updateMSE = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            psychiatryData: {
                ...(prev.psychiatryData || {}),
                mse: {
                    ...(prev.psychiatryData?.mse || {}),
                    [field]: value
                }
            }
        }));
    };

    const updateScore = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            psychiatryData: {
                ...(prev.psychiatryData || {}),
                scores: {
                    ...(prev.psychiatryData?.scores || {}),
                    [field]: value
                }
            }
        }));
    };

    const toggleChip = (field: string, value: string) => {
        const current = p[field] || [];
        const next = current.includes(value) ? current.filter((x: string) => x !== value) : [...current, value];
        updateData(field, next);
    };

    const toggleMSEThought = (value: string) => {
        const current = p.mse?.thought || [];
        const next = current.includes(value) ? current.filter((x: string) => x !== value) : [...current, value];
        updateMSE('thought', next);
    };

    const getScoreColor = (val: number, max: number) => {
        const ratio = val / max;
        if (ratio > 0.7) return 'text-red-600 bg-red-50 border-red-200';
        if (ratio > 0.4) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Standardized Light Header */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <Brain size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] leading-none mb-1 text-indigo-700">Psychiatry Assessment</h2>
                        <p className="text-[9px] font-bold text-indigo-600/60 uppercase tracking-widest">Mental Health & MSE Examination Profile</p>
                    </div>
                </div>
                <div className="bg-white border border-indigo-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600">
                    Psych - Module
                </div>
            </div>
            {/* A. Suicide Risk - HIGHEST PRIORITY */}
            <div className={`rounded-[2rem] p-6 border-4 transition-all duration-500 ${
                p.suicideRisk === 'High' 
                ? 'bg-red-50 border-red-600 shadow-2xl shadow-red-200 animate-pulse' 
                : 'bg-white border-slate-100 shadow-sm'
            }`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${p.suicideRisk === 'High' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-widest ${p.suicideRisk === 'High' ? 'text-red-600' : 'text-slate-800'}`}>Suicide Risk Assessment</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Life-critical classification</p>
                        </div>
                    </div>
                    {p.suicideRisk === 'High' && (
                        <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl animate-bounce">
                            <Zap size={14} className="fill-white" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Emergency Protocol Active</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    {['None', 'Low', 'Moderate', 'High'].map(level => (
                        <button
                            key={level}
                            onClick={() => updateData('suicideRisk', level)}
                            className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                p.suicideRisk === level 
                                ? (level === 'High' ? 'bg-red-600 text-white shadow-xl scale-105' : 'bg-indigo-600 text-white shadow-lg scale-105')
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-200'
                            }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* B. Presenting Complaints & Severity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         Major Symptoms
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {['Anxiety', 'Insomnia', 'Depression', 'Paranoia', 'Hallucinations', 'Panic Attacks', 'Agitation'].map(c => (
                            <button
                                key={c}
                                onClick={() => toggleChip('complaints', c)}
                                className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                                    p.complaints?.includes(c)
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Presentation Severity</h4>
                    <div className="space-y-3">
                        {['Mild', 'Moderate', 'Severe'].map(s => (
                            <button
                                key={s}
                                onClick={() => updateData('severity', s)}
                                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    p.severity === s 
                                    ? 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md' 
                                    : 'bg-white text-slate-400 border-2 border-slate-100 hover:border-slate-300'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* C. Mental Status Examination (MSE) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Mental Status Examination (MSE)</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comprehensive psychometric profile</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Behavior */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Behavior</label>
                        {['Normal', 'Agitated', 'Withdrawn'].map(v => (
                            <button
                                key={v}
                                onClick={() => updateMSE('behavior', v)}
                                className={`w-full py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    p.mse?.behavior === v ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Speech */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Speech</label>
                        {['Normal', 'Pressured', 'Slowed'].map(v => (
                            <button
                                key={v}
                                onClick={() => updateMSE('speech', v)}
                                className={`w-full py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    p.mse?.speech === v ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Mood */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mood</label>
                        {['Normal', 'Depressed', 'Elevated', 'Irritable'].map(v => (
                            <button
                                key={v}
                                onClick={() => updateMSE('mood', v)}
                                className={`w-full py-2.5 px-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    p.mse?.mood === v ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Thought Content */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-500">Thought Content</label>
                        {['Delusions', 'Hallucinations', 'Suicidal thoughts', 'Homicidal thoughts'].map(v => (
                            <button
                                key={v}
                                onClick={() => toggleMSEThought(v)}
                                className={`w-full py-2.5 px-2 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all text-left relative overflow-hidden ${
                                    p.mse?.thought?.includes(v) 
                                    ? 'bg-red-50 text-red-600 ring-2 ring-red-200' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-200 opacity-60'
                                }`}
                            >
                                {v}
                                {p.mse?.thought?.includes(v) && < Zap size={10} className="absolute right-3 top-1/2 -translate-y-1/2 fill-red-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 p-6 bg-slate-50 rounded-3xl">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Insight (1-5)</label>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{p.mse?.insight || '1'}</span>
                        </div>
                        <input
                            type="range" max="5" step="1"
                            value={p.mse?.insight || 1}
                            onChange={(e) => updateMSE('insight', e.target.value)}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Judgment (1-5)</label>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{p.mse?.judgment || '1'}</span>
                        </div>
                        <input
                            type="range" max="5" step="1"
                            value={p.mse?.judgment || 1}
                            onChange={(e) => updateMSE('judgment', e.target.value)}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                </div>
            </div>

            {/* D. Standardized Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border bg-white shadow-sm transition-all ${getScoreColor(p.scores?.phq9 || 0, 27)}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">PHQ-9 Score</h4>
                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Depression Monitoring</p>
                        </div>
                        <div className="text-3xl font-black">{(p.scores?.phq9 || 0)}<small className="text-sm opacity-50">/27</small></div>
                    </div>
                    <input 
                        type="range" max="27" 
                        value={p.scores?.phq9 || 0}
                        onChange={(e) => updateScore('phq9', e.target.value)}
                        className="w-full accent-current" 
                    />
                </div>

                <div className={`p-6 rounded-3xl border bg-white shadow-sm transition-all ${getScoreColor(p.scores?.gad7 || 0, 21)}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">GAD-7 Score</h4>
                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Anxiety Monitoring</p>
                        </div>
                        <div className="text-3xl font-black">{(p.scores?.gad7 || 0)}<small className="text-sm opacity-50">/21</small></div>
                    </div>
                    <input 
                        type="range" max="21" 
                        value={p.scores?.gad7 || 0}
                        onChange={(e) => updateScore('gad7', e.target.value)}
                        className="w-full accent-current" 
                    />
                </div>
            </div>

            {/* E. Substances & Compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         Substance Use & Comorbidities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {['Alcohol', 'Smoking', 'Cannabis', 'Opioids', 'Stimulants', 'Benzodiazepines'].map(s => (
                            <button
                                key={s}
                                onClick={() => toggleChip('substanceUse', s)}
                                className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                                    p.substanceUse?.includes(s)
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-6">Treatment Compliance</h4>
                    <div className="flex gap-4">
                        {['Good', 'Poor'].map(c => (
                            <button
                                key={c}
                                onClick={() => updateData('medicationCompliance', c)}
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    p.medicationCompliance === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-indigo-200 hover:border-indigo-400'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 space-y-2">
                        <span className="text-[8px] font-black text-indigo-400 uppercase block tracking-widest">Active Side Effects</span>
                        <div className="flex flex-wrap gap-2">
                            {['Sedation', 'Weight Gain', 'EPS', 'Tremors', 'Nausea'].map(se => (
                                <button
                                    key={se}
                                    onClick={() => toggleChip('sideEffects', se)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                                        p.sideEffects?.includes(se) ? 'bg-red-500 text-white' : 'bg-white text-slate-500 border border-indigo-200 hover:border-indigo-400'
                                    }`}
                                >
                                    {se}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* F. Clinical Impression */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 group">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={16} className="text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Impression & Follow-up Plan</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <textarea
                        value={p.counseling || ''}
                        onChange={(e) => updateData('counseling', e.target.value)}
                        placeholder="Psychotherapy goals, counseling advice, and psychoeducation..."
                        className="w-full px-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-300 resize-none h-24 focus:border-indigo-500 transition-all outline-none shadow-sm"
                    />
                    <textarea
                        value={p.notes || ''}
                        onChange={(e) => updateData('notes', e.target.value)}
                        placeholder="Risk management plan, family awareness, and emergency contact details..."
                        className="w-full px-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-300 resize-none h-24 focus:border-indigo-500 transition-all outline-none shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
};
