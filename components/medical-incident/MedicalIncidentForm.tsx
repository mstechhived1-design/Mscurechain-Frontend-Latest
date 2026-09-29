'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Activity,
    User,
    FileText,
    Stethoscope,
    Package,
    Loader2,
    Pill,
    Plus,
    Minus,
    Camera,
    X,
    Image as ImageIcon,
    Search,
    Check,
    Calendar,
    Clipboard,
    Building
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { incidentService } from '@/lib/integrations/services/incident.service';
import { hospitalAdminService } from '@/lib/integrations/services/hospitalAdmin.service';
import { patientService } from '@/lib/integrations/services/patient.service';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Enhanced schema with character limits
const incidentSchema = z.object({
    incidentDate: z.string().min(1, 'Date and time is required'),
    department: z.string().min(1, 'Department is required').max(50, 'Department name too long'),
    incidentType: z.string().min(1, 'Incident category is required').max(100, 'Category name too long'),
    severity: z.enum(['Low', 'Medium', 'High']),
    description: z.string()
        .min(10, 'Description must be at least 10 characters')
        .max(1000, 'Description must be less than 1000 characters'),

    // Conditional Patient Fall
    patientName: z.string().max(100, 'Name too long').optional(),
    mrnNumber: z.string().max(50, 'MRN too long').optional(),
    bedNumber: z.string().max(30, 'Bed number too long').optional(),
    roomNumber: z.string().max(30, 'Room number too long').optional(),

    // Conditional Equipment
    equipmentName: z.string().max(100, 'Equipment name too long').optional(),
    causeOfFailure: z.string().max(200, 'Cause description too long').optional(),

    // Conditional Medication
    prescriptionOrDrugName: z.string().max(100, 'Drug name too long').optional(),
}).refine((data) => {
    if (data.incidentType === 'Patient Fall') {
        return !!data.patientName && !!data.mrnNumber && !!data.bedNumber && !!data.roomNumber;
    }
    return true;
}, {
    message: "Patient details are required for Patient Fall incidents",
    path: ["patientName"]
}).refine((data) => {
    if (data.incidentType === 'Equipment Failure') {
        return !!data.equipmentName && !!data.causeOfFailure;
    }
    return true;
}, {
    message: "Equipment details are required for Equipment Failure incidents",
    path: ["equipmentName"]
}).refine((data) => {
    if (data.incidentType === 'Medication Error') {
        return !!data.prescriptionOrDrugName;
    }
    return true;
}, {
    message: "Medication details are required for Medication Error incidents",
    path: ["prescriptionOrDrugName"]
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

interface MedicalIncidentFormProps {
    onSuccess?: () => void;
}

// Default incident categories
const DEFAULT_CATEGORIES = [
    'Patient Fall',
    'Medication Error',
    'Equipment Failure',
    'Delay in Treatment',
    'Violence',
    'Near Miss',
    'Adverse Drug Reaction',
    'Other'
];

export default function MedicalIncidentForm({ onSuccess }: MedicalIncidentFormProps) {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCustomDept, setIsCustomDept] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Patient search states
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Custom category states
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    const { data: hospitalMeta } = useQuery({
        queryKey: ['hospital-metadata'],
        queryFn: () => hospitalAdminService.getHospitalMetadata()
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset
    } = useForm<IncidentFormValues>({
        resolver: zodResolver(incidentSchema),
        mode: 'onChange', // Validate on change for immediate feedback
        reValidateMode: 'onChange',
        defaultValues: {
            incidentDate: new Date().toISOString().slice(0, 16),
            severity: 'Low',
            incidentType: 'Patient Fall' // Changed default to match screenshot
        }
    });

    const selectedType = watch('incidentType');
    const descriptionValue = watch('description') || '';

    // Load custom categories from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('customIncidentCategories');
        if (saved) {
            try {
                setCustomCategories(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load custom categories');
            }
        }
    }, []);

    // Patient search with debounce
    useEffect(() => {
        // Don't search if a patient has been selected
        if (selectedPatientId) return;

        const timer = setTimeout(async () => {
            if (patientSearch.length >= 2) {
                setIsSearching(true);
                try {
                    const result = await patientService.searchPatients(patientSearch, (user as any)?.hospital);
                    setSearchResults(result.patients || []);
                    setShowResults(true);
                } catch (error) {
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [patientSearch, user, selectedPatientId]);

    // Handle patient selection
    const handlePatientSelect = async (patient: any) => {
        // Mark patient as selected to prevent re-searching
        setSelectedPatientId(patient._id);
        setPatientSearch(patient.name);
        setShowResults(false);
        setSearchResults([]);

        try {
            const details = await patientService.getPatientBedInfo(patient._id);

            setValue('patientName', details.patient.name);
            setValue('mrnNumber', details.mrnNumber);
            setValue('bedNumber', details.bedNumber);
            setValue('roomNumber', details.roomNumber);

            if (details.message) {
                toast(details.message, {
                    icon: 'ℹ️',
                    duration: 4000,
                });
            }
        } catch (error) {
            toast.error('Failed to fetch patient details');
        }
    };

    // Add custom category
    const addCustomCategory = () => {
        if (newCategory.trim() && newCategory.length <= 100) {
            const updated = [...customCategories, newCategory.trim()];
            setCustomCategories(updated);
            localStorage.setItem('customIncidentCategories', JSON.stringify(updated));
            setValue('incidentType', newCategory.trim());
            setNewCategory('');
            setIsCustomCategory(false);
            toast.success('Custom category added');
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const totalFiles = attachments.length + newFiles.length;

        if (totalFiles > 5) {
            toast.error('Maximum 5 images allowed');
            return;
        }

        // Create preview URLs
        const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setAttachments(prev => [...prev, ...newFiles]);

        // Reset input
        e.target.value = '';
    };

    // Remove attachment
    const removeAttachment = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: IncidentFormValues) => {
        console.log('🚀 [SUBMIT] Form submission started');
        console.log('📋 [SUBMIT] Form data:', data);
        console.log('✅ [SUBMIT] Validation passed!');

        setIsSubmitting(true);
        try {
            const formData = new FormData();

            formData.append('incidentDate', data.incidentDate);
            formData.append('department', data.department);
            formData.append('incidentType', data.incidentType);
            formData.append('severity', data.severity);
            formData.append('description', data.description);

            if (data.incidentType === 'Patient Fall') {
                const patientDetails = {
                    patientName: data.patientName,
                    mrnNumber: data.mrnNumber,
                    bedNumber: data.bedNumber,
                    roomNumber: data.roomNumber
                };
                console.log('🧑‍⚕️ [SUBMIT] Patient details:', patientDetails);
                formData.append('patientFallDetails', JSON.stringify(patientDetails));
            }

            if (data.incidentType === 'Equipment Failure') {
                formData.append('equipmentFailureDetails', JSON.stringify({
                    equipmentName: data.equipmentName,
                    causeOfFailure: data.causeOfFailure
                }));
            }

            if (data.incidentType === 'Medication Error') {
                formData.append('medicationErrorDetails', JSON.stringify({
                    prescriptionOrDrugName: data.prescriptionOrDrugName
                }));
            }

            attachments.forEach((file) => {
                formData.append('attachments', file);
            });

            console.log('📦 [SUBMIT] Sending to backend...');
            await incidentService.reportIncident(formData);
            console.log('✅ [SUBMIT] Success!');
            toast.success('Incident reported successfully');

            previewUrls.forEach(url => URL.revokeObjectURL(url));
            setPreviewUrls([]);
            setAttachments([]);
            setPatientSearch('');
            setSelectedPatientId(null);

            reset();
            onSuccess?.();
        } catch (error: any) {
            console.error('❌ [SUBMIT] Error:', error);
            toast.error(error.message || 'Failed to report incident');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle validation errors
    const onError = (errors: any) => {
        console.log('❌ [VALIDATION] Form validation failed!');
        console.log('📋 [VALIDATION] Errors:', errors);

        // Show user-friendly error message
        const errorFields = Object.keys(errors);
        if (errorFields.length > 0) {
            const firstError = errors[errorFields[0]];
            toast.error(firstError?.message || 'Please fill in all required fields');
        }
    };

    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

    return (
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-lg md:text-xl lg:text-xl font-bold uppercase">Medical Incident</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left Column */}
                <div className="space-y-6 bg-white dark:bg-gray-800/50 p-6 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <h3 className="text-lg font-black font-semibold">Basic Incident Data</h3>
                    </div>

                    {/* Reporter */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Reporter (Read-Only)</label>
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300">
                            <User size={16} className="text-gray-400" />
                            {user?.name || 'Loading...'} ({user?.role})
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Incident Date & Time</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="datetime-local"
                                {...register('incidentDate')}
                                className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 ${errors.incidentDate ? 'border-red-500' : 'border-transparent'
                                    } focus:border-red-500 rounded-2xl outline-none transition-all text-sm font-bold`}
                            />
                        </div>
                        {errors.incidentDate && (
                            <p className="text-xs text-red-500 font-bold ml-1">
                                {errors.incidentDate.message}
                            </p>
                        )}
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Department</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomDept(!isCustomDept);
                                    reset({ ...watch(), department: "" });
                                }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isCustomDept
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}
                            >
                                {isCustomDept ? <><Minus size={10} /> Use List</> : <><Plus size={10} /> Add Dept</>}
                            </button>
                        </div>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            {isCustomDept ? (
                                <input
                                    type="text"
                                    placeholder="Enter department name..."
                                    maxLength={50}
                                    {...register('department')}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none transition-all text-sm font-bold"
                                />
                            ) : (
                                <select
                                    {...register('department')}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none appearance-none transition-all text-sm font-bold"
                                >
                                    <option value="">Select Department</option>
                                    {hospitalMeta?.data?.departments && hospitalMeta.data.departments.length > 0 && (
                                        <optgroup label="🏥 Departments">
                                            {hospitalMeta.data.departments.map(dept => (
                                                <option key={dept._id} value={dept.name}>{dept.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {hospitalMeta?.data?.rooms && hospitalMeta.data.rooms.length > 0 && (
                                        <optgroup label="🛌 Rooms">
                                            {hospitalMeta.data.rooms.map(room => (
                                                <option key={room._id} value={room.label}>{room.label} ({room.type})</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            )}
                        </div>
                        {errors.department && <p className="text-xs text-red-500 font-bold ml-1">{errors.department.message}</p>}
                    </div>

                    {/* Incident Category with Custom Option */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Incident Category</label>
                            <button
                                type="button"
                                onClick={() => setIsCustomCategory(!isCustomCategory)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isCustomCategory
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}
                            >
                                {isCustomCategory ? <><Minus size={10} /> Use List</> : <><Plus size={10} /> Add Category</>}
                            </button>
                        </div>
                        <div className="relative">
                            <Clipboard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            {isCustomCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="Enter custom category..."
                                        maxLength={100}
                                        className="flex-1 pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none transition-all text-sm font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomCategory}
                                        className="px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-sm"
                                    >
                                        <Check size={16} />
                                    </button>
                                </div>
                            ) : (
                                <select
                                    {...register('incidentType')}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none appearance-none transition-all text-sm font-bold"
                                >
                                    {allCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {errors.incidentType && <p className="text-xs text-red-500 font-bold ml-1">{errors.incidentType.message}</p>}
                    </div>

                    {/* Severity */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Incident Severity</label>
                        <div className="flex gap-2 sm:gap-4">
                            {['Low', 'Medium', 'High'].map((level) => (
                                <label key={level} className="flex-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        value={level}
                                        {...register('severity')}
                                        className="sr-only peer"
                                    />
                                    <div className={`text-center py-2 rounded-xl border-2 font-black text-[9px] md:text-[10px] uppercase transition-all
                                        ${level === 'Low' ? 'peer-checked:bg-emerald-500 peer-checked:text-white border-emerald-100 peer-checked:border-emerald-500' :
                                            level === 'Medium' ? 'peer-checked:bg-amber-500 peer-checked:text-white border-amber-100 peer-checked:border-amber-500' :
                                                'peer-checked:bg-red-600 peer-checked:text-white border-red-100 peer-checked:border-red-600'}
                                        bg-gray-50 dark:bg-gray-900 dark:border-gray-800 text-gray-400`}>
                                        {level}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Description */}
                    <div className="bg-white dark:bg-gray-800/50 p-4 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700 flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <h3 className="text-lg font-black uppercase font-semibold">Detailed Narrative</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Clinical Description / Message</label>
                            <textarea
                                {...register('description')}
                                rows={6}
                                maxLength={1000}
                                placeholder="Describe the sequence of events, individuals involved, and immediate actions taken..."
                                className="w-full px-6 py-4 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none transition-all text-sm font-bold resize-none"
                            ></textarea>
                            <div className="flex justify-between items-center">
                                {errors.description && <p className="text-xs text-red-500 font-bold ml-1">{errors.description.message}</p>}
                                <p className="text-[10px] text-gray-400 ml-auto">{descriptionValue.length}/1000</p>
                            </div>
                        </div>
                    </div>

                    {/* Photo Evidence */}
                    <div className="bg-white dark:bg-gray-800/50 p-6 md:p-8 rounded-[0.5rem] border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-lg">
                                <Camera size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase font-semibold">Photo Evidence</h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Optional • Max 5 images</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="relative block cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    disabled={attachments.length >= 5}
                                />
                                <div className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-2xl transition-all ${attachments.length >= 5
                                    ? 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                    : 'bg-purple-50/50 dark:bg-purple-500/5 border-purple-200 dark:border-purple-500/30 group-hover:border-purple-500 group-hover:bg-purple-100/50 dark:group-hover:bg-purple-500/10'
                                    }`}>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-3">
                                        <ImageIcon className="text-purple-500" size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        {attachments.length >= 5 ? 'Maximum photos reached' : 'Click to upload photos'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {attachments.length}/5 photos attached
                                    </p>
                                </div>
                            </label>

                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    {previewUrls.map((url, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img
                                                src={url}
                                                alt={`Attachment ${index + 1}`}
                                                className="w-full h-full object-cover rounded-xl border-2 border-gray-100 dark:border-gray-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                                            >
                                                <X size={12} />
                                            </button>
                                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Patient Fall Details with Search */}
                    {selectedType === 'Patient Fall' && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/5 p-6 md:p-8 rounded-[0.5rem] border border-emerald-100 dark:border-emerald-500/20 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                    <Stethoscope size={20} />
                                </div>
                                <h3 className="text-lg font-black uppercase font-semibold text-emerald-700 dark:text-emerald-400">Patient-Specific Metrics</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Patient Search */}
                                <div className="space-y-1 sm:col-span-2 relative">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 dark:text-emerald-400/60 ml-1">Search Patient</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => {
                                                setPatientSearch(e.target.value);
                                                // Reset selected patient when user types again
                                                if (selectedPatientId) {
                                                    setSelectedPatientId(null);
                                                }
                                            }}
                                            placeholder="Type patient name or MRN..."
                                            className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-xl outline-none text-sm font-bold"
                                        />
                                        {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" size={16} />}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {showResults && searchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {searchResults.map((patient) => (
                                                <button
                                                    key={patient._id}
                                                    type="button"
                                                    onClick={() => handlePatientSelect(patient)}
                                                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                >
                                                    <div className="font-bold text-sm">{patient.name}</div>
                                                    <div className="text-xs text-gray-500">MRN: {patient.patientId}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 dark:text-emerald-400/60 ml-1">Patient Name</label>
                                    <input {...register('patientName')} maxLength={100} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-xl outline-none text-sm font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 dark:text-emerald-400/60 ml-1">MRN Number</label>
                                    <input {...register('mrnNumber')} maxLength={50} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-xl outline-none text-sm font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 dark:text-emerald-400/60 ml-1">Bed</label>
                                        <input {...register('bedNumber')} maxLength={30} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-xl outline-none text-sm font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 dark:text-emerald-400/60 ml-1">Room</label>
                                        <input {...register('roomNumber')} maxLength={30} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-xl outline-none text-sm font-bold" />
                                    </div>
                                </div>
                            </div>
                            {errors.patientName && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1">※ All patient fields are mandatory for falls</p>}
                        </div>
                    )}

                    {/* Equipment Failure */}
                    {selectedType === 'Equipment Failure' && (
                        <div className="bg-amber-50 dark:bg-amber-500/5 p-6 md:p-8 rounded-[0.5rem] border border-amber-100 dark:border-amber-500/20 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-500 text-white rounded-lg">
                                    <Package size={20} />
                                </div>
                                <h3 className="text-lg font-black uppercase text-amber-700 dark:text-amber-400">Technical Assets Protocol</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-amber-600/60 ml-1">Asset / Equipment Name</label>
                                    <input {...register('equipmentName')} maxLength={100} placeholder="e.g. Infusion Pump Model X" className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-amber-100 rounded-xl outline-none text-sm font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-amber-600/60 ml-1">Probable Cause of Failure</label>
                                    <input {...register('causeOfFailure')} maxLength={200} placeholder="e.g. Battery overheat, Display glitch" className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-amber-100 rounded-xl outline-none text-sm font-bold" />
                                </div>
                            </div>
                            {errors.equipmentName && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1">※ Equipment details are required</p>}
                        </div>
                    )}

                    {/* Medication Error */}
                    {selectedType === 'Medication Error' && (
                        <div className="bg-indigo-50 dark:bg-indigo-500/5 p-6 md:p-8 rounded-[0.5rem] border border-indigo-100 dark:border-indigo-500/20 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500 text-white rounded-lg">
                                    <Pill size={20} />
                                </div>
                                <h3 className="text-lg font-black uppercase font-semibold text-indigo-700 dark:text-indigo-400">Pharmaceutical Audit</h3>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-widest font-black text-indigo-600/60 ml-1">Prescription or Drug Identity</label>
                                <input {...register('prescriptionOrDrugName')} maxLength={100} placeholder="e.g. Paracetamol 500mg (Wrong dosage)" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-indigo-100 rounded-2xl outline-none text-sm font-bold" />
                                {errors.prescriptionOrDrugName && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">※ Medication details required</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative px-8 py-4 bg-primary-theme dark:bg-white text-white dark:text-black rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all overflow-hidden w-full md:w-auto"
                >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Processing...
                            </>
                        ) : (
                            <>Submit</>
                        )}
                    </span>
                </button>
            </div>
        </form>
    );
}

