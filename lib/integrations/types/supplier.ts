export interface Supplier {
    _id: string;
    pharmacyId: string;
    name: string;
    phone: string;
    email?: string;
    gstNumber?: string;
    address?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SupplierPayload {
    name: string;
    phone: string;
    email?: string;
    gstNumber?: string;
    address?: string | {
        street?: string;
        landmark?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    notes?: string;
}
