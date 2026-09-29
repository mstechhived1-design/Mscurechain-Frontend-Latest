export interface PharmacyProduct {
  _id: string;
  pharmacyId: string;
  sku: string;
  name?: string;
  genericName: string;
  brandName: string;
  strength?: string;
  form?: string;
  schedule?: string;
  mrp: number;
  unitCost?: number;
  gst?: number;
  currentStock: number;
  minStockLevel: number;
  unitsPerPack: number;
  supplier: string | { _id: string; name: string };
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyProductPayload {
  sku: string;
  name?: string;
  genericName: string;
  brandName: string;
  strength?: string;
  form?: string;
  schedule?: string;
  mrp: number;
  unitCost?: number;
  gst?: number;
  currentStock?: number;
  minStockLevel?: number;
  unitsPerPack?: number;
  supplier: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
}
