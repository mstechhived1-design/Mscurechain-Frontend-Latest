'use client';

import React, { useEffect, useState, use } from "react";
import {
    Building2,
    User,
    Stethoscope,
    MapPin,
    Mail,
    ShieldCheck,
    Users,
    ArrowLeft,
    ChevronRight,
    ClipboardList,
    FlaskConical,
    Pill,
    Ambulance,
    Headphones,
    Lock,
    Smartphone,
    Search,
    CalendarDays,
    Edit2,
    X,
    Briefcase
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import {
    Badge,
    Button
} from '@/components/admin';
import Link from "next/link";

const licenseKeyMap: Record<string, string> = {
    doctors: 'doctor',
    nurses: 'nurse',
    hospitalAdmins: 'hospitalAdmin',
    helpdesk: 'helpdesk',
    pharma: 'pharmacy',
    lab: 'lab',
    staff: 'staff',
    masterhelpdesk: 'masterhelpdesk',
    hr: 'hr',
    discharge: 'discharge'
};

const HospitalPersonnelPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const router = useRouter();
    const resolvedParams = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('doctors');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const [licenseFormData, setLicenseFormData] = useState({
        enabled: false,
        startDate: '',
        endDate: ''
    });
    const [savingLicense, setSavingLicense] = useState(false);

    useEffect(() => {
        fetchPersonnel();
    }, [resolvedParams.id]);

    const fetchPersonnel = async () => {
        setLoading(true);
        try {
            const result = await adminService.getHospitalPersonnelClient(resolvedParams.id);
            setData(result);
        } catch (err: any) {
            console.error("Failed to fetch personnel", err);
            toast.error("Failed to load hospital directory.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenLicenseModal = () => {
        const key = licenseKeyMap[activeTab];
        if (!key) return;
        const license = hospital?.portalLicenses?.[key] || {};
        setLicenseFormData({
            enabled: license.enabled || false,
            startDate: license.startDate ? new Date(license.startDate).toISOString().split('T')[0] : '',
            endDate: license.endDate ? new Date(license.endDate).toISOString().split('T')[0] : ''
        });
        setIsLicenseModalOpen(true);
    };

    const handleSaveLicense = async () => {
        setSavingLicense(true);
        try {
            const key = licenseKeyMap[activeTab];
            await adminService.updateHospitalStatusClient(
                hospital._id, 
                hospital.status, 
                undefined, 
                undefined, 
                {
                    [key]: {
                        enabled: licenseFormData.enabled,
                        startDate: licenseFormData.startDate ? new Date(licenseFormData.startDate).toISOString() : undefined,
                        endDate: licenseFormData.endDate ? new Date(licenseFormData.endDate).toISOString() : undefined
                    }
                }
            );
            toast.success("License updated successfully");
            setIsLicenseModalOpen(false);
            fetchPersonnel();
        } catch (error) {
            toast.error("Failed to update license");
        } finally {
            setSavingLicense(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm font-medium">Loading hospital directory...</p>
            </div>
        );
    }

    if (!data || !data.hospital) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Building2 size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Hospital not found</h2>
                <p className="text-gray-500 mt-1 mb-6">The hospital you are looking for does not exist in our registry.</p>
                <Button onClick={() => router.back()} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    const { hospital, personnel } = data;

    const tabs = [
        { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={18} />, count: personnel.doctors?.length || 0 },
        { id: 'nurses', label: 'Nurses', icon: <Users size={18} />, count: personnel.nurses?.length || 0 },
        { id: 'hospitalAdmins', label: 'Admins', icon: <ShieldCheck size={18} />, count: personnel.hospitalAdmins?.length || 0 },
        { id: 'helpdesk', label: 'Frontdesk', icon: <Headphones size={18} />, count: personnel.helpdesk?.length || 0 },
        { id: 'pharma', label: 'Pharmacy', icon: <Pill size={18} />, count: personnel.pharma?.length || 0 },
        { id: 'lab', label: 'Lab Staff', icon: <FlaskConical size={18} />, count: personnel.lab?.length || 0 },
        { id: 'emergency', label: 'Ambulance', icon: <Ambulance size={18} />, count: personnel.emergency?.length || 0 },
        { id: 'staff', label: 'Support Staff', icon: <ClipboardList size={18} />, count: personnel.staff?.length || 0 },
        { id: 'masterhelpdesk', label: 'Master Frontdesk', icon: <ShieldCheck size={18} />, count: personnel.masterhelpdesk?.length || 0 },
        { id: 'hr', label: 'HR Management', icon: <Briefcase size={18} />, count: personnel.hr?.length || 0 },
        { id: 'discharge', label: 'Discharge Portal', icon: <ShieldCheck size={18} />, count: personnel.discharge?.length || 0 },
    ];

    const currentPersonnel = (personnel[activeTab] || []).filter((person: any) =>
        person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.mobile?.includes(searchQuery) ||
        person.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeLicenseKey = licenseKeyMap[activeTab];
    const currentLicense = activeLicenseKey ? hospital.portalLicenses?.[activeLicenseKey] : null;

    return (
        <div className="max-w-7xl mx-auto py-4 md:py-6 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 md:pb-8 px-4 md:px-4 lg:px-0">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 font-medium mb-3 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Hospitals
                    </button>
                    <div className="flex items-start md:items-center gap-3 md:gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shrink-0 mt-1 md:mt-0">
                            <Building2 size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div className="min-w-0 pr-2">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight mb-1.5 line-clamp-2 md:line-clamp-none">{hospital.name}</h1>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-[10px] md:text-sm text-gray-500">
                                <span className="flex items-start sm:items-center gap-1.5"><MapPin size={12} className="mt-0.5 sm:mt-0 shrink-0" /> <span className="line-clamp-2">{hospital.address}</span></span>
                                <span className="flex items-center gap-1.5 shrink-0"><Smartphone size={12} className="shrink-0" /> {hospital.phone}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-2 md:mt-0">
                    <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider shrink-0">
                        {hospital.status || 'Active'}
                    </Badge>
                    <div className="bg-gray-100 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-center flex md:block items-center gap-3 md:gap-0 grow md:grow-0 justify-center">
                        <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-tight">Total Staff</p>
                        <p className="text-sm md:text-lg font-bold text-gray-900 leading-tight">
                            {Object.values(personnel).reduce((acc: number, curr: any) => acc + (curr?.length || 0), 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Hub */}
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                {/* Left Tabs */}
                <div className="flex overflow-x-auto lg:flex-col w-full lg:w-64 shrink-0 gap-2 lg:gap-0 lg:space-y-1 pb-2 px-4 md:px-4 lg:px-0 no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchQuery('');
                            }}
                            className={`shrink-0 lg:w-full flex items-center justify-between p-2.5 md:p-3.5 rounded-xl transition-all text-xs md:text-sm font-semibold border lg:border-none ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md border-blue-600'
                                : 'text-gray-600 hover:bg-gray-100 border-gray-200 bg-white lg:bg-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                            <span className={`ml-3 text-[10px] md:text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right Personnel Panel */}
                <div className="flex-1 space-y-6 md:px-4 lg:px-0">
                    {/* License Information Card */}
                    {activeLicenseKey && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 text-sm md:text-base">Portal License</h3>
                                        <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentLicense?.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {currentLicense?.enabled ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs md:text-sm text-gray-600 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={14} className="text-gray-400" />
                                            <span>Valid From: {currentLicense?.startDate ? new Date(currentLicense.startDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <span className="text-gray-300">|</span>
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={14} className="text-gray-400" />
                                            <span>Expires On: {currentLicense?.endDate ? new Date(currentLicense.endDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleOpenLicenseModal} variant="outline" className="shrink-0 bg-white hover:bg-gray-50 flex items-center gap-2 text-sm w-full md:w-auto">
                                <Edit2 size={16} />
                                Edit License
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            List of {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {currentPersonnel.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPersonnel.map((person: any) => (
                                <div key={person._id} className="p-4 md:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-start gap-3 md:gap-4 group">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                        <User size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <div className="grow min-w-0">
                                        <div className="flex items-start md:items-center justify-between mb-1 gap-2 flex-col md:flex-row">
                                            <h3 className="font-bold text-xs md:text-base text-gray-900 truncate w-full">{person.name}</h3>
                                            <Badge className="bg-green-50 text-green-600 border-0 text-[8px] md:text-[10px] uppercase font-black px-2 shrink-0 self-start md:self-auto">
                                                Active
                                            </Badge>
                                        </div>

                                        <div className="space-y-1.5 mt-2 md:mt-3">
                                            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-gray-600">
                                                <Smartphone size={10} className="text-gray-400 shrink-0 md:w-3 md:h-3" />
                                                <span className="font-mono font-bold text-blue-600 truncate">{person.mobile}</span>
                                                <span className="text-[8px] md:text-[10px] text-gray-400 font-medium uppercase tracking-widest shrink-0">(Login ID)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-gray-600">
                                                <Mail size={10} className="text-gray-400 shrink-0 md:w-3 md:h-3" />
                                                <span className="truncate">{person.email || 'No email registered'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {person.profile?.specialization || person.profile?.designation || activeTab}
                                            </span>
                                            <Link href={`/admin/users?search=${person.mobile}`}>
                                                <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                    Audit Users <ChevronRight size={12} />
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                            <Users className="mx-auto text-gray-300 mb-3" size={48} />
                            <p className="text-gray-500 font-medium">No personnel found in this category.</p>
                            {searchQuery && <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* License Edit Modal */}
            {isLicenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-blue-600" />
                                Edit Portal License
                            </h3>
                            <button 
                                onClick={() => setIsLicenseModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-5 space-y-5">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Enable Portal</p>
                                    <p className="text-xs text-gray-500">Allow users to access this portal</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={licenseFormData.enabled}
                                        onChange={(e) => setLicenseFormData({...licenseFormData, enabled: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Date</label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="date"
                                            value={licenseFormData.startDate}
                                            onChange={(e) => setLicenseFormData({...licenseFormData, startDate: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">End Date (Expiration)</label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="date"
                                            value={licenseFormData.endDate}
                                            onChange={(e) => setLicenseFormData({...licenseFormData, endDate: e.target.value})}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <Button 
                                onClick={() => setIsLicenseModalOpen(false)}
                                variant="outline"
                                className="bg-white hover:bg-gray-100"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSaveLicense}
                                disabled={savingLicense}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
                            >
                                {savingLicense ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HospitalPersonnelPage;
