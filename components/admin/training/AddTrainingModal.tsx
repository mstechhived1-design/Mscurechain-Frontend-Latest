"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Calendar, Users, Check, Search, Image as ImageIcon, Upload, XCircle, ChevronDown } from 'lucide-react';
import { getHospitalStaffAction, getHospitalNursesAction, createTrainingAction, updateTrainingAction, getHospitalMetadataAction } from '@/lib/integrations';

interface AddTrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    training?: any;
}

export default function AddTrainingModal({ isOpen, onClose, training }: AddTrainingModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        trainingName: '',
        trainingDate: new Date().toISOString().split('T')[0],
        department: '',
        status: 'Scheduled',
        description: '',
        cancellationReason: '',
        participants: [] as string[]
    });

    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [certificatePreview, setCertificatePreview] = useState<string | null>(null);
    const [staffSearch, setStaffSearch] = useState('');
    const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Fetch Staff for participant selection
    const { data: staffData } = useQuery({
        queryKey: ['hospital-admin-staff'],
        queryFn: getHospitalStaffAction
    });

    // Fetch Nurses for participant selection
    const { data: nurseData } = useQuery({
        queryKey: ['hospital-admin-nurses'],
        queryFn: getHospitalNursesAction
    });

    const staffList = staffData?.staff || [];
    const nurseList = (nurseData as any)?.nurses || nurseData?.staff || [];

    // Fetch Hospital info for departments
    const { data: metadataData } = useQuery({
        queryKey: ['hospital-metadata'],
        queryFn: getHospitalMetadataAction
    });

    const hospitalDepartments = metadataData?.data?.departments || [];

    const combinedList = [...staffList, ...nurseList];


    useEffect(() => {
        if (training && isOpen) {
            // Use local date string to avoid timezone shifts (YYYY-MM-DD)
            const d = new Date(training.trainingDate);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            setFormData({
                trainingName: training.trainingName || '',
                trainingDate: dateStr,
                department: training.department || '',
                status: training.status || 'Scheduled',
                description: training.description || '',
                cancellationReason: training.cancellationReason || training.reason || '',
                participants: training.participants?.map((p: any) => p._id || p) || []
            });
            setCertificatePreview(training.certificateUrl || null);
        } else if (!training && isOpen) {
            // Reset form for fresh "Log New Training"
            setFormData({
                trainingName: '',
                trainingDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local
                department: '',
                status: 'Scheduled',
                description: '',
                cancellationReason: '',
                participants: []
            });
            setCertificatePreview(null);
            setCertificateFile(null);
        }
    }, [training, isOpen]);

    const mutation = useMutation({
        mutationFn: (data: FormData) => training ? updateTrainingAction(training._id, data) : createTrainingAction(data),
        onSuccess: () => {
            toast.success(training ? "Training updated" : "Training logged successfully");
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || "Operation failed");
        }
    });


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.trainingName || !formData.trainingDate || !formData.department) {
            toast.error("Please fill all mandatory fields");
            return;
        }

        const data = new FormData();
        data.append('trainingName', formData.trainingName);
        data.append('trainingDate', formData.trainingDate);
        data.append('department', formData.department);
        data.append('status', formData.status.trim());
        if (formData.status?.toLowerCase().trim().includes('cancel')) {
            data.append('cancellationReason', (formData.cancellationReason || '').trim());
        }
        data.append('description', formData.description);
        data.append('participants', JSON.stringify(formData.participants));

        if (certificateFile) {
            data.append('certificate', certificateFile);
        }

        mutation.mutate(data);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCertificateFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCertificatePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleParticipant = (id: string) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.includes(id)
                ? prev.participants.filter(pid => pid !== id)
                : [...prev.participants, id]
        }));
    };

    const filteredStaff = combinedList.filter((s: any) => {
        const nameMatch = s.name?.toLowerCase().includes(staffSearch.toLowerCase());
        // department can be an array or string — coerce safely
        const dept = Array.isArray(s.department)
            ? s.department.join(' ')
            : (s.department || '');
        const roleStr = s.role || '';
        const deptMatch = dept.toLowerCase().includes(staffSearch.toLowerCase());
        const roleMatch = roleStr.toLowerCase().includes(staffSearch.toLowerCase());
        return nameMatch || deptMatch || roleMatch;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[0.5rem] w-full max-w-2xl overflow-hidden border border-slate-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">{training ? 'Update Training' : 'Log New Training'}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Compliance & Development Registry</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Training Name *</label>
                            <input
                                type="text"
                                value={formData.trainingName}
                                onChange={e => setFormData(prev => ({ ...prev, trainingName: e.target.value }))}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                                placeholder="e.g. ACLS Advanced Certification"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Training Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={formData.trainingDate}
                                    onChange={e => setFormData(prev => ({ ...prev, trainingDate: e.target.value }))}
                                    className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department *</label>
                            <div
                                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex justify-between items-center group hover:border-indigo-200 transition-colors"
                            >
                                <span className={formData.department ? 'text-slate-900' : 'text-slate-400'}>
                                    {formData.department || 'Select Department'}
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isDeptDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[60]"
                                        onClick={() => setIsDeptDropdownOpen(false)}
                                    />
                                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-40 overflow-y-auto p-1 custom-scrollbar">
                                            <div
                                                onClick={() => { setFormData(prev => ({ ...prev, department: '' })); setIsDeptDropdownOpen(false); }}
                                                className="px-4 py-2.5 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer"
                                            >
                                                Select Department
                                            </div>
                                            {hospitalDepartments.map((dept: any) => (
                                                <div
                                                    key={dept._id || dept.name}
                                                    onClick={() => { setFormData(prev => ({ ...prev, department: dept.name })); setIsDeptDropdownOpen(false); }}
                                                    className={`px-4 py-2.5 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${formData.department === dept.name ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                                >
                                                    {dept.name}
                                                </div>
                                            ))}
                                            {hospitalDepartments.length === 0 && (
                                                ['General', 'ICU', 'Emergency'].map(d => (
                                                    <div
                                                        key={d}
                                                        onClick={() => { setFormData(prev => ({ ...prev, department: d })); setIsDeptDropdownOpen(false); }}
                                                        className={`px-4 py-2.5 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${formData.department === d ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                                    >
                                                        {d}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                            <div
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex justify-between items-center group hover:border-indigo-200 transition-colors"
                            >
                                <span className="text-slate-900">{formData.status}</span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isStatusDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[60]"
                                        onClick={() => setIsStatusDropdownOpen(false)}
                                    />
                                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-1">
                                            {['Scheduled', 'Completed', 'Cancelled'].map(s => (
                                                <div
                                                    key={s}
                                                    onClick={() => { setFormData(prev => ({ ...prev, status: s })); setIsStatusDropdownOpen(false); }}
                                                    className={`px-4 py-2.5 hover:bg-indigo-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${formData.status === s ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                                >
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[100px]"
                            placeholder="Briefly describe the training scope..."
                        />
                    </div>

                    {formData.status?.toLowerCase() === 'cancelled' && (
                        <div className="space-y-2 p-6 bg-rose-50/50 rounded-3xl border border-rose-100 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <XCircle size={14} /> Reason for Cancellation *
                            </label>
                            <textarea
                                value={formData.cancellationReason}
                                onChange={e => setFormData(prev => ({ ...prev, cancellationReason: e.target.value }))}
                                className="w-full px-5 py-3 bg-white border border-rose-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none transition-all min-h-[80px]"
                                placeholder="Please provide the reason for cancellation..."
                                required
                            />
                        </div>
                    )}

                    {formData.status?.toLowerCase() === 'completed' && (
                        <div className="space-y-3 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ImageIcon size={14} /> Internship Certificate Photo
                            </label>

                            <div className="relative group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                {certificatePreview ? (
                                    <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-inner group">
                                        <img src={certificatePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">Click to Change</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 w-full rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-3 bg-white hover:bg-slate-50 transition-all">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Click to upload internship certificate</p>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">JPG, PNG allowed (Max 10MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Users size={14} className="text-indigo-500" /> Select Participants
                            </label>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {formData.participants.length} SELECTED
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={staffSearch}
                                onChange={e => setStaffSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                placeholder="Search staff by name or department..."
                            />
                        </div>

                        <div className="border border-slate-100 rounded-2xl bg-slate-50/30 p-2 max-h-[300px] overflow-y-auto space-y-4">
                            {/* Nurses Section */}
                            {filteredStaff.filter((s: any) => s.role === 'nurse').length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-indigo-400 rounded-full" /> Nurse List
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredStaff.filter((s: any) => s.role === 'nurse').map((staff: any) => (
                                            <ParticipantItem
                                                key={staff._id}
                                                staff={staff}
                                                isSelected={formData.participants.includes(staff._id)}
                                                onToggle={() => toggleParticipant(staff._id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Staff Section */}
                            {filteredStaff.filter((s: any) => s.role !== 'nurse').length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-slate-200 rounded-full" /> Staff List
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredStaff.filter((s: any) => s.role !== 'nurse').map((staff: any) => (
                                            <ParticipantItem
                                                key={staff._id}
                                                staff={staff}
                                                isSelected={formData.participants.includes(staff._id)}
                                                onToggle={() => toggleParticipant(staff._id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredStaff.length === 0 && (
                                <div className="py-8 text-center text-slate-400 text-xs italic">
                                    No staff or nurses found matching search.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Dismiss
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>{training ? 'Update Record' : 'Confirm Logistics'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ParticipantItem({ staff, isSelected, onToggle }: { staff: any, isSelected: boolean, onToggle: () => void }) {
    return (
        <div
            onClick={onToggle}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {staff.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{staff.name}</p>
                    <p className={`text-[9px] font-bold uppercase truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'
                        }`}>{Array.isArray(staff.department) ? staff.department.join(', ') : (staff.department || staff.role || 'General')}</p>
                </div>
            </div>
            {isSelected && <Check size={14} strokeWidth={4} />}
        </div>
    );
}

