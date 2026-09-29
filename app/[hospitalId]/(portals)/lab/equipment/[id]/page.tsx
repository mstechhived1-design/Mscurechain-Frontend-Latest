'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Edit2,
    Cpu,
    Calendar,
    IndianRupee,
    Settings,
    ShieldAlert,
    AlertTriangle,
    CheckCircle,
    UserCheck,
    Clock,
    Activity,
    Info,
    Notebook,
} from 'lucide-react';
import { LabEquipmentService } from '@/lib/integrations/services/labEquipment.service';
import { LabEquipment } from '@/lib/integrations/types/labEquipment';
import { toast } from 'react-hot-toast';

function getAlerts(equipment: LabEquipment) {
    const alerts: { message: string }[] = [];
    console.log(Object.keys(equipment));

    // Warranty expiry check
    
    if (equipment.warrantyExpiry) {
        const warrantyDate = new Date(equipment.warrantyExpiry);
        const today = new Date();
        const daysLeft = Math.ceil(
            (warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft < 0) {
            alerts.push({ message: `Warranty expired on ${warrantyDate.toLocaleDateString()}` });
        } else if (daysLeft <= 30) {
            alerts.push({ message: `Warranty expiring soon (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)` });
        }
    }

    // Equipment status check
    if (equipment.status === 'Under Maintenance' || equipment.status === 'Repairing') {
        alerts.push({ message: `Equipment is currently marked as "${equipment.status}"` });
    }

    if (equipment.status === 'Out of Service' || equipment.status === 'Disposed') {
        alerts.push({ message: `Equipment is unavailable (status: "${equipment.status}")` });
    }

    // Low quantity check
    if (typeof equipment.quantity === 'number' && equipment.quantity <= 0) {
        alerts.push({ message: 'No units currently available in stock' });
    }

    return alerts;
}

function EquipmentDetailsPage() {
    const router = useRouter();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;
    const id = params?.id as string;

    const [equipment, setEquipment] = useState<LabEquipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNavigating, startNavigation] = useTransition();

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const data = await LabEquipmentService.getEquipmentById(id);
            setEquipment(data);
        } catch (error) {
            console.error("Failed to load details", error);
            toast.error("Failed to load equipment details");
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Retrieving asset data...</p>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-12 text-center py-12">
                <p className="text-sm text-gray-500">Asset record not found</p>
                <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">
                    Go Back
                </button>
            </div>
        );
    }

    const alerts = getAlerts(equipment);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl transition-colors border border-slate-200 dark:border-gray-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase">
                            {equipment.name}
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                            Code: {equipment.code}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => router.push(`/${hospitalId}/lab/equipment/manage?id=${equipment._id}`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                >
                    <Edit2 className="w-4 h-4" />
                    Edit Asset
                </button>
            </div>

            {/* Warning banner */}
            {alerts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100">Critical Notifications</h4>
                    </div>
                    <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                        {alerts.map((al, idx) => (
                            <li key={idx}>{al.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left pane: Image, Quick Status */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                        <img
                            src={equipment.image || 'https://placehold.co/200x200/f3f4f6/374151?text=Equipment'}
                            alt={equipment.name}
                            className="w-44 h-44 object-contain rounded-2xl border border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 p-2 mb-4"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/f3f4f6/374151?text=Equipment';
                            }}
                        />

                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase text-center mb-1">
                            {equipment.brand}
                        </h3>
                        <p className="text-xs text-gray-400 text-center uppercase tracking-wider mb-4">
                            Model {equipment.model}
                        </p>

                        <span className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest ${
                            equipment.status === 'Working'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                                : equipment.status === 'Under Maintenance' || equipment.status === 'Repairing'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                        }`}>
                            {equipment.status}
                        </span>
                    </div>

                    {/* QR Code / Barcode display */}
                    {(equipment.qrCode || equipment.barcode) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-3">
                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider border-b pb-2">
                                Asset Identifiers
                            </h4>
                            {equipment.qrCode && (
                                <div className="text-xs">
                                    <span className="font-semibold text-gray-400">QR Code: </span>
                                    <span className="font-mono text-gray-900 dark:text-white font-bold">{equipment.qrCode}</span>
                                </div>
                            )}
                            {equipment.barcode && (
                                <div className="text-xs">
                                    <span className="font-semibold text-gray-400">Barcode: </span>
                                    <span className="font-mono text-gray-900 dark:text-white font-bold">{equipment.barcode}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Pane: Split Information Blocks */}
                <div className="md:col-span-2 space-y-6">
                    {/* SECTION 1: Basic Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                            <Cpu className="w-4 h-4 text-indigo-600" />
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                            <div>
                                <span className="text-gray-400 block font-medium">Category</span>
                                <span className="font-bold text-gray-900 dark:text-white uppercase">{equipment.category}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Department</span>
                                <span className="font-bold text-gray-900 dark:text-white uppercase">
                                    {typeof equipment.department === 'object' ? equipment.department.name : 'General'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Quantity Available</span>
                                <span className="font-bold text-gray-900 dark:text-white font-mono">{equipment.quantity} {equipment.unit}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Purchase Information */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                            <IndianRupee className="w-4 h-4 text-emerald-600" />
                            Purchase Information
                        </h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                            <div>
                                <span className="text-gray-400 block font-medium">Purchase Date</span>
                                <span className="font-bold text-gray-900 dark:text-white font-mono">
                                    {equipment.purchaseDate ? new Date(equipment.purchaseDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Purchase Price</span>
                                <span className="font-bold text-gray-900 dark:text-white font-mono">₹{equipment.purchasePrice.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Invoice Number</span>
                                <span className="font-bold text-gray-900 dark:text-white font-mono uppercase">{equipment.invoiceNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block font-medium">Warranty Expiry</span>
                                <span className="font-bold text-gray-900 dark:text-white font-mono">
                                    {equipment.warrantyExpiry ? new Date(equipment.warrantyExpiry).toLocaleDateString() : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Maintenance Information */}
                   

                    {/* SECTION 4: Description & Notes */}
                    {(equipment.description || equipment.notes) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                <Notebook className="w-4 h-4 text-purple-600" />
                                Description & Notes
                            </h3>
                            {equipment.description && (
                                <div className="text-xs">
                                    <span className="text-gray-400 block font-medium">Description</span>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1 font-semibold leading-relaxed">{equipment.description}</p>
                                </div>
                            )}
                            {equipment.notes && (
                                <div className="text-xs">
                                    <span className="text-gray-400 block font-medium">Internal Notes</span>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1 font-semibold leading-relaxed">{equipment.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(EquipmentDetailsPage);
