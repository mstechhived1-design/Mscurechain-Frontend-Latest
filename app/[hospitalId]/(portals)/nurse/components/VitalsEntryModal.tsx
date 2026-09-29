'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Heart, Thermometer, Wind, Droplets, CheckCircle2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { ipdService } from '@/lib/integrations';

interface VitalsEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    patientName: string;
    patientAge?: string;
    patientGender?: string;
    mrn?: string;
    onSuccess?: () => void;
    readOnly?: boolean;
    initialData?: any;
}
export default function VitalsEntryModal({ isOpen, onClose, admissionId, patientName, patientAge, patientGender, mrn, onSuccess, readOnly = false, initialData }: VitalsEntryModalProps) {
    const [loading, setLoading] = useState(false);
    const [thresholds, setThresholds] = useState<any>(null);
    const [wardType, setWardType] = useState<string>('');
    const [fetchingThresholds, setFetchingThresholds] = useState(false);
    const autoConditionRef = useRef('Stable');

    const [formData, setFormData] = useState({
        heartRate: '',
        systolicBP: '',
        diastolicBP: '',
        spO2: '',
        temperature: '',
        respiratoryRate: '',
        glucose: '',
        glucoseType: 'Random' as 'Fasting' | 'After Meal' | 'Random',
        condition: 'Stable',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [severities, setSeverities] = useState<Record<string, 'normal' | 'warning' | 'critical' | 'impossible'>>({});

    // Fetch thresholds when modal opens
    useEffect(() => {
        if (isOpen && admissionId && !fetchingThresholds) {
            fetchThresholds();
        }
    }, [isOpen, admissionId]);

    // Populate form from initialData if provided
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(prev => ({
                ...prev,
                heartRate: initialData.heartRate?.toString() || initialData.vitals?.heartRate?.toString() || '',
                systolicBP: initialData.systolicBP?.toString() || initialData.vitals?.systolicBP?.toString() || '',
                diastolicBP: initialData.diastolicBP?.toString() || initialData.vitals?.diastolicBP?.toString() || '',
                spO2: initialData.spO2?.toString() || initialData.vitals?.spO2?.toString() || '',
                temperature: initialData.temperature?.toString() || initialData.vitals?.temperature?.toString() || '',
                respiratoryRate: initialData.respiratoryRate?.toString() || initialData.vitals?.respiratoryRate?.toString() || '',
                glucose: initialData.glucose?.toString() || initialData.vitals?.glucose?.toString() || '',
                glucoseType: initialData.glucoseType || initialData.vitals?.glucoseType || 'Random',
                condition: initialData.condition || initialData.vitals?.condition || 'Stable',
                notes: initialData.notes || initialData.vitals?.notes || ''
            }));
        }
    }, [isOpen, initialData]);

    const fetchThresholds = async () => {
        try {
            setFetchingThresholds(true);
            const res = await ipdService.getAdmissionThresholds(admissionId);

            if (res.success && res.data) {
                // Convert list to lookup object for easier consumption
                const lookup: any = {};
                res.data.thresholds.forEach((t: any) => {
                    const key = t.vitalName === 'glucose' ? `${t.vitalName}_${t.glucoseType}` : t.vitalName;
                    lookup[key] = t;
                });
                setThresholds(lookup);
                setWardType(res.data.template.wardType);
            }
        } catch (error) {
            console.error('Failed to fetch thresholds:', error);
            toast.error("Clinical protocols not configured for this ward");
        } finally {
            setFetchingThresholds(false);
        }
    };

    // Validate all fields when thresholds are loaded or form data changes
    useEffect(() => {
        if (!thresholds) return;

        const vitalFields = ['heartRate', 'spO2', 'systolicBP', 'diastolicBP', 'temperature', 'respiratoryRate', 'glucose'];
        const newSeverities: Record<string, 'normal' | 'warning' | 'critical' | 'impossible'> = {};
        const newErrors: Record<string, string> = {};

        vitalFields.forEach(field => {
            const value = formData[field as keyof typeof formData];
            if (value) {
                const { severity, message } = getFieldSeverity(field, value, formData);
                newSeverities[field] = severity;
                if (severity === 'impossible') {
                    newErrors[field] = message;
                }
            }
        });

        setSeverities(newSeverities);
        setErrors(newErrors);

        // Auto-toggle condition suggestion
        if (!readOnly) {
            const suggested = updateConditionSuggestion(newSeverities);
            if (suggested !== autoConditionRef.current) {
                autoConditionRef.current = suggested;
                setFormData(prev => ({ ...prev, condition: suggested }));
            }
        }
    }, [thresholds, formData.heartRate, formData.spO2, formData.systolicBP, formData.diastolicBP, formData.temperature, formData.respiratoryRate, formData.glucose, formData.glucoseType]);

    const getFieldSeverity = (name: string, value: string, currentData: any): { severity: 'normal' | 'warning' | 'critical' | 'impossible', message: string } => {
        if (!value) return { severity: 'normal', message: '' };

        const formatRegex = name === 'temperature' ? /^\d{0,3}(\.\d{0,1})?$/ : /^\d+$/;
        if (!formatRegex.test(value.trim())) {
            return { severity: 'impossible', message: 'Invalid Format' };
        }

        const num = Number(value.trim());
        if (isNaN(num)) return { severity: 'impossible', message: 'Invalid Number' };

        // If thresholds not loaded yet, use basic validation
        if (!thresholds) {
            return { severity: 'normal', message: 'Loading thresholds...' };
        }

        let severity: 'normal' | 'warning' | 'critical' | 'impossible' = 'normal';
        let message = '';

        // Get the appropriate threshold range
        const vitalKey = name === 'glucose' ? `${name}_${currentData.glucoseType}` : name;
        const range = thresholds[vitalKey];

        if (!range) {
            return { severity: 'normal', message: '' };
        }

        if (num < range.physicalMin || num > range.physicalMax) {
            return { severity: 'impossible', message: 'Physically Impossible' };
        }

        if (num <= range.lowerCritical) {
            return { severity: 'critical', message: 'Critical Low' };
        }

        if (num > range.lowerCritical && num <= range.lowerWarning) {
            return { severity: 'warning', message: 'Warning Low' };
        }

        // Special check for SpO2 upper
        const isSpO2 = name === 'spO2';
        const checkUpper = isSpO2 ? range.isSpO2UpperEnabled : true;

        if (checkUpper) {
            if (num >= range.upperWarning && num < range.upperCritical) {
                return { severity: 'warning', message: 'Warning High' };
            }
            if (num >= range.upperCritical) {
                return { severity: 'critical', message: 'Critical High' };
            }
        }

        // BP Validation: Diastolic must be less than systolic
        if (name === 'diastolicBP' && currentData.systolicBP) {
            if (num >= Number(currentData.systolicBP)) {
                return { severity: 'impossible', message: 'Must be < Systolic' };
            }
        }

        return { severity: 'normal', message: '' };

        return { severity, message };
    };

    const updateConditionSuggestion = (newSeverities: Record<string, string>) => {
        const severityValues = Object.values(newSeverities);
        
        // Priority 1: Any critical value
        if (severityValues.includes('critical')) {
            return 'Critical';
        }

        // Count abnormal (warning) values
        const warningCount = severityValues.filter(s => s === 'warning').length;

        // Priority 2: More than one abnormal value
        if (warningCount > 1) {
            return 'Serious';
        }
        
        // Priority 3: Exactly one abnormal value
        if (warningCount === 1) {
            return 'Fair';
        }

        // Default: Stable
        return 'Stable';
    };

    const getMissingFields = () => {
        const requiredFields = ['heartRate', 'spO2', 'systolicBP', 'diastolicBP', 'temperature', 'respiratoryRate', 'condition'];
        return requiredFields.filter(field => !formData[field as keyof typeof formData]);
    };

    const isFormValid = () => {
        const missingFields = getMissingFields();
        const hasImpossibleValues = Object.values(severities).some(s => s === 'impossible');
        const hasNotesErrors = !!errors.notes;
        return missingFields.length === 0 && !hasImpossibleValues && !hasNotesErrors;
    };

    const handleNumericInput = (name: string, value: string, maxDigits: number) => {
        // Stricter character filtering: only digits (and one dot for temperature)
        const charRegex = name === 'temperature' ? /^[0-9.]*$/ : /^[0-9]*$/;
        if (value !== '' && !charRegex.test(value)) return;

        if (name === 'temperature') {
            const parts = value.split('.');
            if (parts[0].length > maxDigits) return;
            if (parts.length > 2) return;
            if (parts[1]?.length > 1) return;
        } else {
            if (value.length > maxDigits) return;
        }

        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Real-time clinical validation
            const { severity, message } = getFieldSeverity(name, value, next);

            setSeverities(sPrev => ({ ...sPrev, [name]: severity }));

            setErrors(ePrev => ({ ...ePrev, [name]: severity === 'impossible' ? message : '' }));

            // Re-validate diastolic if systolic changes
            if (name === 'systolicBP' && next.diastolicBP) {
                const bpCheck = getFieldSeverity('diastolicBP', next.diastolicBP, next);
                setSeverities(sPrev => ({ ...sPrev, diastolicBP: bpCheck.severity }));
                setErrors(ePrev => ({ ...ePrev, diastolicBP: bpCheck.severity === 'impossible' ? bpCheck.message : '' }));
            }

            return next;
        });
    };

    const getInputClass = (name: string) => {
        const severity = severities[name] || 'normal';
        const error = errors[name];
        const base = "w-full px-5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-bold outline-none transition-all";
        const readOnlyClass = readOnly ? 'cursor-default' : 'focus:border-emerald-500';

        const severityClasses = {
            normal: 'border-slate-100',
            warning: 'border-amber-400 bg-amber-50/50',
            critical: 'border-rose-500 bg-rose-50/50',
            impossible: 'border-rose-600 bg-rose-100'
        };

        return `${base} ${readOnlyClass} ${severityClasses[severity]} ${error ? 'ring-1 ring-rose-500' : ''}`;
    };

    const getNormalRange = (name: string) => {
        if (!thresholds) return '';

        const vitalKey = name === 'glucose' ? `${name}_${formData.glucoseType}` : name;
        const range = thresholds[vitalKey];

        if (!range) return '';
        return `Target: ${range.lowerWarning}-${range.upperWarning}`;
    };

    const getAlertMessage = (name: string) => {
        const severity = severities[name];
        if (!severity || severity === 'normal') return null;

        const value = formData[name as keyof typeof formData];
        const { message } = getFieldSeverity(name, value, formData);
        return message;
    };

    // Populate data when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const bp = initialData.bloodPressure?.split('/') || ['', ''];
                const newData = {
                    heartRate: initialData.pulse || initialData.heartRate || '',
                    systolicBP: bp[0] || '',
                    diastolicBP: bp[1] || '',
                    spO2: initialData.spO2 || '',
                    temperature: initialData.temperature || '',
                    respiratoryRate: initialData.respiratoryRate || '',
                    glucose: initialData.glucose || initialData.sugar || '',
                    glucoseType: initialData.glucoseType || 'Random',
                    condition: initialData.condition || 'Stable',
                    notes: initialData.notes || ''
                };
                setFormData(newData);

                // Initial severities
                const initialSeverities: any = {};
                Object.keys(newData).forEach(k => {
                    const { severity } = getFieldSeverity(k, (newData as any)[k], newData);
                    if (severity !== 'normal') initialSeverities[k] = severity;
                });
                setSeverities(initialSeverities);
            } else if (admissionId) {
                // Fallback: Fetch latest data if not provided
                const fetchLatestVitals = async () => {
                    try {
                        setLoading(true);
                        const history = await ipdService.getClinicalHistory(admissionId);
                        if (history.vitals && history.vitals.length > 0) {
                            const latest = history.vitals[0];
                            const newData = {
                                heartRate: latest.heartRate?.toString() || '',
                                systolicBP: latest.systolicBP?.toString() || '',
                                diastolicBP: latest.diastolicBP?.toString() || '',
                                spO2: latest.spO2?.toString() || '',
                                temperature: latest.temperature?.toString() || '',
                                respiratoryRate: latest.respiratoryRate?.toString() || '',
                                glucose: latest.glucose?.toString() || latest.sugar?.toString() || '',
                                glucoseType: latest.glucoseType || 'Random',
                                condition: latest.condition || 'Stable',
                                notes: latest.notes || ''
                            };
                            setFormData(newData);

                            // Initial severities
                            const initialSeverities: any = {};
                            Object.keys(newData).forEach(k => {
                                const { severity } = getFieldSeverity(k, (newData as any)[k], newData);
                                if (severity !== 'normal') initialSeverities[k] = severity;
                            });
                            setSeverities(initialSeverities);
                        }
                    } catch (error) {
                        console.error("Failed to fetch latest vitals:", error);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchLatestVitals();
            }
        }
    }, [isOpen, initialData, admissionId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Extensive Validation Feedback
        const missingFields = getMissingFields();
        if (missingFields.length > 0) {
            const fieldLabels: Record<string, string> = {
                heartRate: 'Heart Rate',
                spO2: 'SpO2',
                systolicBP: 'Systolic BP',
                diastolicBP: 'Diastolic BP',
                temperature: 'Temperature',
                respiratoryRate: 'Respiratory Rate',
                condition: 'Condition'
            };
            const missingLabels = missingFields.map(f => fieldLabels[f] || f);
            toast.error(`Required: ${missingLabels.join(', ')}`);
            return;
        }

        try {
            setLoading(true);
            await ipdService.logVitals({
                admissionId,
                heartRate: Number(formData.heartRate),
                systolicBP: Number(formData.systolicBP),
                diastolicBP: Number(formData.diastolicBP),
                spO2: Number(formData.spO2),
                temperature: Number(formData.temperature),
                respiratoryRate: formData.respiratoryRate ? Number(formData.respiratoryRate) : undefined,
                glucose: formData.glucose ? Number(formData.glucose) : undefined,
                glucoseType: formData.glucoseType,
                condition: formData.condition,
                notes: formData.notes
            });
            toast.success("Vitals logged successfully");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to log vitals");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-[1rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col">
                {/* Header */}
                <div className="bg-primary-theme px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-white text-[12px] sm:text-sm font-black uppercase tracking-tighter flex items-center gap-2 sm:gap-3 leading-none">
                            <Activity className="text-emerald-400" size={16} /> {readOnly ? 'View Vitals' : 'Log Vitals'}
                        </h2>
                        <p className="text-[7px] sm:text-[8px] font-bold text-white/80 uppercase tracking-widest mt-0.5 leading-none">
                            {patientName} {mrn ? `• ID: ${mrn}` : ''} {patientAge ? `• ${patientAge}` : ''} {patientGender ? `• ${patientGender}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-white" size={16} />
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {/* Heart Rate */}
                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Heart size={10} className="text-rose-500" /> Heart Rate</span>
                                {!readOnly && !formData.heartRate && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.heartRate}
                                onChange={(e) => handleNumericInput('heartRate', e.target.value, 3)}
                                onBlur={() => handleNumericInput('heartRate', formData.heartRate, 3)}
                                placeholder="72"
                                readOnly={readOnly}
                                className={getInputClass('heartRate')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('heartRate') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.heartRate === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('heartRate')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('heartRate')}</p>
                                )}
                            </div>
                        </div>

                        {/* SpO2 */}
                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Droplets size={10} className="text-blue-500" /> SpO2 (%)</span>
                                {!readOnly && !formData.spO2 && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.spO2}
                                onChange={(e) => handleNumericInput('spO2', e.target.value, 3)}
                                onBlur={() => handleNumericInput('spO2', formData.spO2, 3)}
                                placeholder="98"
                                readOnly={readOnly}
                                className={getInputClass('spO2')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('spO2') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.spO2 === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('spO2')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('spO2')}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Activity size={10} className="text-emerald-500" /> BP Systolic</span>
                                {!readOnly && !formData.systolicBP && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.systolicBP}
                                onChange={(e) => handleNumericInput('systolicBP', e.target.value, 3)}
                                onBlur={() => handleNumericInput('systolicBP', formData.systolicBP, 3)}
                                placeholder="120"
                                readOnly={readOnly}
                                className={getInputClass('systolicBP')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('systolicBP') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.systolicBP === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('systolicBP')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('systolicBP')}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Activity size={10} className="text-emerald-500" /> BP Diastolic</span>
                                {!readOnly && !formData.diastolicBP && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.diastolicBP}
                                onChange={(e) => handleNumericInput('diastolicBP', e.target.value, 3)}
                                placeholder="80"
                                readOnly={readOnly}
                                className={getInputClass('diastolicBP')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('diastolicBP') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.diastolicBP === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('diastolicBP')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('diastolicBP')}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Thermometer size={10} className="text-amber-500" /> Temp (°F)</span>
                                {!readOnly && !formData.temperature && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                required
                                value={formData.temperature}
                                onChange={(e) => handleNumericInput('temperature', e.target.value, 3)}
                                placeholder="98.6"
                                readOnly={readOnly}
                                className={getInputClass('temperature')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('temperature') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.temperature === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('temperature')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('temperature')}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Wind size={10} className="text-teal-500" /> Resp. Rate</span>
                                {!readOnly && !formData.respiratoryRate && <span className="text-[7px] text-rose-500 opacity-70">* Req</span>}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                required
                                value={formData.respiratoryRate}
                                onChange={(e) => handleNumericInput('respiratoryRate', e.target.value, 2)}
                                placeholder="16"
                                readOnly={readOnly}
                                className={getInputClass('respiratoryRate')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('respiratoryRate') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.respiratoryRate === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('respiratoryRate')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('respiratoryRate')}</p>
                                )}
                            </div>
                        </div>

                        {/* Glucose */}
                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <Activity size={10} className="text-amber-600" /> Glucose
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formData.glucose}
                                onChange={(e) => handleNumericInput('glucose', e.target.value, 4)}
                                placeholder="100"
                                readOnly={readOnly}
                                className={getInputClass('glucose')}
                            />
                            <div className="flex items-center justify-between px-1">
                                {getAlertMessage('glucose') ? (
                                    <p className={`text-[8px] sm:text-[9px] font-bold ${severities.glucose === 'critical' ? 'text-rose-500' : 'text-amber-600'}`}>{getAlertMessage('glucose')}</p>
                                ) : (
                                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium">{getNormalRange('glucose')}</p>
                                )}
                            </div>
                        </div>

                        {/* Glucose Type */}
                        <div className="space-y-0.5 sm:space-y-1">
                            <label className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <ChevronDown size={10} className="text-amber-600" /> Reading Type
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.glucoseType}
                                    onChange={(e) => {
                                        const type = e.target.value as any;
                                        setFormData(prev => {
                                            const next = { ...prev, glucoseType: type };
                                            // Re-validate glucose when type changes
                                            if (next.glucose) {
                                                const { severity } = getFieldSeverity('glucose', next.glucose, next);
                                                setSeverities(sPrev => ({ ...sPrev, glucose: severity }));
                                            }
                                            return next;
                                        });
                                    }}
                                    disabled={readOnly}
                                    className={`w-full px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none transition-all appearance-none cursor-pointer ${readOnly ? 'cursor-default' : 'focus:border-emerald-500'}`}
                                >
                                    <option value="Fasting">Fasting</option>
                                    <option value="After Meal">After Meal</option>
                                    <option value="Random">Random</option>
                                </select>
                                {!readOnly && <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="space-y-1 sm:space-y-2 col-span-2">
                            <label className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1.5 sm:gap-2"><Activity size={10} className="text-emerald-500" /> Patient Condition</span>
                                {!readOnly && !formData.condition && <span className="text-[7px] text-rose-500 opacity-70">* Required</span>}
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    disabled={readOnly}
                                    className={`w-full px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none transition-all appearance-none cursor-pointer ${readOnly ? 'cursor-default' : 'focus:border-emerald-500'}`}
                                >
                                    <option value="Stable">Stable</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Serious">Serious</option>
                                    <option value="Critical">Critical</option>
                                </select>
                                {!readOnly && <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes (Opt)</label>
                            {!readOnly && (
                                <span className={`text-[7px] font-bold ${formData.notes.length > 240 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {formData.notes.length}/250
                                </span>
                            )}
                        </div>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 250) {
                                    setFormData({ ...formData, notes: val });
                                    setErrors(prev => ({ ...prev, notes: val.length > 250 ? 'Max 250 chars' : '' }));
                                }
                            }}
                            placeholder={readOnly ? "No notes added" : "Add observations..."}
                            rows={1}
                            readOnly={readOnly}
                            className={`w-full px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border ${errors.notes ? 'border-rose-500' : 'border-slate-100'} rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold outline-none transition-all resize-none ${readOnly ? 'cursor-default' : 'focus:border-emerald-500'}`}
                        />
                    </div>

                    {!readOnly && (
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 sm:py-3 bg-primary-theme text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-theme/80 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-30"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                            Confirm & Save Vitals
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);
