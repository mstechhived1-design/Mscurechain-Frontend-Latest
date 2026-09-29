"use client";
import React, { useState, useEffect } from 'react';
import { emergencyService } from "@/lib/integrations/services/emergency.service";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getAccessToken } from "@/lib/integrations";
import {
    EmergencyRequest,
    CreateEmergencyRequestData,
    Hospital
} from "@/lib/integrations/types/emergency";
import { ShieldCheck, Clock, MapPin, Activity, Building2, AlertCircle, Search, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

function AmbulanceDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState({
        patientName: "",
        patientAge: "",
        patientMobile: "",
        emergencyType: "",
        description: "",
        currentLocation: "",
        eta: "",
        heartRate: "",
        temperature: "",
        oxygenLevel: "",
        bloodPressure: ""
    });
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Filtering & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Searchable Select State (for Mission Logs filter)
    const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
    const [hospitalSearchText, setHospitalSearchText] = useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Hospital Registry Multi-Select State (for Initiate Request form)
    const [isRegistryDropdownOpen, setIsRegistryDropdownOpen] = useState(false);
    const [registrySearchText, setRegistrySearchText] = useState("");
    const registryDropdownRef = React.useRef<HTMLDivElement>(null);

    // Close Mission Logs filter dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsHospitalDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close Registry multi-select dropdown on click outside
    useEffect(() => {
        const handleRegistryClickOutside = (event: MouseEvent) => {
            if (registryDropdownRef.current && !registryDropdownRef.current.contains(event.target as Node)) {
                setIsRegistryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleRegistryClickOutside);
        return () => document.removeEventListener("mousedown", handleRegistryClickOutside);
    }, []);

    // Form state
    const [formData, setFormData] = useState<CreateEmergencyRequestData>({
        patientName: "",
        patientAge: 0,
        patientGender: "male",
        patientMobile: "",
        emergencyType: "",
        description: "",
        severity: "high",
        currentLocation: "",
        eta: undefined,
        vitals: {
            bloodPressure: "",
            heartRate: undefined,
            temperature: undefined,
            oxygenLevel: undefined,
        },
        targetHospitals: [], // Empty = send to all
    });

    const { isAuthenticated, isInitialized } = useAuthStore();

    // FIX 1: Run loadData immediately on mount using localStorage directly,
    // without waiting for the auth store to finish initializing.
    // This bypasses the throttle delay that was preventing hospitals from loading.
    useEffect(() => {
        const token = getAccessToken() || localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (token && role === "ambulance") {
            loadData();
        }
    }, []);

    // FIX 2: Keep the auth redirect safety check separate.
    // Only redirect to login if auth has fully initialized AND confirmed unauthenticated.
    // Do NOT call loadData() here — the effect above already handles that on mount.
    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            console.error("❌ Auth Failed: Redirecting to login corridor...");
            if (pollingInterval) clearInterval(pollingInterval);
            window.location.href = "/emergency/login";
        }
    }, [isAuthenticated, isInitialized]);

    const loadData = async () => {
        const token = getAccessToken() || localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || role !== "ambulance") return;

        setLoading(true);
        try {
            const [hospitalsData, requestsData] = await Promise.all([
                emergencyService.getAvailableHospitals(),
                emergencyService.getMyRequests(),
            ]);
            setHospitals(hospitalsData.hospitals);
            setMyRequests(requestsData.requests);
        } catch (error: any) {
            console.error("❌ Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (pollingInterval) clearInterval(pollingInterval);
        const interval = setInterval(async () => {
            const currentToken = getAccessToken() || localStorage.getItem("accessToken");
            const currentRole = localStorage.getItem("userRole");

            if (!currentToken || currentRole !== "ambulance") {
                console.log("🛑 stopping poll - invalid session");
                if (interval) clearInterval(interval);
                return;
            }

            try {
                const requestsData = await emergencyService.getMyRequests();
                setMyRequests(requestsData.requests);
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 5000);
        setPollingInterval(interval);
    };

    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        startPolling();

        const initSocket = async () => {
            try {
                const { getSocket, subscribeToSocket } = await import('@/lib/integrations/api/socket');
                const userData = localStorage.getItem('user');
                if (!userData) return;

                const user = JSON.parse(userData);
                const currentUserId = user.id || user._id;

                if (currentUserId) {
                    subscribeToSocket('emergency:update', (updatedReq: any) => {
                        console.log('📡 [SOCKET] Emergency Mission Flux Update:', updatedReq);
                        if (isMounted) {
                            loadData();
                        }
                    });
                }
            } catch (err) {
                console.error("Socket error in Ambulance Dashboard:", err);
            }
        };

        initSocket();

        return () => {
            isMounted = false;
            stopPolling();
        };
    }, []);

    // Validation functions
    const validateMobile = () => {
        if (!formData.patientMobile) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "Required" }));
        } else if (formData.patientMobile.length !== 10) {
            setFieldErrors(prev => ({ ...prev, patientMobile: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientMobile: "" }));
        }
    };

    const validateAge = () => {
        if (!formData.patientAge && formData.patientAge !== 0) {
            setFieldErrors(prev => ({ ...prev, patientAge: "Required" }));
        } else if (formData.patientAge < 0 || formData.patientAge > 120) {
            setFieldErrors(prev => ({ ...prev, patientAge: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, patientAge: "" }));
        }
    };

    const validateHeartRate = () => {
        const hr = formData.vitals?.heartRate;
        if (hr !== undefined && hr !== null) {
            if (hr < 30 || hr > 220) {
                setFieldErrors(prev => ({ ...prev, heartRate: "Invalid" }));
            } else {
                setFieldErrors(prev => ({ ...prev, heartRate: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, heartRate: "" }));
        }
    };

    const validateTemperature = () => {
        const temp = formData.vitals?.temperature;
        if (temp !== undefined && temp !== null) {
            if (temp < 95 || temp > 108) {
                setFieldErrors(prev => ({ ...prev, temperature: "Invalid" }));
            } else {
                setFieldErrors(prev => ({ ...prev, temperature: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, temperature: "" }));
        }
    };

    const validateOxygenLevel = () => {
        const oxygen = formData.vitals?.oxygenLevel;
        if (oxygen !== undefined && oxygen !== null) {
            if (oxygen < 50 || oxygen > 100) {
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "Invalid" }));
            } else {
                setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, oxygenLevel: "" }));
        }
    };

    const validateRequiredField = (fieldName: keyof typeof fieldErrors, value: string | undefined) => {
        if (!value || value.trim() === "") {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "Required" }));
        } else {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "" }));
        }
    };

    const handleBloodPressureChange = (value: string) => {
        const filtered = value.replace(/[^0-9\/]/g, '');
        const parts = filtered.split('/');
        let hasLimitError = false;
        const validParts = parts.map(part => {
            if (part === '') return part;
            const num = parseInt(part);
            if (!isNaN(num) && num > 180) {
                hasLimitError = true;
                return part.slice(0, -1);
            }
            return part;
        });

        const finalValue = validParts.join('/');
        setFormData({
            ...formData,
            vitals: { ...formData.vitals, bloodPressure: finalValue },
        });

        if (hasLimitError || (finalValue && !/^\d{1,3}\/\d{1,3}$/.test(finalValue) && finalValue !== '')) {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "Invalid" }));
        } else {
            setFieldErrors(prev => ({ ...prev, bloodPressure: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        let hasErrors = false;
        const errors = { ...fieldErrors };

        if (!formData.patientName.trim()) { errors.patientName = "Required"; hasErrors = true; }
        if (formData.patientAge === undefined || formData.patientAge === null) { errors.patientAge = "Required"; hasErrors = true; }
        if (!formData.patientMobile) { errors.patientMobile = "Required"; hasErrors = true; }
        if (!formData.emergencyType.trim()) { errors.emergencyType = "Required"; hasErrors = true; }
        if (!formData.description.trim()) { errors.description = "Required"; hasErrors = true; }
        if (!formData.currentLocation.trim()) { errors.currentLocation = "Required"; hasErrors = true; }
        if (!formData.eta || formData.eta <= 0) { errors.eta = "Required"; hasErrors = true; }

        if (hasErrors) {
            setFieldErrors(errors);
            setMessage({ type: "error", text: "Please fix all validation errors." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        try {
            await emergencyService.createEmergencyRequest(formData);
            setMessage({
                type: "success",
                text: "Emergency request sent successfully!",
            });

            setFormData({
                patientName: "",
                patientAge: 0,
                patientGender: "male",
                patientMobile: "",
                emergencyType: "",
                description: "",
                severity: "high",
                currentLocation: "",
                eta: undefined,
                vitals: {
                    bloodPressure: "",
                    heartRate: undefined,
                    temperature: undefined,
                    oxygenLevel: undefined,
                },
                targetHospitals: [],
            });
            setFieldErrors({
                patientName: "", patientAge: "", patientMobile: "", emergencyType: "",
                description: "", currentLocation: "", eta: "", heartRate: "",
                temperature: "", oxygenLevel: "", bloodPressure: ""
            });
            setRegistrySearchText("");
            setIsRegistryDropdownOpen(false);

            loadData();
            setActiveTab("history");
        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "Failed to send emergency request" });
        } finally {
            setSubmitting(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-100 text-red-800 border-red-200";
            case "high": return "bg-orange-100 text-orange-800 border-orange-200";
            case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "low": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "accepted": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // Filter Logic
    const filteredRequests = React.useMemo(() => {
        return myRequests.filter(req => {
            const matchesSearch = req.patientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesHospital = !selectedHospitalFilter ||
                req.requestedHospitals.some(rh => rh.hospital?._id === selectedHospitalFilter) ||
                req.acceptedByHospital?._id === selectedHospitalFilter;
            return matchesSearch && matchesHospital;
        });
    }, [myRequests, searchTerm, selectedHospitalFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRequests, currentPage]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedHospitalFilter]);

    // Derived list for registry dropdown: unselected hospitals filtered by search text
    const registryFilteredHospitals = hospitals.filter(h =>
        h.name.toLowerCase().includes(registrySearchText.toLowerCase()) &&
        !(formData.targetHospitals || []).includes(h._id)
    );

    return (
        <div className="space-y-2 sm:space-y-4 pb-10">
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Registry</p>
                            <p className="text-xs sm:text-2xl font-black text-gray-900 leading-none">{hospitals.length}</p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-blue-50 rounded-lg items-center justify-center">
                            <Building2 size={16} className="text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Active</p>
                            <p className="text-xs sm:text-2xl font-black text-orange-600 leading-none">
                                {myRequests.filter(r => r.status === "pending").length}
                            </p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-orange-50 rounded-lg items-center justify-center">
                            <Activity size={16} className="text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-1.5 sm:p-4 transition-all hover:shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-0.5">
                        <div className="min-w-0">
                            <p className="text-[6px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate leading-none mb-0.5">Archive</p>
                            <p className="text-xs sm:text-2xl font-black text-emerald-600 leading-none">{myRequests.length}</p>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 bg-emerald-50 rounded-lg items-center justify-center">
                            <ShieldCheck size={16} className="text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-xs">
                <div className="flex border-b border-gray-100 bg-gray-50/30">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={`flex-1 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === "new"
                            ? "bg-white text-red-600 border-b-2 border-red-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Initiate Request
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === "history"
                            ? "bg-white text-red-600 border-b-2 border-red-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            Mission Logs
                            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>
                    </button>
                </div>

                <div className="p-1.5 sm:p-5">
                    {activeTab === "new" ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && (
                                <div className={`p-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Patient Name</label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Age</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={formData.patientAge || ""}
                                        onChange={(e) => setFormData({ ...formData, patientAge: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Age"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Gender</label>
                                    <select
                                        value={formData.patientGender}
                                        onChange={(e) => setFormData({ ...formData, patientGender: e.target.value as any })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mobile</label>
                                    <input
                                        type="tel"
                                        value={formData.patientMobile}
                                        onChange={(e) => setFormData({ ...formData, patientMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="10-digit #"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Emergency Type</label>
                                    <input
                                        type="text"
                                        value={formData.emergencyType}
                                        onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Nature of Emergency"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Location</label>
                                    <div className="relative">
                                        <MapPin size={10} className="absolute left-2 top-2.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.currentLocation}
                                            onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                                            className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                            placeholder="Incident Location"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ETA (m)</label>
                                    <input
                                        type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                                        value={formData.eta || ""}
                                        onChange={(e) => setFormData({ ...formData, eta: parseInt(e.target.value) || undefined })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none"
                                        placeholder="Min"
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Severity</label>
                                    <select
                                        value={formData.severity}
                                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none font-bold text-red-600"
                                    >
                                        <option value="critical">Critical</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Incident Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none min-h-[60px]"
                                    placeholder="Brief summary of condition..."
                                    required
                                />
                            </div>

                            {/* Vitals */}
                            <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Activity size={10} /> Clinical Vitals (Optional)
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">BP</label>
                                        <input type="text" value={formData.vitals?.bloodPressure} onChange={(e) => handleBloodPressureChange(e.target.value)} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="120/80" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">HR</label>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={formData.vitals?.heartRate || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, heartRate: parseInt(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="BPM" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Temp</label>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} step="0.1" value={formData.vitals?.temperature || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, temperature: parseFloat(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="°F" />
                                    </div>
                                    <div>
                                        <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">O2</label>
                                        <input type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()} value={formData.vitals?.oxygenLevel || ""} onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, oxygenLevel: parseInt(e.target.value) || 0 } })} className="w-full px-1.5 py-1 border border-gray-200 rounded text-[10px]" placeholder="%" />
                                    </div>
                                </div>
                            </div>

                            {/* Hospital Registry — Multi-Select with Search */}
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                                    Hospital Registry (Target Selection)
                                </label>

                                {/* Selected Hospital Tags */}
                                {(formData.targetHospitals?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {(formData.targetHospitals || []).map((id) => {
                                            const h = hospitals.find(h => h._id === id);
                                            if (!h) return null;
                                            return (
                                                <div
                                                    key={id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        background: 'white',
                                                        color: 'black',
                                                        border: '2px solid #f97316',
                                                        borderRadius: '5px',
                                                        padding: '3px 8px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        width: 'fit-content',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {h.name}
                                                    <span
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                targetHospitals: (formData.targetHospitals || []).filter(tid => tid !== id)
                                                            });
                                                        }}
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: '#f97316',
                                                            fontWeight: 900,
                                                            fontSize: '11px',
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        ✕
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Search Input and Dropdown */}
                                <div className="relative" ref={registryDropdownRef}>
                                    <div className="relative">
                                        <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={
                                                hospitals.length === 0
                                                    ? "Loading hospitals..."
                                                    : (formData.targetHospitals || []).length === hospitals.length
                                                        ? "All hospitals selected"
                                                        : "Search and select hospitals..."
                                            }
                                            value={registrySearchText}
                                            onChange={(e) => {
                                                setRegistrySearchText(e.target.value);
                                                setIsRegistryDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsRegistryDropdownOpen(true)}
                                            disabled={hospitals.length === 0 || (formData.targetHospitals || []).length === hospitals.length}
                                            className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                                        />
                                    </div>

                                    {/* Dropdown List */}
                                    {isRegistryDropdownOpen && hospitals.length > 0 && registryFilteredHospitals.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden">
                                            <div className="max-h-[200px] overflow-y-auto">
                                                {registryFilteredHospitals.map((h) => (
                                                    <div
                                                        key={h._id}
                                                        onMouseDown={(e) => {
                                                            // Use onMouseDown instead of onClick to fire before onBlur closes the dropdown
                                                            e.preventDefault();
                                                            setFormData({
                                                                ...formData,
                                                                targetHospitals: [...(formData.targetHospitals || []), h._id]
                                                            });
                                                            setRegistrySearchText('');
                                                            // Keep dropdown open so user can keep selecting
                                                        }}
                                                        className="px-3 py-2 text-[10px] font-black uppercase tracking-tight cursor-pointer hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
                                                    >
                                                        <p className="text-gray-800 hover:text-orange-600">{h.name}</p>
                                                        {h.address && (
                                                            <p className="text-[8px] font-bold text-gray-400 truncate mt-0.5 normal-case tracking-normal">{h.address}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No results state */}
                                    {isRegistryDropdownOpen && hospitals.length > 0 && registryFilteredHospitals.length === 0 && registrySearchText !== '' && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden">
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No hospitals found</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Helper text */}
                                <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest">
                                    {hospitals.length === 0
                                        ? "Loading registry..."
                                        : (formData.targetHospitals || []).length === 0
                                            ? "Leave empty to alert all hospitals, or select specific targets above"
                                            : `${(formData.targetHospitals || []).length} of ${hospitals.length} hospital${hospitals.length !== 1 ? 's' : ''} selected`
                                    }
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 bg-linear-to-r from-red-600 to-orange-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {submitting ? "Processing..." : "Dispatch Emergency Alert"}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {/* Filters Bar */}
                            <div className="flex flex-col sm:flex-row gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search patient name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-medium"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="relative flex-1 sm:max-w-[240px]" ref={dropdownRef}>
                                    <div
                                        onClick={() => setIsHospitalDropdownOpen(!isHospitalDropdownOpen)}
                                        className="w-full pl-9 pr-10 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-medium cursor-pointer flex items-center justify-between min-h-[32px]"
                                    >
                                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <span className={`truncate ${!selectedHospitalFilter ? "text-gray-400" : "text-gray-900"}`}>
                                            {selectedHospitalFilter
                                                ? hospitals.find(h => h._id === selectedHospitalFilter)?.name || "Selected Hospital"
                                                : "Filter by Hospital"
                                            }
                                        </span>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {selectedHospitalFilter && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHospitalFilter("");
                                                    }}
                                                    className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isHospitalDropdownOpen ? "rotate-180" : ""}`} />
                                        </div>
                                    </div>

                                    {/* Hybrid Search Dropdown */}
                                    {isHospitalDropdownOpen && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            <div className="p-2 border-b border-gray-50 bg-gray-50/30">
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        placeholder="Search registry..."
                                                        value={hospitalSearchText}
                                                        onChange={(e) => setHospitalSearchText(e.target.value)}
                                                        className="w-full pl-7 pr-2 py-1.5 text-[10px] border border-gray-200 rounded outline-none focus:border-red-400 font-medium"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto">
                                                <div
                                                    onClick={() => {
                                                        setSelectedHospitalFilter("");
                                                        setIsHospitalDropdownOpen(false);
                                                        setHospitalSearchText("");
                                                    }}
                                                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${!selectedHospitalFilter ? "bg-red-50 text-red-600" : "hover:bg-gray-50 text-gray-400"}`}
                                                >
                                                    All Hospitals (Global)
                                                </div>
                                                {hospitals
                                                    .filter(h => h.name.toLowerCase().includes(hospitalSearchText.toLowerCase()))
                                                    .map((h) => (
                                                        <div
                                                            key={h._id}
                                                            onClick={() => {
                                                                setSelectedHospitalFilter(h._id);
                                                                setIsHospitalDropdownOpen(false);
                                                                setHospitalSearchText("");
                                                            }}
                                                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-tight cursor-pointer transition-colors border-t border-gray-50/50 ${selectedHospitalFilter === h._id ? "bg-red-50 text-red-600" : "hover:bg-gray-50 text-gray-700 hover:text-red-500"}`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>{h.name}</span>
                                                                <span className="text-[7px] font-bold text-gray-400 truncate opacity-70 group-hover:opacity-100">{h.address}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                                {hospitals.filter(h => h.name.toLowerCase().includes(hospitalSearchText.toLowerCase())).length === 0 && (
                                                    <div className="p-4 text-center">
                                                        <p className="text-[10px] font-bold text-gray-400 italic">No hospitals found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-10 flex flex-col items-center justify-center gap-2">
                                    <Clock className="animate-spin text-red-600" size={24} />
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[.2em]">Synchronizing Logs...</p>
                                </div>
                            ) : filteredRequests.length === 0 ? (
                                <div className="py-10 text-center bg-gray-50/20 rounded-xl border border-dashed border-gray-200">
                                    <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Logs Found Matching Filters</p>
                                    {(searchTerm || selectedHospitalFilter) && (
                                        <button
                                            onClick={() => { setSearchTerm(""); setSelectedHospitalFilter(""); }}
                                            className="mt-2 text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                        >
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {paginatedRequests.map((request) => (
                                        <div key={request._id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-xs hover:border-gray-200 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight group-hover:text-red-600 transition-colors">{request.patientName}</h3>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest italic">{request.patientAge}Y • {request.patientGender}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border transition-all ${getSeverityColor(request.severity)}`}>
                                                        {request.severity}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest transition-all ${getStatusColor(request.status)}`}>
                                                        {request.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Protocol</p>
                                                    <p className="text-[9px] font-bold text-gray-700 truncate">{request.emergencyType}</p>
                                                </div>
                                                <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Coordinate</p>
                                                    <p className="text-[9px] font-bold text-gray-700 truncate flex items-center gap-1">
                                                        <MapPin size={8} className="text-red-400" />
                                                        {request.currentLocation}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Responses Node Status */}
                                            <div className="border-t border-gray-50 pt-2 mt-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Network Node Status</p>
                                                    <div className="h-0.5 flex-1 mx-2 bg-gray-50" />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {request.requestedHospitals.map((rh, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-gray-50/30 px-2 py-1 rounded border border-gray-100/50">
                                                            <span className="text-[8px] font-bold text-gray-600 truncate max-w-[70%]" title={rh.hospital?.name}>{rh.hospital?.name || "Remote Node"}</span>
                                                            <span className={`text-[7px] font-black uppercase ${getStatusColor(rh.status)} bg-transparent px-0`}>
                                                                {rh.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {request.acceptedByHospital && (
                                                <div className="mt-2 p-2 bg-emerald-50/40 border border-emerald-100 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                                                        <ShieldCheck size={10} className="text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-emerald-800 uppercase tracking-tight">Mission Accepted</p>
                                                        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">{request.acceptedByHospital?.name}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3 flex items-center justify-between opacity-50 border-t border-gray-50 pt-2">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> {format(new Date(request.createdAt), 'MMM dd, HH:mm')}
                                                </p>
                                                <p className="text-[8px] font-mono text-gray-400 uppercase tracking-tighter">REF: {request._id.slice(-8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
                                            </p>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {Array.from({ length: totalPages }).map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-black transition-all ${currentPage === i + 1
                                                                ? "bg-red-600 text-white shadow-sm"
                                                                : "border border-gray-100 text-gray-500 hover:bg-gray-50"
                                                                }`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(AmbulanceDashboard);