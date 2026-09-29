'use client';

import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/integrations";
import { Building2, Plus, Trash2, MapPin, Globe, Phone, Mail, Calendar, Clock, Star, Bed, Activity, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import {
    PageHeader,
    Card,
    FormInput,
    Button
} from "@/components/admin";

function EditHospital() {
    const router = useRouter();
    const params = useParams() as any;
    const id = params.id as string;

    const [formData, setFormData] = useState({
        name: "",
        street: "",
        landmark: "",
        city: "",
        area: "",
        state: "",
        address: "", // Will be computed
        phone: "",
        email: "",
        pincode: "",
        establishedYear: "",
        website: "",
        operatingHours: "24/7",
        ambulanceAvailability: true,
        rating: "4.5",
        location: { lat: "", lng: "" },
        specialities: [] as string[],
        services: [] as string[],
        availablePortals: [] as string[],
        portalLicenses: {} as Record<string, { enabled: boolean; startDate: string; endDate: string }>
    });

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [tempSpecialty, setTempSpecialty] = useState("");
    const [tempService, setTempService] = useState("");

    // ✅ Bulk License State
    const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
    const [bulkStartDate, setBulkStartDate] = useState("");
    const [bulkEndDate, setBulkEndDate] = useState("");
    const [licenseMode, setLicenseMode] = useState<'individual' | 'total'>('individual');

    useEffect(() => {
        if (id) {
            fetchHospitalDetails();
        }
    }, [id]);

    const fetchHospitalDetails = async () => {
        setFetching(true);
        try {
            const result = await adminService.getHospitalPersonnelClient(id);
            const hospitalData = result.hospital;

            let lat = "";
            let lng = "";
            if (hospitalData.location) {
                 if (hospitalData.location.coordinates && Array.isArray(hospitalData.location.coordinates)) {
                     lng = hospitalData.location.coordinates[0]?.toString() || "";
                     lat = hospitalData.location.coordinates[1]?.toString() || "";
                 } else if (hospitalData.location.lat !== undefined) {
                     lat = hospitalData.location.lat.toString();
                     lng = hospitalData.location.lng.toString();
                 }
            }
            
            // Auto-detect allocated portals based on existing personnel and licenses
            let detectedPortals = [...(hospitalData.availablePortals || [])];
            const personnel = result.personnel || {};
            
            // Always ensure portals with existing personnel/credentials are included (Additive)
            if (personnel.doctors?.length > 0 && !detectedPortals.includes('doctor')) detectedPortals.push('doctor');
            if (personnel.nurses?.length > 0 && !detectedPortals.includes('nurse')) detectedPortals.push('nurse');
            if (personnel.lab?.length > 0 && !detectedPortals.includes('lab')) detectedPortals.push('lab');
            if (personnel.pharma?.length > 0 && !detectedPortals.includes('pharmacy')) detectedPortals.push('pharmacy');
            if (personnel.helpdesk?.length > 0 && !detectedPortals.includes('helpdesk')) detectedPortals.push('helpdesk');
            if (personnel.hospitalAdmins?.length > 0 && !detectedPortals.includes('hospitalAdmin')) detectedPortals.push('hospitalAdmin');
            if (personnel.staff?.length > 0 && !detectedPortals.includes('staff')) detectedPortals.push('staff');
            if (personnel.hr?.length > 0 && !detectedPortals.includes('hr')) detectedPortals.push('hr');
            if (personnel.discharge?.length > 0 && !detectedPortals.includes('discharge')) detectedPortals.push('discharge');
            
            // masterhelpdesk is the entry point
            if (!detectedPortals.includes('masterhelpdesk')) {
                detectedPortals.push('masterhelpdesk');
            }

            // Always ensure portals with active/enabled licenses are included
            const existingLicenses = hospitalData.portalLicenses || {};
            Object.keys(existingLicenses).forEach(p => {
                if (existingLicenses[p]?.enabled && !detectedPortals.includes(p)) {
                    detectedPortals.push(p);
                }
            });

            // Master list of all possible portals for display
            const allPossiblePortals = [
                'masterhelpdesk', 'helpdesk', 'doctor', 'pharmacy', 'lab', 
                'nurse', 'hospitalAdmin', 'staff', 'hr', 'discharge'
            ];
            
            // Filter out any invalid portal IDs that might come from backend
            detectedPortals = detectedPortals.filter(p => allPossiblePortals.includes(p));

            setFormData({
                name: hospitalData.name || "",
                street: hospitalData.street || "",
                landmark: hospitalData.landmark || "",
                city: hospitalData.city || "",
                area: hospitalData.area || "",
                state: hospitalData.state || "",
                address: hospitalData.address || "",
                phone: hospitalData.phone || "",
                email: hospitalData.email || "",
                pincode: hospitalData.pincode || "",
                establishedYear: hospitalData.establishedYear?.toString() || "",
                website: hospitalData.website || "",
                operatingHours: hospitalData.operatingHours || "24/7",
                ambulanceAvailability: hospitalData.ambulanceAvailability ?? hospitalData.ambulanceAvailable ?? true,
                rating: hospitalData.rating?.toString() || "4.5",
                location: { lat, lng },
                specialities: hospitalData.specialities || hospitalData.specialties || [],
                services: hospitalData.services || [],
                availablePortals: detectedPortals,
                portalLicenses: hospitalData.portalLicenses || {}
            });
        } catch (err: any) {
            console.error("Failed to fetch hospital details", err);
            toast.error("Failed to load hospital details.");
            router.push("/admin/hospitals");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === "phone") {
            if (/^\d{0,10}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === "name") {
            if (/^[a-zA-Z\s.'&-]*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === "pincode") {
            if (/^\d{0,6}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name.includes(".")) {
            const parts = name.split(".");
            const field = parts[1];

            if (field === 'lat' || field === 'lng') {
                if (/^[0-9.]*$/.test(value)) {
                    setFormData(prev => ({
                        ...prev,
                        [parts[0]]: { ...((prev as any)[parts[0]] || {}), [parts[1]]: value }
                    }));
                }
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parts[0]]: { ...((prev as any)[parts[0]] || {}), [parts[1]]: value }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const addItem = (field: 'specialities' | 'services', value: string, setter: (v: string) => void) => {
        if (!value.trim()) return;
        if (formData[field].includes(value.trim())) {
            toast.error(`${value} already added`);
            return;
        }
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
        setter("");
    };

    const removeItem = (field: 'specialities' | 'services', index: number) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };


    const handlePortalLicenseChange = (portal: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            portalLicenses: {
                ...prev.portalLicenses,
                [portal]: {
                    ...(prev.portalLicenses[portal] || { enabled: false, startDate: "", endDate: "" }),
                    [field]: value
                }
            }
        }));
    };

    // ✅ Bulk License Actions
    const handleSelectPortal = (portalId: string) => {
        setSelectedPortals(prev => 
            prev.includes(portalId) ? prev.filter(id => id !== portalId) : [...prev, portalId]
        );
    };

    const handleSelectAll = (portals: string[]) => {
        if (selectedPortals.length === portals.length) {
            setSelectedPortals([]);
        } else {
            setSelectedPortals(portals);
        }
    };

    const applyBulkDates = () => {
        if (!bulkStartDate || !bulkEndDate) {
            toast.error("Please select both start and end dates");
            return;
        }
        if (selectedPortals.length === 0) {
            toast.error("Please select at least one portal");
            return;
        }

        setFormData(prev => {
            const newLicenses = { ...prev.portalLicenses };
            selectedPortals.forEach(portalId => {
                newLicenses[portalId] = {
                    ...(newLicenses[portalId] || { enabled: true }),
                    enabled: true,
                    startDate: bulkStartDate,
                    endDate: bulkEndDate
                };
            });
            return { ...prev, portalLicenses: newLicenses };
        });
        toast.success("Dates applied to selected portals");
    };

    const resetLicenses = () => {
        setFormData(prev => ({ ...prev, portalLicenses: {} }));
        setSelectedPortals([]);
        setBulkStartDate("");
        setBulkEndDate("");
        toast.success("License settings reset");
    };

    const resetIndividualLicense = (portalId: string) => {
        setFormData(prev => ({
            ...prev,
            portalLicenses: {
                ...prev.portalLicenses,
                [portalId]: {
                    ...(prev.portalLicenses[portalId] || {}),
                    startDate: "",
                    endDate: "",
                    enabled: false
                }
            }
        }));
        toast.success(`Reset license for ${portalId}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.phone && formData.phone.length !== 10) {
            toast.error("Phone number must be exactly 10 digits.");
            return;
        }

        if (formData.pincode && formData.pincode.length !== 6) {
            toast.error("Pincode must be exactly 6 digits.");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Updating hospital...");

        try {
            const fullAddress = [
                formData.street,
                formData.landmark,
                formData.area,
                formData.city,
                formData.state,
                formData.pincode
            ].filter(Boolean).join(", ");

            const payload: any = {
                name: formData.name.trim(),
                street: formData.street.trim(),
                landmark: formData.landmark.trim(),
                city: formData.city.trim(),
                area: formData.area.trim(),
                state: formData.state.trim(),
                address: fullAddress.trim(),
                phone: formData.phone.trim(),
                email: formData.email?.trim() || "",
                pincode: formData.pincode?.trim() || "",
                establishedYear: formData.establishedYear || "",
                website: formData.website?.trim() || "",
                operatingHours: formData.operatingHours?.trim() || "24/7",
                ambulanceAvailability: formData.ambulanceAvailability,
                rating: formData.rating || "",
                specialities: formData.specialities || [],
                services: formData.services || [],
                availablePortals: formData.availablePortals || [],
                portalLicenses: formData.portalLicenses
            };

            if (formData.location.lat && formData.location.lng) {
                payload.location = {
                    lat: parseFloat(formData.location.lat.toString()) || 0,
                    lng: parseFloat(formData.location.lng.toString()) || 0
                };
            }

            await adminService.updateHospitalClient(id, payload);
            
            toast.dismiss(loadingToast);
            toast.success(`Hospital updated successfully!`, { duration: 5000 });
            router.push("/admin/hospitals");
        } catch (err: any) {
            toast.dismiss(loadingToast);
            console.error("Update hospital error:", err);
            const errorMessage = err.message || err.error || "Failed to update hospital";
            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button type="button" onClick={() => router.push("/admin/hospitals")} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all bg-white shadow-sm">
                    <ArrowLeft size={18} />
                </button>
                <PageHeader
                    title="Edit Hospital Details"
                    subtitle="Update existing healthcare facility registry"
                    icon={<Building2 className="text-orange-500" />}
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <Card title="Basic Information" padding="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormInput
                            label="Hospital Name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Sunrise Medical Center"
                            icon={<Building2 size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Email Address"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="contact@hospital.com"
                            icon={<Mail size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Phone Number"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="10 digit number"
                            icon={<Phone size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Website URL"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://www.hospital.com"
                            icon={<Globe size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Established Year"
                            name="establishedYear"
                            type="number" min={0} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} onFocus={(e) => e.target.select()}
                            value={formData.establishedYear}
                            onChange={handleChange}
                            placeholder="Eg. 1995"
                            icon={<Calendar size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Operating Hours"
                            name="operatingHours"
                            value={formData.operatingHours}
                            onChange={handleChange}
                            placeholder="Eg. 24/7 or 9am - 8pm"
                            icon={<Clock size={18} className="text-gray-400" />}
                        />
                        <FormInput
                            label="Hospital Rating"
                            name="rating"
                            value={formData.rating}
                            onChange={handleChange}
                            placeholder="Eg. 4.5"
                            icon={<Star size={18} className="text-yellow-500" />}
                        />
                    </div>
                </Card>


                {/* Location Info */}
                <Card title="Location & Address" padding="p-8">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FormInput
                                label="Street / Colony"
                                name="street"
                                value={formData.street}
                                onChange={handleChange}
                                placeholder="Eg. Yellama Colony"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                            <FormInput
                                label="Landmark"
                                name="landmark"
                                value={formData.landmark}
                                onChange={handleChange}
                                placeholder="Eg. Apsara Theatre"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                            <FormInput
                                label="Area"
                                name="area"
                                value={formData.area}
                                onChange={handleChange}
                                placeholder="Eg. NGO Colony"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                            <FormInput
                                label="City"
                                name="city"
                                required
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Eg. Kadapa"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                            <FormInput
                                label="State"
                                name="state"
                                required
                                value={formData.state}
                                onChange={handleChange}
                                placeholder="Eg. Andhra Pradesh"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                            <FormInput
                                label="Pincode"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                placeholder="6-digit PIN"
                                icon={<MapPin size={18} className="text-gray-400" />}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput
                                label="Latitude"
                                name="location.lat"
                                value={formData.location.lat}
                                onChange={handleChange}
                                placeholder="Eg. 12.9716"
                            />
                            <FormInput
                                label="Longitude"
                                name="location.lng"
                                value={formData.location.lng}
                                onChange={handleChange}
                                placeholder="Eg. 77.5946"
                            />
                        </div>
                    </div>
                </Card>

                {/* Infrastructure Info */}
                <Card title="Infrastructure & Capacity" padding="p-8">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 group" style={{ borderColor: 'var(--border-color)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.ambulanceAvailability}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ambulanceAvailability: e.target.checked }))}
                                    className="w-5 h-5 accent-blue-600 rounded"
                                />
                                <span className="text-sm font-medium">Ambulance Available</span>
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Specialties & Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Medical Specialties" padding="p-6">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <FormInput
                                    label="Specialty Name"
                                    value={tempSpecialty}
                                    onChange={(e) => setTempSpecialty(e.target.value)}
                                    placeholder="Add eg. Cardiology"
                                    className="flex-1"
                                />
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => addItem('specialities', tempSpecialty, setTempSpecialty)}
                                        className="bg-blue-600 text-white h-[46px] px-4 rounded-xl hover:bg-blue-700 shadow-md active:scale-95"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {formData.specialities.length > 0 ? formData.specialities.map((item, idx) => (
                                    <div key={idx} className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-500/20">
                                        {item}
                                        <button type="button" onClick={() => removeItem('specialities', idx)} className="hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 italic">No specialties added yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Hospital Services" padding="p-6">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <FormInput
                                    label="Service Name"
                                    value={tempService}
                                    onChange={(e) => setTempService(e.target.value)}
                                    placeholder="Add eg. 24/7 Pharmacy"
                                    className="flex-1"
                                />
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => addItem('services', tempService, setTempService)}
                                        className="bg-green-600 text-white h-[46px] px-4 rounded-xl hover:bg-green-700 shadow-md active:scale-95"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {formData.services.length > 0 ? formData.services.map((item, idx) => (
                                    <div key={idx} className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-500/20">
                                        {item}
                                        <button type="button" onClick={() => removeItem('services', idx)} className="hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-xs text-gray-400 italic">No services added yet.</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Portal Wise Licenses */}
                <div className="mt-8">
                    <Card title="Portal-wise License Management" padding="p-8">
                        <p className="text-sm text-gray-500 mb-8 -mt-2 font-medium">
                            Enable specific portals for this hospital and set their individual license validity periods. If a portal is disabled, no date restriction will be applied.
                        </p>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Button 
                                        type="button"
                                        variant={licenseMode === 'individual' ? 'primary' : 'outline'}
                                        onClick={() => setLicenseMode('individual')}
                                        className="!py-2 !px-4 text-xs"
                                    >
                                        Individual
                                    </Button>
                                    <Button 
                                        type="button"
                                        variant={licenseMode === 'total' ? 'primary' : 'outline'}
                                        onClick={() => setLicenseMode('total')}
                                        className="!py-2 !px-4 text-xs"
                                    >
                                        Total
                                    </Button>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedPortals.length > 0 && selectedPortals.length === formData.availablePortals.length}
                                        onChange={() => handleSelectAll(formData.availablePortals)}
                                    />
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600 transition-colors">Select All</span>
                                </label>
                            </div>

                        {licenseMode === 'total' && (
                            <div className="flex flex-wrap items-end gap-3 transition-all duration-300">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={bulkStartDate}
                                        onChange={(e) => setBulkStartDate(e.target.value)}
                                        className="bg-white border border-blue-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">End Date</label>
                                    <input 
                                        type="date" 
                                        value={bulkEndDate}
                                        onChange={(e) => setBulkEndDate(e.target.value)}
                                        className="bg-white border border-blue-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <Button 
                                    type="button"
                                    onClick={applyBulkDates}
                                    className="!py-2 !px-4 text-xs"
                                >
                                    Apply Total
                                </Button>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    onClick={resetLicenses}
                                    className="!py-2 !px-4 text-xs !text-red-500 !border-red-100 hover:!bg-red-50"
                                >
                                    Reset
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {[
                            { id: 'masterhelpdesk', label: 'Master Helpdesk' },
                            { id: 'helpdesk', label: 'Helpdesk / Frontdesk' },
                            { id: 'doctor', label: 'Doctor Portal' },
                            { id: 'pharmacy', label: 'Pharmacy Portal' },
                            { id: 'lab', label: 'Laboratory Portal' },
                            { id: 'nurse', label: 'Nursing Portal' },
                            { id: 'hospitalAdmin', label: 'Hospital Admin' },
                            { id: 'staff', label: 'Staff Attendance' },
                            { id: 'hr', label: 'HR Management' },
                            { id: 'discharge', label: 'Discharge Portal' },
                        ].filter(p => formData.availablePortals?.includes(p.id)).map((portal) => (
                            <div key={portal.id} className={`p-4 rounded-2xl border transition-all duration-200 ${selectedPortals.includes(portal.id) ? 'border-blue-200 bg-blue-50/20 shadow-sm' : 'border-gray-100 bg-gray-50/30 hover:bg-white hover:border-blue-100'}`}>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                                    <div className="flex items-center gap-4 lg:w-[250px]">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedPortals.includes(portal.id)}
                                            onChange={() => handleSelectPortal(portal.id)}
                                        />
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.portalLicenses[portal.id]?.enabled || false}
                                                onChange={(e) => handlePortalLicenseChange(portal.id, 'enabled', e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="font-bold text-gray-900 text-sm tracking-tight">{portal.label}</span>
                                    </div>

                                    {licenseMode === 'individual' ? (
                                        <div className="flex-1 flex items-center gap-4">
                                            <div className="grid grid-cols-2 gap-4 flex-1">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        disabled={!formData.portalLicenses[portal.id]?.enabled}
                                                        value={formData.portalLicenses[portal.id]?.startDate ? new Date(formData.portalLicenses[portal.id].startDate).toISOString().split('T')[0] : ""}
                                                        onChange={(e) => handlePortalLicenseChange(portal.id, 'startDate', e.target.value)}
                                                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-40 disabled:bg-gray-100/50"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        disabled={!formData.portalLicenses[portal.id]?.enabled}
                                                        value={formData.portalLicenses[portal.id]?.endDate ? new Date(formData.portalLicenses[portal.id].endDate).toISOString().split('T')[0] : ""}
                                                        onChange={(e) => handlePortalLicenseChange(portal.id, 'endDate', e.target.value)}
                                                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-40 disabled:bg-gray-100/50"
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                type="button"
                                                variant="outline"
                                                onClick={() => resetIndividualLicense(portal.id)}
                                                className="!p-2 min-w-[40px] h-[40px] mt-4 !text-red-500 !border-red-100 hover:!bg-red-50"
                                                title="Reset this portal"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-end">
                                            <div className="flex items-center gap-6">
                                                {formData.portalLicenses[portal.id]?.startDate && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Valid From</span>
                                                        <span className="text-[10px] font-bold text-gray-600">{new Date(formData.portalLicenses[portal.id].startDate).toLocaleDateString()} to {new Date(formData.portalLicenses[portal.id].endDate).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {formData.portalLicenses[portal.id]?.enabled ? (
                                                    <span className="text-[9px] font-black bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-600/10">Locked</span>
                                                ) : (
                                                    <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-200/50">Open</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <Button
                        type="submit"
                        loading={loading}
                        icon={<Building2 size={20} />}
                        className="w-full md:w-auto px-16 py-4 text-lg"
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default React.memo(EditHospital);
