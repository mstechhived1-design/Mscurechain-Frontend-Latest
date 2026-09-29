"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminService } from "@/lib/integrations";
import { createRadiologyAction } from "@/lib/integrations/actions/admin.actions";
import { HeartPulse, Eye, EyeOff, Edit, Trash2, X, Building2, Lock, Search } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button, HospitalSearchSelect } from "@/components/admin";
import type { Hospital } from "@/lib/integrations/types";

interface RadiologyData {
    name: string;
    email: string;
    mobile: string;
    password: string;
    hospitalId: string;
}

export default function CreateRadiology() {
    const router = useRouter();

    // Creation Form State
    const [formData, setFormData] = useState<RadiologyData>({
        name: "",
        email: "",
        mobile: "",
        password: "",
        hospitalId: ""
    });

    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHospitals, setLoadingHospitals] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // Management State
    const [existingStaff, setExistingStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Edit State
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Partial<RadiologyData>>({});
    const [showEditPassword, setShowEditPassword] = useState(false);

    // Filtration & Pagination State
    const [filterHospital, setFilterHospital] = useState<Hospital | null>(null);
    const [filterSearch, setFilterSearch] = useState("");
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ... (Filter Dropdown Outside Click) ...
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.filter-dropdown-container')) {
                setShowFilterDropdown(false);
            }
        };
        if (showFilterDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showFilterDropdown]);

    useEffect(() => {
        fetchHospitals();
        fetchStaff();
    }, []);


    const fetchHospitals = async () => {
        try {
            setLoadingHospitals(true);
            const data = await adminService.getHospitalsClient();
            setHospitals(data || []);
        } catch (error: any) {
            console.error("Failed to fetch hospitals:", error);
            toast.error(error.message || "Failed to load hospitals");
        } finally {
            setLoadingHospitals(false);
        }
    };

    const fetchStaff = async () => {
        try {
            setLoadingStaff(true);
            const data = await adminService.getUsersClient({ role: 'radiology' });
            const staffArray = Array.isArray(data) ? data : (data as any)?.users || [];
            setExistingStaff(staffArray);
        } catch (error) {
            console.error("Failed to fetch radiology staff:", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "mobile") {
            if (!/^\d{0,10}$/.test(value)) return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedHospital = hospitals.find(h => h._id === formData.hospitalId);

    const validateForm = (): boolean => {
        if (!formData.hospitalId) {
            toast.error("Please select a hospital.");
            return false;
        }
        if (!formData.name || !formData.email || !formData.mobile || !formData.password) {
            toast.error("Please fill all Radiology Staff details.");
            return false;
        }
        if (formData.mobile.length !== 10) {
            toast.error("Mobile number must be exactly 10 digits.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);

        try {
            const result = await createRadiologyAction({
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                password: formData.password,
                hospitalId: formData.hospitalId
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to create radiology staff');
            }

            toast.success(`Radiology Staff created successfully for ${selectedHospital?.name}!`);

            setFormData({ name: "", email: "", mobile: "", password: "", hospitalId: "" });
            fetchStaff();

        } catch (err: any) {
            let errorMessage = "Failed to create radiology staff";
            if (err.message) errorMessage = err.message;
            else if (err.error) errorMessage = typeof err.error === 'string' ? err.error : err.error.message || errorMessage;

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Radiology Staff?")) return;
        const toastId = toast.loading("Deleting...");
        try {
            await adminService.deleteUserClient(id);
            toast.success("Deleted successfully", { id: toastId });
            fetchStaff();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete", { id: toastId });
        }
    };

    const handleEdit = (staff: any) => {
        setEditingStaff(staff);
        setEditForm({
            name: staff.name,
            email: staff.email,
            mobile: staff.mobile,
            password: ""
        });
        setShowEditPassword(false);
    };

    const handleUpdate = async () => {
        if (!editingStaff) return;
        const toastId = toast.loading("Updating...");

        const payload: any = { ...editForm };
        if (!payload.password) delete payload.password;

        try {
            await adminService.updateUserClient(editingStaff._id, payload);
            toast.success("Updated successfully", { id: toastId });
            setEditingStaff(null);
            fetchStaff();
        } catch (error: any) {
            toast.error(error.message || "Failed to update", { id: toastId });
        }
    };

    const getHospitalName = (hId: string | any) => {
        if (!hId) return "N/A";
        if (typeof hId === 'object') return hId.name || "N/A";
        const h = hospitals.find(x => x._id === hId);
        return h ? h.name : "Unknown Hospital";
    };

    // Filtered Staff Logic
    const filteredStaff = existingStaff.filter(staff => {
        if (!filterHospital) return true;
        const staffHospitalId = typeof staff.hospital === 'object' ? staff.hospital?._id : staff.hospital;
        return staffHospitalId === filterHospital._id;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const currentStaffPage = filteredStaff.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filter changes
    }, [filterHospital]);

    // Hospitals for filter dropdown
    const hospitalsForFilter = filterSearch 
        ? hospitals.filter(h => h.name.toLowerCase().includes(filterSearch.toLowerCase()))
        : hospitals;

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-4 border-b border-border-theme">
                <div className="shrink-0">
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                        <HeartPulse className="text-cyan-500" size={20} /> Create Radiology Staff
                    </h1>
                    <p className="text-[11px] opacity-60 ml-7 leading-none">Manage radiology staff accounts</p>
                </div>

                {/* Hospital Filter - Middle Section (Expanded) */}
                <div className="flex-1 w-full lg:mx-10 relative filter-dropdown-container">
                    <div className="relative">
                        <input
                            type="text"
                            readOnly={!!filterHospital}
                            placeholder={filterHospital ? filterHospital.name : "Search hospital to filter..."}
                            value={filterHospital ? "" : filterSearch}
                            onChange={(e) => {
                                setFilterSearch(e.target.value);
                                setShowFilterDropdown(true);
                            }}
                            onFocus={() => !filterHospital && setShowFilterDropdown(true)}
                            className={`w-full px-5 py-2.5 pr-12 rounded-xl border shadow-sm focus:outline-none transition-all text-sm ${
                                filterHospital 
                                ? "bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800 font-semibold text-cyan-700 dark:text-cyan-300" 
                                : "bg-white dark:bg-gray-800 border-border-theme border-opacity-50"
                            }`}
                        />
                        {filterHospital ? (
                            <button 
                                onClick={() => {
                                    setFilterHospital(null);
                                    setFilterSearch("");
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>
                        ) : (
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        )}
                    </div>

                    {showFilterDropdown && !filterHospital && (
                        <div className="absolute z-[60] w-full mt-1.5 rounded-xl shadow-2xl border border-border-theme max-h-60 overflow-y-auto bg-card animate-in fade-in slide-in-from-top-2">
                            {hospitalsForFilter.length > 0 ? (
                                hospitalsForFilter.map((h) => (
                                    <button
                                        key={h._id}
                                        onClick={() => {
                                            setFilterHospital(h);
                                            setShowFilterDropdown(false);
                                            setFilterSearch("");
                                        }}
                                        className="w-full text-left px-5 py-3 hover:bg-muted/50 border-b border-border-theme last:border-b-0 transition-colors"
                                    >
                                        <p className="font-bold text-sm">{h.name}</p>
                                        <p className="text-[10px] opacity-50">{h.hospitalId}</p>
                                    </button>
                                ))
                            ) : (
                                <div className="p-5 text-center text-sm text-muted italic">No hospitals found</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex items-center gap-2 bg-blue-500/5 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-sm">
                    <Building2 className="text-blue-500" size={16} />
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] uppercase font-black text-gray-400 tracking-widest leading-none mb-0.5">Total Counts</span>
                        <span className="text-xs font-black text-blue-500 leading-none">
                            Radiology Staff ({filteredStaff.length})
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left Column: Existing Staff List */}
                <div className="flex-1 order-2 xl:order-1">

                    {loadingStaff ? (
                        <div className="text-center py-12 opacity-50">Loading staff...</div>
                    ) : existingStaff.length === 0 ? (
                        <div className="text-center py-12 opacity-50 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed">
                            No radiology staff found.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {currentStaffPage.map((staff) => (
                                    <Card key={staff._id} padding="p-5" className="hover:shadow-lg transition-shadow relative group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center font-bold text-lg">
                                                    {staff.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-color)' }}>{staff.name}</h3>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                        {getHospitalName(staff.hospital)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(staff)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(staff._id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete Staff"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-sm" style={{ color: 'var(--secondary-color)' }}>
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                <span className="opacity-70 w-20">Email:</span>
                                                <span className="font-medium truncate flex-1">{staff.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                <span className="opacity-70 w-20">Mobile:</span>
                                                <span className="font-medium">{staff.mobile}</span>
                                            </div>
                                            {/* Dummy Password Field */}
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                <span className="opacity-70 w-20">Password:</span>
                                                <span className="font-medium tracking-widest">••••••••</span>
                                                <Lock size={14} className="ml-auto opacity-50" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Pagination - Matching Doctors UI Style */}
                            <div className="mt-8 flex justify-center">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 md:p-1 shadow-inner border border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 md:px-5 py-2 text-[10px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        style={{ color: 'var(--text-color)' }}
                                    >
                                        Prev
                                    </button>
                                    <div className="px-3 md:px-5 py-2 text-[10px] md:text-xs font-mono text-cyan-500 font-bold border-x border-gray-200 dark:border-gray-700">
                                        {currentPage}/{Math.max(1, totalPages)}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="px-3 md:px-5 py-2 text-[10px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                        style={{ color: 'var(--text-color)' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Column: Create Form */}
                <div className="w-full xl:w-[450px] order-1 xl:order-2">
                    <div className="sticky top-6 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card title="Radiology Staff Registration" icon={<HeartPulse className="text-cyan-500" />} padding="p-6">
                                {/* Hospital Select */}
                                <HospitalSearchSelect
                                    hospitals={hospitals}
                                    loading={loadingHospitals}
                                    value={formData.hospitalId}
                                    onChange={(id) => setFormData(prev => ({ ...prev, hospitalId: id }))}
                                    label="Select Hospital"
                                    accentColor="cyan"
                                    required
                                    className="mb-6"
                                />

                                {/* Form Fields */}
                                <div className="space-y-4">
                                    <FormInput
                                        label="Full Name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Name"
                                    />
                                    <FormInput
                                        label="Email"
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Email"
                                    />
                                    <FormInput
                                        label="Mobile"
                                        type="tel"
                                        name="mobile"
                                        required
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="Mobile"
                                    />
                                    <div className="relative">
                                        <FormInput
                                            label="Password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Password"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-9 text-gray-500 hover:text-cyan-500"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={loading}
                                        icon={<HeartPulse size={18} />}
                                        className="w-full py-4 text-lg shadow-lg hover:shadow-xl bg-cyan-600 hover:bg-cyan-700"
                                    >
                                        Create Account
                                    </Button>
                                </div>
                            </Card>
                        </form>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Edit Staff Details</h3>
                            <button onClick={() => setEditingStaff(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <FormInput
                                label="Full Name"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <FormInput
                                label="Email"
                                value={editForm.email || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <FormInput
                                label="Mobile"
                                value={editForm.mobile || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, mobile: e.target.value }))}
                            />

                            <div className="relative">
                                <FormInput
                                    label="Set New Password (Optional)"
                                    type={showEditPassword ? "text" : "password"}
                                    value={editForm.password || ""}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Type to change password..."
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEditPassword(!showEditPassword)}
                                    className="absolute right-3 top-9 text-gray-500 hover:text-cyan-500"
                                >
                                    {showEditPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                                <p className="text-xs text-orange-500 mt-1">
                                    Note: Previous password cannot be viewed (securely Encrypted).
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setEditingStaff(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
