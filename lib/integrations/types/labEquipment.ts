export interface LabEquipment {
    _id: string;
    hospital: string;
    name: string;
    code: string;
    category: string;
    department: {
        _id: string;
        name: string;
    } | string;
    brand: string;
    model: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    purchaseDate: string;
    status: 'Working' | 'Under Maintenance' | 'Repairing' | 'Out of Service' | 'Inactive' | 'Disposed';
    image?: string;
    isActive: boolean;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    warrantyExpiry?: string;
    barcode?: string;
    qrCode?: string;
    description?: string;
    notes?: string;
    invoiceNumber?: string;
    nextServiceDate?: string;
    calibrationDueDate?: string;
}

export interface LabEquipmentPayload {
    name: string;
    code: string;
    category: string;
    department: string;
    brand: string;
    model: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    purchaseDate: string;
    status: 'Working' | 'Under Maintenance' | 'Repairing' | 'Out of Service' | 'Inactive' | 'Disposed';
    image?: string;
}

export interface ImportError {
    row: number;
    code: string;
    errors: string[];
}

export interface ImportResponse {
    success: boolean;
    summary: {
        total: number;
        success: number;
        failed: number;
        skipped: number;
    };
    errors: ImportError[];
}
