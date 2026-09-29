export interface BillItem {
  drug?: string; // Align with backend 'drug' field
  productId?: string; // Keep for frontend legacy
  productName: string;
  itemName?: string; // Alias for productName
  qty: number;
  freeQty?: number;
  unitRate: number;
  rate?: number; // Alias for unitRate
  mrp?: number;
  hsn?: string;
  gstPct: number;
  gst?: number; // Alias for gstPct
  amount: number;
  total?: number; // Alias for amount
  batch?: string;
  expiry?: string;
  discountPct?: number;
  discount?: number;
  returnedQty?: number;
}

export interface PaymentSummary {
  subtotal: number;
  taxableAmount: number;
  taxGST: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Mixed" | "Credit";
  status: "Paid" | "Partial" | "Due" | "RETURN" | string;
  transactionId?: string;
  paymentDetails?: {
    cash: number;
    card: number;
    upi: number;
  };
}

export interface PharmacyBillPayload {
  patientName: string;
  customerPhone: string;
  patientAddress?: string;
  mrn?: string;
  patientType?: string;
  doctorName?: string;
  items: BillItem[];
  paymentSummary: PaymentSummary;
  orderId?: string;
}

export interface PharmacyBill extends PharmacyBillPayload {
  _id: string;
  invoiceId: string;
  pharmacyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyBillsResponse {
  bills: PharmacyBill[];
  currentPage: number;
  totalPages: number;
  totalBills: number;
}
