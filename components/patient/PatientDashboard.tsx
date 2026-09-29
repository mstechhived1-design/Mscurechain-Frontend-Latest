'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Pill, FlaskConical, FileCheck, Activity, Loader2, UserCircle, AlertTriangle, Building2, ChevronDown, Check, Globe, Search } from 'lucide-react';
import { patientService } from '@/lib/integrations/services/patient.service';
import AppointmentsSection from './AppointmentsSection';
import PrescriptionsSection from './PrescriptionsSection';
import LabRecordsSection from './LabRecordsSection';
import ProfileSection from './ProfileSection';
import DischargeRecordsSection from './DischargeRecordsSection';
import { EmergencyModal } from './EmergencyModal';

type TabType = 'appointments' | 'prescriptions' | 'lab-records' | 'discharge' | 'profile';
import { useSearchParams } from 'next/navigation';
import { emergencyService } from '@/lib/integrations/services/emergency.service';
import { toast } from 'react-hot-toast';

interface DashboardData {
    profile: any;
    appointments: { count: number; data: any[] };
    prescriptions: { count: number; data: any[] };
    labRecords: { count: number; data: any[] };
    dischargeRecords: { count: number; data: any[] };
    helpdeskPrescriptions: { count: number; data: any[] };
}

interface PatientDashboardProps {
    initialData?: DashboardData;
}

