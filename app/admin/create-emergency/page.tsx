"use client";

import React, { useState, useEffect } from "react";

import { adminService } from "@/lib/integrations/services/admin.service";
import { Ambulance, Eye, EyeOff, Edit, Trash2, X, Building2, Car } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, Card, FormInput, Button } from "@/components/admin";

interface EmergencyData {
    name: string;
    email: string;
    mobile: string;
    password: string;
    vehicleNumber: string;
    driverLicense?: string;
}

export default function CreateEmergency() {

    // Creation Form State
    const [formData, setFormData] = useState<EmergencyData>({
        name: "",
        email: "",
        mobile: "",
        password: "",
        vehicleNumber: "",
        driverLicense: ""
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Management State
    const [existingStaff, setExistingStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Edit State
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Partial<EmergencyData>>({});
    const [showEditPassword, setShowEditPassword] = useState(false);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoadingStaff(true);
            const data = await adminService.getEmergencyUsersClient();
            setExistingStaff(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load ambulance personnel");
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "mobile") {
            // Basic mobile validation allowing only numbers and max 10
            if (!/^\d{0,10}$/.test(value)) return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = (): boolean => {
        if (!formData.name || !formData.email || !formData.mobile || !formData.password || !formData.vehicleNumber) {
            toast.error("Please fill all Required details.");
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
            await adminService.createEmergencyUserClient(formData);

            toast.success(`Ambulance Personnel created successfully!`);

            setFormData({
                name: "", email: "", mobile: "", password: "",
                vehicleNumber: "", driverLicense: ""
            });
            fetchStaff();

        } catch (err: any) {
            toast.error(err.message || "Failed to create");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Personnel?")) return;
        const toastId = toast.loading("Deleting...");
        try {
            await adminService.deleteEmergencyUserClient(id);
            toast.success("Deleted successfully", { id: toastId });
            fetchStaff();
        } catch (error: any) {
            toast.error("Failed to delete", { id: toastId });
        }
    };

    const handleEdit = (staff: any) => {
        setEditingStaff(staff);
        setEditForm({
            name: staff.name,
            email: staff.email,
            mobile: staff.mobile,
            password: "",
            vehicleNumber: staff.vehicleNumber,
            driverLicense: staff.driverLicense
        });
        setShowEditPassword(false);
    };

    const handleUpdate = async () => {
        if (!editingStaff) return;
        const toastId = toast.loading("Updating...");

        const payload: any = { ...editForm };
        if (!payload.password) delete payload.password;

        try {
            await adminService.updateEmergencyUserClient(editingStaff._id, payload);
            toast.success("Updated successfully", { id: toastId });
            setEditingStaff(null);
            fetchStaff();
        } catch (error: any) {
            toast.error("Failed to update", { id: toastId });
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12">
            <PageHeader
                icon={<Ambulance className="text-red-500" />}
                title="Create Ambulance Personnel"
                subtitle="Manage emergency unit drivers and staff"
            />

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Left Column: Existing Staff List */}
                <div className="flex-1 order-2 xl:order-1">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                        <Building2 className="text-blue-500" /> Existing Personnel ({existingStaff.length})
                    </h2>

                    {loadingStaff ? (
                        <div className="text-center py-12 opacity-50">Loading personnel...</div>
                    ) : existingStaff.length === 0 ? (
                        <div className="text-center py-12 opacity-50 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed">
                            No ambulance personnel found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {existingStaff.map((staff) => (
                                <Card key={staff._id} padding="p-5" className="hover:shadow-lg transition-shadow relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold text-lg">
                                                {staff.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-color)' }}>{staff.name}</h3>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(staff)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(staff._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm" style={{ color: 'var(--secondary-color)' }}>
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-24">Vehicle:</span>
                                            <span className="font-medium flex items-center gap-2">
                                                <Car size={14} /> {staff.vehicleNumber}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-24">Mobile:</span>
                                            <span className="font-medium">{staff.mobile}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <span className="opacity-70 w-24">Status:</span>
                                            <span className={`font-medium capitalize ${staff.status === 'active' ? 'text-green-500' : 'text-orange-500'}`}>
                                                {staff.status}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Create Form */}
                <div className="w-full xl:w-[450px] order-1 xl:order-2">
                    <div className="sticky top-6 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card title="Ambulance Personnel Registration" icon={<Ambulance className="text-red-500" />} padding="p-6">
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
                                        label="Vehicle Number"
                                        name="vehicleNumber"
                                        required
                                        value={formData.vehicleNumber}
                                        onChange={handleChange}
                                        placeholder="XX-00-XX-0000"
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
                                    <FormInput
                                        label="Driver License (Optional)"
                                        name="driverLicense"
                                        value={formData.driverLicense}
                                        onChange={handleChange}
                                        placeholder="License Number"
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
                                            className="absolute right-3 top-9 text-gray-500 hover:text-red-500"
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
                                        icon={<Ambulance size={18} />}
                                        className="w-full py-4 text-lg shadow-lg hover:shadow-xl bg-red-600 hover:bg-red-700"
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
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Edit Personnel Details</h3>
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
                                label="Vehicle Number"
                                value={editForm.vehicleNumber || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
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
                                    className="absolute right-3 top-9 text-gray-500 hover:text-red-500"
                                >
                                    {showEditPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
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
