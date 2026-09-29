'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Building2,
    Phone,
    Mail,
    Hash,
    MapPin,
    FileText,
    Loader2,
    Scan,
} from 'lucide-react';
import { Supplier, SupplierPayload } from '@/lib/integrations/types/supplier';
import { SupplierService } from '@/lib/integrations/services/supplier.service';
import { toast } from 'react-hot-toast';
import { createWorker } from 'tesseract.js';

interface AddSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Supplier | null;
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<SupplierPayload>({
        name: '',
        phone: '',
        email: '',
        gstNumber: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                phone: initialData.phone,
                email: initialData.email || '',
                gstNumber: initialData.gstNumber || '',
                address: initialData.address || '',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                name: '',
                phone: '',
                email: '',
                gstNumber: '',
                address: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading('Scanning visiting card...');

        try {
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            console.log('Extracted Text:', text);

            // ─── Smart OCR Parsing ───────────────────────────────────────────
            const extractedData: Partial<SupplierPayload> = {};
            let remainingText = text;

            // Helper: remove a matched segment from remainingText
            const consume = (match: string) => {
                remainingText = remainingText.replace(match, ' ');
            };

            // 1. Email Extraction (broad pattern for OCR noise)
            const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+\s*@\s*[a-zA-Z0-9.\-]+\.\s*[a-zA-Z]{2,}/);
            if (emailMatch) {
                extractedData.email = emailMatch[0].replace(/\s/g, '');
                consume(emailMatch[0]);
            }

            // 2. Phone Extraction (broad — handles OCR artifacts, labels, country codes)
            //    Matches: +91 9876543210, Tel: 9876543210, Ph: 98765-43210, (© 9876543210, etc.
            const phonePatterns = [
                /(?:(?:Tel|Ph|Phone|Mob|Mobile|Contact|Call)\s*[:\-.]?\s*)?(?:\+?\s*91\s*[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5})/i,
                /(?:(?:Tel|Ph|Phone|Mob|Mobile|Contact|Call)\s*[:\-.]?\s*)?(?:\+?\s*91\s*[\s\-]?)?(\d{5}[\s\-]?\d{5})/i,
                /[(\[©@]?\s*(\d{10})\s*[)\]]?/,
            ];
            for (const pattern of phonePatterns) {
                const m = text.match(pattern);
                if (m) {
                    const digits = (m[1] || m[0]).replace(/\D/g, '').slice(-10);
                    if (digits.length === 10 && /^[6-9]/.test(digits)) {
                        extractedData.phone = digits;
                        consume(m[0]);
                        break;
                    }
                }
            }

            // 3. GST Extraction (handles labels, spaces, OCR noise)
            //    Standard: 22AAAAA0000A1Z5  |  Labeled: GSTIN: 12ABC3456P
            const gstPatterns = [
                /(?:GSTIN|GST\s*(?:No|Number|IN)?)\s*[:\-.]?\s*([A-Z0-9]{15})/i,
                /\b(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/,
                /(?:GSTIN|GST\s*(?:No|Number|IN)?)\s*[:\-.]?\s*([A-Z0-9]{10,15})/i,
            ];
            for (const pattern of gstPatterns) {
                const m = text.match(pattern);
                if (m) {
                    extractedData.gstNumber = (m[1] || m[0]).replace(/\s/g, '').toUpperCase();
                    consume(m[0]);
                    break;
                }
            }

            // 4. Name Extraction — prioritize lines with business keywords
            const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            const businessKeywords = /Pvt|Ltd|Limited|Private|Enterprises|Solutions|Pharma|Pharmaceuticals|Agency|Distributors|Traders|Industries|Corporation|Corp|Inc|Company|Co\b|Medical|Healthcare|Surgical|Wholesale|Retail/i;
            
            let nameCandidate = '';
            // First pass: look for lines with strong business keywords
            for (const line of allLines) {
                if (businessKeywords.test(line)) {
                    // Clean OCR noise from the name
                    let cleaned = line
                        .replace(/[^a-zA-Z0-9\s\-\.&'()]/g, '') // Remove non-name chars
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (cleaned.length > 3) {
                        nameCandidate = cleaned;
                        consume(line);
                        break;
                    }
                }
            }
            // Fallback: use first line if it looks like a name (no digits, not an email/phone)
            if (!nameCandidate && allLines.length > 0) {
                const first = allLines[0];
                if (!/\d{5,}/.test(first) && !/@/.test(first) && first.length > 3 && first.length < 80) {
                    nameCandidate = first.replace(/[^a-zA-Z0-9\s\-\.&'()]/g, '').trim();
                    consume(first);
                }
            }
            if (nameCandidate) extractedData.name = nameCandidate;

            // 5. Address Extraction — analyze remaining lines
            //    After removing email, phone, GST, and name, classify remaining lines
            const remainingLines = remainingText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            const addressKeywords = /road|street|st\b|lane|nagar|colony|sector|plot|block|floor|building|bldg|tower|complex|market|chowk|circle|main|cross|layout|phase|industrial|area|zone|city|town|village|district|taluk|mandal|pin|pincode|zip|mumbai|delhi|chennai|kolkata|bangalore|bengaluru|hyderabad|pune|ahmedabad|jaipur|lucknow|kanpur|nagpur|indore|bhopal|visakhapatnam|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|chandigarh|gurgaon|noida|maharashtra|tamil\s*nadu|karnataka|telangana|andhra|uttar\s*pradesh|gujarat|rajasthan|madhya\s*pradesh|west\s*bengal|bihar|odisha|kerala|assam|jharkhand|chhattisgarh|punjab|haryana|india|\d{6}/i;
            
            const addressLines: string[] = [];
            const noteLines: string[] = [];

            for (const line of remainingLines) {
                // Skip if line is just the already extracted phone/email/gst/name
                const cleanLine = line.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                if (cleanLine.length < 3) continue;
                if (extractedData.name && cleanLine.toLowerCase() === extractedData.name.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim()) continue;

                if (addressKeywords.test(line) || /\d{6}/.test(line)) {
                    addressLines.push(line);
                } else {
                    // Check if it contains a PIN code anywhere
                    noteLines.push(line);
                }
            }

            if (addressLines.length > 0) {
                extractedData.address = addressLines
                    .join(', ')
                    .replace(/\s+/g, ' ')
                    .replace(/,\s*,/g, ',')
                    .trim();
            }

            if (noteLines.length > 0) {
                // Put unclassified text into notes so nothing is lost
                const notesText = noteLines
                    .join(', ')
                    .replace(/\s+/g, ' ')
                    .replace(/,\s*,/g, ',')
                    .trim();
                if (notesText.length > 3) {
                    extractedData.notes = notesText;
                }
            }

            // Update form — only overwrite fields that were actually extracted
            setFormData(prev => ({
                ...prev,
                ...(extractedData.name ? { name: extractedData.name } : {}),
                ...(extractedData.phone ? { phone: extractedData.phone } : {}),
                ...(extractedData.email ? { email: extractedData.email } : {}),
                ...(extractedData.gstNumber ? { gstNumber: extractedData.gstNumber } : {}),
                ...(extractedData.address ? { address: extractedData.address } : {}),
                ...(extractedData.notes ? { notes: extractedData.notes } : {}),
            }));

            toast.success('Card scanned successfully!', { id: toastId });

        } catch (error) {
            console.error('OCR Error:', error);
            toast.error('Failed to read card', { id: toastId });
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const nameTrimmed = formData.name.trim();
        if (!nameTrimmed || !formData.phone) {
            toast.error('Name and Phone are required');
            return;
        }

        // Name validation (relaxed but safe)
        if (!/^[a-zA-Z0-9\s.'&-]+$/.test(nameTrimmed)) {
            toast.error('Supplier name contains invalid characters');
            return;
        }

        // Character limits
        if (((formData.address as string)?.length || 0) > 500) return toast.error('Address exceeds character limit (500)');
        if ((formData.notes?.length || 0) > 500) return toast.error('Notes exceed character limit (500)');

        // Phone validation (10 digits)
        if (formData.phone.length !== 10) {
            toast.error('Phone number must be 10 digits');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                address: {
                    street: formData.address as string || '',
                    landmark: '',
                    city: '',
                    state: '',
                    pincode: ''
                }
            };

            if (initialData) {
                await SupplierService.updateSupplier(initialData._id, payload as any);
                toast.success('Vendor profile updated');
            } else {
                await SupplierService.createSupplier(payload as any);
                toast.success('New vendor onboarded');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save supplier');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col zoom-in">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b dark:border-gray-800">
                    <div>
                        <h2 className="text-lg md:text-xl lg:text-xl font-black text-gray-800 dark:text-white tracking-tight">
                            {initialData ? 'Edit Supplier' : 'Add New Supplier'}
                        </h2>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Vendor Onboarding Protocol</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!initialData && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleScanCard}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isScanning}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-400"
                                >
                                    {isScanning ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Scan className="w-4 h-4" />
                                    )}
                                    <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">
                                        {isScanning ? 'Scanning...' : 'Scan visiting card'}
                                    </span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-6 space-y-4 border border-indigo-100/50 dark:border-indigo-900/50">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                            <Building2 className="w-5 h-5" />
                            <span className="font-black text-sm uppercase tracking-wider">Basic Information</span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-500 uppercase">Supplier Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium text-sm transition-all"
                                placeholder="e.g., Pharma Solutions Ltd"
                                value={formData.name}
                                onChange={e => {
                                    const val = e.target.value;
                                    // Relaxed validation to allow symbols common in company names
                                    setFormData({ ...formData, name: val });
                                }}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-500 uppercase">Phone Number <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-indigo-500 font-medium text-sm transition-all"
                                        placeholder="10-digit number"
                                        value={formData.phone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, phone: val });
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-500 uppercase">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-indigo-500 font-medium text-sm transition-all"
                                        placeholder="email@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Details */}
                    <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-6 space-y-4 border border-teal-100/50 dark:border-teal-900/50">
                        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
                            <FileText className="w-5 h-5" />
                            <span className="font-black text-sm uppercase tracking-wider">Business Details</span>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-500 uppercase">GST Number</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-teal-500 font-medium text-sm uppercase transition-all"
                                    placeholder="15-CHARACTER GST NUMBER"
                                    value={formData.gstNumber}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toUpperCase();
                                        setFormData({ ...formData, gstNumber: val });
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase pl-1">Format: 15 alphanumeric characters</p>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-6 space-y-4 border border-purple-100/50 dark:border-purple-900/50">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                            <MapPin className="w-5 h-5" />
                            <span className="font-black text-sm uppercase tracking-wider">Address Information</span>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-500 uppercase">Complete Address</label>
                            <textarea
                                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 font-medium text-sm min-h-[100px] resize-none transition-all"
                                placeholder="Enter complete office address with city, state, and pincode"
                                value={formData.address as string}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-6 space-y-4 border border-amber-100/50 dark:border-amber-900/50">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                            <FileText className="w-5 h-5" />
                            <span className="font-black text-sm uppercase tracking-wider">Additional Notes</span>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-500 uppercase">Special Terms & Notes</label>
                            <textarea
                                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-medium text-sm min-h-[80px] resize-none transition-all"
                                placeholder="Special terms, delivery schedules, payment terms, etc."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t dark:border-gray-800 flex gap-4">
                    <button
                        onClick={onClose}
                        type="button"
                        className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-4 rounded-2xl font-black text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        type="submit"
                        disabled={isLoading || isScanning}
                        className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            initialData ? 'Update Supplier' : 'Create Supplier'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierModal;
