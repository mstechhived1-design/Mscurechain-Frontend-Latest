export interface LabInventory {
    _id: string;
    hospital: string;
    name: string;
    code: string;
    category: string;
    unit: string;
    quantity: number;
    purchasePrice: number;
    mrp: number;
    reorderLevel: number;
    image?: string;
    brand?: string;
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    description?: string;
    notes?: string;
    status?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expired';
    isActive: boolean;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface LabInventoryPayload {
    name: string;
    code: string;
    category: string;
    unit: string;
    quantity: number;
    purchasePrice: number;
    mrp: number;
    reorderLevel: number;
    image?: string;
    brand?: string;
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    description?: string;
    notes?: string;
}

export interface InventoryImportError {
    row: number;
    code: string;
    errors: string[];
}

export interface InventoryImportResponse {
    success: boolean;
    summary: {
        total: number;
        success: number;
        failed: number;
        skipped: number;
    };
    errors: InventoryImportError[];
}
