'use client';

import React, { useEffect, useState } from "react";
import {
    Trash2,
    User,
    Building2,
    Search,
    Edit3,
    Mail,
    Phone,
    Shield,
    Database,
    Plus,
    X,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import {
    PageHeader,
    Table,
    Badge,
    Button,
    Modal,
    ConfirmModal,
    FormInput,
    getStatusVariant
} from '@/components/admin';
import { useRouter } from "next/navigation";

const HRManagementPage = () => {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [hrUsers, setHrUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [selectedHospital, setSelectedHospital] = useState("");
    const [hospitalSearch, setHospitalSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalHR, setTotalHR] = useState(0);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        id: "",
        onConfirm: () => { }
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchHospitals();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchHRUsers();
        }
    }, [isAuthenticated, debouncedSearch, currentPage, selectedHospital]);

    const fetchHospitals = async () => {
        try {
            const resp = await adminService.getHospitalsClient();
            setHospitals(resp || []);
        } catch (err: any) {
            console.error("Failed to fetch hospitals");
        }
    };

    const fetchHRUsers = async () => {
        setLoading(true);
        try {
            const resp = await adminService.getUsersClient({
                role: 'hr',
                page: currentPage,
                limit: 10,
                search: debouncedSearch,
                hospitalId: selectedHospital || undefined
            });
            if (resp && resp.users) {
                setHrUsers(resp.users);
                setTotalPages(resp.pagination?.pages || 1);
                setTotalHR(resp.pagination?.total || resp.users.length || 0);
            } else if (Array.isArray(resp)) {
                setHrUsers(resp);
                setTotalPages(1);
                setTotalHR(resp.length);
            } else {
                setHrUsers([]);
                setTotalPages(1);
                setTotalHR(0);
            }
        } catch (err: any) {
            console.error("Failed to fetch HR users", err);
            toast.error("Failed to fetch HR directory.");
        } finally {
            setLoading(false);
        }
    };

    // Removed handleSeedHR as requested

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            id: id,
            onConfirm: async () => {
                try {
                    await adminService.deleteUserClient(id);
                    setHrUsers(prev => prev.filter(u => u._id !== id));
                    toast.success("HR record removed.");
                } catch (err: any) {
                    toast.error("Deletions failed.");
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsUpdating(true);
        try {
            const updated = await adminService.updateUserClient(editingUser._id, {
                name: editingUser.name,
                email: editingUser.email,
                mobile: editingUser.mobile
            });

            setHrUsers(prev => prev.map((u) => (u._id === updated._id || u._id === editingUser._id ? { ...u, ...updated } : u)));
            setEditingUser(null);
            toast.success("HR profile updated.");
            fetchHRUsers(); // Refresh to get populated data
        } catch (err: any) {
            toast.error("Update failed.");
        } finally {
            setIsUpdating(false);
        }
    };

    // Server-side filtering, use hrUsers directly
    const filteredUsers = hrUsers;

    const headers = ["HR Personnel", "Hospital Assigned", "Contact Info", "Status", "Actions"];



    return (
        <div className="max-w-7xl mx-auto pb-12">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title="Remove HR Access"
                message="Are you sure you want to revoke HR access for this hospital? This action cannot be undone."
                confirmText="Remove"
                type="danger"
            />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-2 md:mb-6">
                <PageHeader
                    title="HR Management"
                    subtitle="Administer Human Resource personnel across all network hospitals"
                    icon={<Shield className="text-blue-500" />}
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-4 md:mb-6 mx-0">
                <div className="w-full lg:w-[70%] flex gap-2 md:gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email or hospital..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full border rounded-xl pl-9 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                        />
                    </div>
                    <div className="shrink-0 flex flex-col items-center justify-center bg-blue-500/5 border rounded-xl px-2.5 py-1.5 md:px-4 md:py-2 min-w-[50px] md:min-w-[80px]" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-[7px] md:text-[9px] uppercase font-bold text-gray-400 tracking-tighter md:tracking-wider leading-none mb-0.5">Total</span>
                        <span className="text-xs md:text-base font-black text-blue-500 leading-none">{totalHR}</span>
                    </div>
                </div>

                <div className="w-full lg:w-[30%] flex flex-row items-center justify-between gap-2 md:gap-3">
                    <div className="relative flex-1 group">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                        <input
                            list="hospitals-list-hr"
                            value={hospitalSearch}
                            onChange={(e) => {
                                setHospitalSearch(e.target.value);
                                const h = hospitals.find(h => h.name === e.target.value);
                                if (h) {
                                    setSelectedHospital(h._id);
                                    setCurrentPage(1);
                                } else if (e.target.value === "") {
                                    setSelectedHospital("");
                                    setCurrentPage(1);
                                }
                            }}
                            placeholder="Hospital Filter..."
                            className="w-full border rounded-xl pl-8 pr-7 py-2 md:py-3 text-[10px] md:text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                        />
                        {hospitalSearch && (
                            <button
                                onClick={() => { setHospitalSearch(""); setSelectedHospital(""); setCurrentPage(1); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
                            >
                                <X size={12} />
                            </button>
                        )}
                        <datalist id="hospitals-list-hr">
                            {hospitals.map(h => <option key={h._id} value={h.name} />)}
                        </datalist>
                    </div>

                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 md:p-1 shadow-inner border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            style={{ color: 'var(--text-color)' }}
                        >
                            Prev
                        </button>
                        <div className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-mono text-blue-500 font-bold border-x border-gray-200 dark:border-gray-700">
                            {currentPage}/{totalPages}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-1.5 md:px-3 py-1 text-[9px] md:text-xs font-bold uppercase transition-all hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            style={{ color: 'var(--text-color)' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <Table headers={headers}>
                {loading ? (
                    <tr>
                        <td colSpan={5} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm font-medium opacity-50">Loading HR personnel...</p>
                            </div>
                        </td>
                    </tr>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-indigo-500`}>
                                        {user.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[11px] md:text-sm">{user.name}</div>
                                        <div className="text-[9px] md:text-[10px] opacity-40 font-mono leading-none mt-1">ID: {user._id.slice(-8).toUpperCase()}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-[11px] md:text-sm font-medium">{user.hospital?.name || "Unassigned"}</span>
                                    <span className="text-[9px] md:text-[10px] opacity-50">{user.hospital?.city || "Global"}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs opacity-70">
                                        <Mail size={12} className="text-blue-500" />
                                        {user.email}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs opacity-70">
                                        <Phone size={12} className="text-green-500" />
                                        {user.mobile}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusVariant(user.status || 'active')}>
                                    <span className="text-[10px] font-bold">{(user.status || 'active').toUpperCase()}</span>
                                </Badge>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"
                                        title="Edit HR"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                        title="Remove HR"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5} className="py-24 text-center">
                            <User className="mx-auto text-gray-200 mb-4" size={48} />
                            <p className="text-sm font-medium opacity-50">No HR personnel found.</p>
                        </td>
                    </tr>
                )}
            </Table>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Update HR Credentials"
            >
                {editingUser && (
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <FormInput
                            label="HR Specialist Name"
                            value={editingUser.name}
                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Corporate Email"
                            type="email"
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            required
                        />
                        <FormInput
                            label="Contact Number"
                            value={editingUser.mobile}
                            onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })}
                            required
                        />
                        <div className="flex justify-end gap-3 mt-8">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button type="submit" loading={isUpdating}>Commit Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default HRManagementPage;
