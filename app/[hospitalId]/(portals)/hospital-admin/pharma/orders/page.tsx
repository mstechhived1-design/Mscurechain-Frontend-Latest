'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PharmacyBillingService } from '@/lib/integrations/services/pharmacyBilling.service';
import { Pill, Activity, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

interface PharmacyOrder {
    _id: string;
    tokenNumber: string;
    patient: {
        name: string;
        age?: number;
        gender?: string;
        mobile?: string;
    };
    doctor: {
        name: string;
    };
    medicines: any[];
    status: string;
    createdAt: string;
}

function HospitalAdminActiveOrdersPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<PharmacyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const hospitalId = (user as any)?.hospital;

    useEffect(() => {
        if (hospitalId) {
            fetchActiveOrders(hospitalId);

            // Real-time updates
            const handleNewOrder = (data: any) => {
                console.log("🔔 New Pharmacy Order Received:", data);
               
                toast.success('New Prescription Order Received!', {
                    icon: '💊',
                    duration: 5000,
                    style: {
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontWeight: 'bold',
                    },
                });

                // Refresh full list 
                fetchActiveOrders(hospitalId);
            };

            import('@/lib/integrations/api/socket').then(({ subscribeToSocket, unsubscribeFromSocket }) => {
                subscribeToSocket('new_pharmacy_order', handleNewOrder);
            });

             return () => {
                 import('@/lib/integrations/api/socket').then(({ unsubscribeFromSocket }) => {
                      unsubscribeFromSocket('new_pharmacy_order', handleNewOrder);
                 });
             };
        }
    }, [hospitalId]);

    const fetchActiveOrders = async (hospitalId: string) => {
        setLoading(true);
        try {
            const res = await PharmacyBillingService.getHospitalOrders(hospitalId);
            if (res.pharmacyOrders) {
                setOrders(res.pharmacyOrders.filter((o: any) => o.status !== 'completed'));
            }
        } catch (error) {
            console.error('❌ Error fetching active orders:', error);
            toast.error("Failed to load active orders");
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = (id: string) => {
        router.push(`/hospital-admin/pharma/billing?orderId=${id}`);
    };

    return (
        <div className="space-y-8 ">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight italic flex items-center gap-3">
                        <Pill className="w-8 h-8 text-blue-500" />
                        Prescription Queue
                    </h1>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Live Clinical Order Pipeline</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none"><table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                            <tr>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700">Token</th>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700">Patient Details</th>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700">Doctor Signature</th>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700 text-center">SKU Count</th>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700 text-center">Status</th>
                                <th className="p-3 md:p-8 border-b dark:border-gray-700 text-right">Fulfillment</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">Synchronizing with clinical nodes...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={6} className="p-24 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-20">
                                        <Activity className="w-16 h-16 text-gray-400" />
                                        <p className="text-xl font-black uppercase italic tracking-tighter">Queue Empty</p>
                                    </div>
                                </td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 group transition-all">
                                         <td className="p-3 md:p-8">
                                            <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl font-black text-xs uppercase tracking-tight shadow-sm">
                                                #{order.tokenNumber}
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-8">
                                            <div className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">{order.patient?.name || 'Unknown Entity'}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">
                                                {order.patient?.age || '-'}Y • {order.patient?.gender || '-'} • {order.patient?.mobile || '-'}
                                            </div>
                                        </td>
                                        <td className="p-3 md:p-8 text-gray-600 dark:text-gray-300 font-bold uppercase text-[11px] tracking-tight">
                                            {(order.doctor as any)?.user?.name || order.doctor?.name || 'Medical Practitioner'}
                                        </td>
                                         <td className="p-3 md:p-8 text-center">
                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase">
                                                {order.medicines?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-8 text-center">
                                             <span className="px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-8 text-right">
                                             <button
                                                onClick={() => handleProcess(order._id)}
                                                className="inline-flex items-center gap-3 px-4 md:px-8 py-4 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
                                            >
                                                <FileText size={16} />
                                                Process Bill
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(HospitalAdminActiveOrdersPage);