function PatientDashboard({ initialData }: PatientDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('appointments');
    const [loading, setLoading] = useState(!initialData);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData || null);
    const [error, setError] = useState<string | null>(null);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [selectedHospitalId, setSelectedHospitalId] = useState<string>(''); // empty means All Hospitals
    const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
    const [hospitalSearch, setHospitalSearch] = useState('');
    const [initialized, setInitialized] = useState(false);
    const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);

    const searchParams = useSearchParams() as any;
    const queryTab = ((searchParams?.get('tab') ?? null) ?? null) as TabType;

    useEffect(() => {
        if (queryTab && ['appointments', 'prescriptions', 'lab-records', 'discharge', 'profile'].includes(queryTab)) {
            setActiveTab(queryTab);
        }
    }, [queryTab]);

    useEffect(() => {
        fetchHospitals();
    }, []);

    useEffect(() => {
        if (!initialized) {
            setInitialized(true);
            // Skip the very first fetch only if we already have initialData for the global view
            if (initialData && selectedHospitalId === '') {
                return;
            }
        }
        fetchDashboardData(selectedHospitalId);
    }, [selectedHospitalId]);

    // Emergency Background Tracking
    const lastNotifiedStatus = React.useRef<string | null>(null);
    useEffect(() => {
        const checkEmergencyStatus = async () => {
            const activeId = localStorage.getItem('activeEmergencyRequestId');
            setActiveEmergencyId(activeId);
            if (!activeId) {
                lastNotifiedStatus.current = null;
                return;
            }

            try {
                const { request } = await emergencyService.getEmergencyRequestById(activeId);

                if (request.status === 'accepted' && lastNotifiedStatus.current !== 'accepted') {
                    // One-time notification for acceptance
                    toast.success(`SIGNAL CAPTURED: ${request.acceptedByHospital?.name || 'Hospital'} is responding!`, {
                        icon: '🚑',
                        duration: 8000,
                        className: 'font-black uppercase tracking-widest text-[10px] bg-emerald-600 text-white'
                    });

                    try {
                        const audio = new Audio('https://res.cloudinary.com/dnjxgcl3f/video/upload/v1772986420/alert_mscure.mp3');
                        audio.play().catch(() => { });
                    } catch (e) { }

                    lastNotifiedStatus.current = 'accepted';
                }

                if (request.status === 'completed' || request.status === 'cancelled') {
                    localStorage.removeItem('activeEmergencyRequestId');
                    lastNotifiedStatus.current = null;
                }
            } catch (error) {
                console.error("Passive emergency tracking error:", error);
            }
        };

        const interval = setInterval(checkEmergencyStatus, 10000);
        checkEmergencyStatus(); // Initial check
        return () => clearInterval(interval);
    }, []);

    const fetchHospitals = async () => {
        try {
            const response = await patientService.getHospitals();
            if (response.success) {
                setHospitals(response.data || []);
            }
        } catch (err) {
            console.error('Error fetching hospitals:', err);
        }
    };

    const fetchDashboardData = async (hospitalId?: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await patientService.getDashboardData(hospitalId);
            if (response.success && response.data) {
                setDashboardData(response.data);
            } else {
                setError('Failed to load dashboard data');
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('An error occurred while loading your medical records');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        {
            id: 'appointments' as TabType,
            label: 'Visits',
            icon: Calendar,
            count: dashboardData?.appointments?.count || 0,
            color: 'blue',
        },
        {
            id: 'prescriptions' as TabType,
            label: 'Medication',
            icon: Pill,
            count: (dashboardData?.prescriptions?.data || []).filter(p => p.displayType !== 'Hospital Administration').length,
            color: 'green',
        },
        {
            id: 'lab-records' as TabType,
            label: 'Lab',
            icon: FlaskConical,
            count: dashboardData?.labRecords?.count || 0,
            color: 'purple',
        },
        {
            id: 'discharge' as TabType,
            label: 'Discharge',
            icon: FileCheck,
            count: dashboardData?.dischargeRecords?.count || 0,
            color: 'red',
        },
    ];

    const getTabColorClasses = (color: string, isActive: boolean) => {
        const colors: Record<string, { active: string; inactive: string; badge: string }> = {
            blue: {
                active: 'bg-blue-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
            },
            green: {
                active: 'bg-green-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20',
                badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
            },
            purple: {
                active: 'bg-purple-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20',
                badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
            },
            red: {
                active: 'bg-red-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20',
                badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
            },
            orange: {
                active: 'bg-orange-600 text-white',
                inactive: 'text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20',
                badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
            },
        };

        return isActive ? colors[color].active : colors[color].inactive;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium tracking-tight">Loading Records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md p-6">
                    <Activity className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Access Error
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => fetchDashboardData(selectedHospitalId)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const filteredHospitals = hospitals.filter(h => 
        h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || 
        (h.city && h.city.toLowerCase().includes(hospitalSearch.toLowerCase())) ||
        (h.address && h.address.toLowerCase().includes(hospitalSearch.toLowerCase()))
    );

    return (
        <div className="w-full py-2 sm:py-6 space-y-3 sm:space-y-6">
            {/* Simple Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-3 sm:pb-6 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between sm:block">
                    <div>
                        <h1 className="text-base sm:text-xl font-black text-gray-950 dark:text-white uppercase tracking-tight italic flex items-center gap-2">
                            <div className="w-1 h-5 sm:w-1.5 sm:h-8 bg-blue-600 rounded-full" />
                            Health <span className="text-blue-600">Records</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] text-[7px] sm:text-[10px] mt-0.5 ml-0.5">
                            Your Personal Medical History
                        </p>
                    </div>

                    <div className="sm:hidden flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-white/5">
                        <UserCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight italic text-[10px]">
                            {dashboardData?.profile?.user?.name?.split(' ')[0] || 'Member'}
                        </span>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 sm:gap-3 bg-gray-50 dark:bg-white/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <p className="text-[7px] sm:text-[9px] font-black uppercase text-gray-400 tracking-widest">Signed In</p>
                        <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight italic text-xs sm:text-sm">
                            {dashboardData?.profile?.user?.name || 'Member'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all outline-none ${activeEmergencyId
                        ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                        : 'bg-red-600 hover:bg-red-700 animate-pulse shadow-red-500/20'
                        }`}
                >
                    {activeEmergencyId ? (
                        <>
                            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                            Track Signal
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                            Emergency
                        </>
                    )}
                </button>
            </div>

            {/* Hospital Switcher Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-white/5 rounded-[20px] sm:rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">
                            Facility <span className="text-blue-600">Context</span>
                        </h2>
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                            {selectedHospitalId ? 'Viewing Single Hospital' : 'Viewing Global History'}
                        </p>
                    </div>
                </div>

                <div className="relative w-full sm:w-72">
                    <button
                        onClick={() => setIsHospitalDropdownOpen(!isHospitalDropdownOpen)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:border-blue-300 dark:hover:border-blue-900/40 transition-all group"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            {selectedHospitalId ? (
                                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight">
                                {selectedHospitalId
                                    ? hospitals.find(h => h._id === selectedHospitalId)?.name || 'Loading...'
                                    : 'Global Health Network'}
                            </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isHospitalDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isHospitalDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl p-2 z-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 border-b border-slate-100 dark:border-white/5 mb-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search hospitals or cities..."
                                        value={hospitalSearch}
                                        onChange={(e) => setHospitalSearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-medium placeholder:uppercase placeholder:tracking-wider placeholder:text-[9px] dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                                {(hospitalSearch === '') && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSelectedHospitalId('');
                                                setIsHospitalDropdownOpen(false);
                                                setHospitalSearch('');
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-colors ${selectedHospitalId === '' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Globe className={`w-4 h-4 ${selectedHospitalId === '' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight">Global History</p>
                                                    <p className="text-[9px] font-bold opacity-60">Unified view of all hospitals</p>
                                                </div>
                                            </div>
                                            {selectedHospitalId === '' && <Check className="w-4 h-4" />}
                                        </button>

                                        <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-2" />
                                    </>
                                )}

                                {filteredHospitals.length > 0 ? filteredHospitals.map((h) => (
                                    <button
                                        key={h._id}
                                        onClick={() => {
                                            setSelectedHospitalId(h._id);
                                            setIsHospitalDropdownOpen(false);
                                            setHospitalSearch('');
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-colors ${selectedHospitalId === h._id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Building2 className={`w-4 h-4 shrink-0 mt-0.5 ${selectedHospitalId === h._id ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-black uppercase tracking-tight truncate">{h.name}</p>
                                                <p className="text-[9px] font-bold opacity-80 text-slate-500 dark:text-slate-400 truncate">
                                                    {h.address ? `${h.address}, ` : ''}{h.city} • {h.visitCount || 0} Visits
                                                </p>
                                            </div>
                                        </div>
                                        {selectedHospitalId === h._id && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                )) : (
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No hospitals found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Responsive Tabs - More Compact on Mobile */}
            <div className="sticky top-16 sm:top-20 z-10">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/10 flex overflow-x-auto no-scrollbar md:grid md:grid-cols-4 gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-none min-w-[90px] sm:min-w-[100px] md:min-w-0 md:flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5`} />
                                <span className="hidden xs:inline">{tab.label}</span>
                                <span className="xs:hidden">{tab.id === 'appointments' ? 'Visits' : tab.id === 'lab-records' ? 'Labs' : tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] sm:min-h-[600px] pb-10">
                {activeTab === 'profile' && (
                    <ProfileSection
                        profile={dashboardData?.profile}
                        appointments={dashboardData?.appointments?.data || []}
                    />
                )}
                {activeTab === 'appointments' && (
                    <AppointmentsSection 
                        appointments={dashboardData?.appointments?.data || []} 
                        hospitals={hospitals}
                    />
                )}
                {activeTab === 'prescriptions' && (
                    <PrescriptionsSection
                        prescriptions={dashboardData?.prescriptions?.data || []}
                        patientName={dashboardData?.profile?.user?.name}
                        patientEmail={dashboardData?.profile?.user?.email || dashboardData?.profile?.email}
                    />
                )}
                {activeTab === 'lab-records' && (
                    <LabRecordsSection
                        labRecords={dashboardData?.labRecords?.data || []}
                        patientName={dashboardData?.profile?.user?.name}
                        patientEmail={dashboardData?.profile?.user?.email || dashboardData?.profile?.email}
                    />
                )}
                {activeTab === 'discharge' && (
                    <DischargeRecordsSection
                        records={dashboardData?.dischargeRecords?.data || []}
                    />
                )}
            </div>

            <EmergencyModal
                isOpen={isEmergencyModalOpen}
                onClose={() => setIsEmergencyModalOpen(false)}
                patientProfile={dashboardData?.profile}
                availableHospitals={hospitals}
            />
        </div>
    );
}

export default React.memo(PatientDashboard);
