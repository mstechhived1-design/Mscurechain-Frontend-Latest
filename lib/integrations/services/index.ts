export * from "./auth.service";
export * from "./spellcheck.service";
export * from "./user.service";
export * from "./admin.service";
export * from "./hospitalAdmin.service";
export * from "./helpdesk.service";
export * from "./masterHelpdesk.service";
export * from "./doctor.service";
export * from "./staff.service";
export * from "./patient.service";
export * from "./notification.service";
export * from "./discharge.service";
export * from "./ipd.service";
export * from "./quality.service";
export * from "./analytics.service";
export * from "./feedback.service";
export * from "./hr.service";

// --- Phase 2: Aggregated Dashboard Service (HMS Performance Architecture v6) ---
export * from "./unifiedDashboard.service";

// ─── Unified Services ─────────────────────────────────────────────────────────
// These replace the scattered sub-services below. Import directly from the
// individual files if you need the legacy sub-service types.
export * from "./pharmacy.service";
export * from "./lab.service";
export * from "./universalLabService";
export * from "./nurse.service";
export * from "./emergency.service";
export * from "./helpdesk-emergency.service";

// ─── Legacy sub-services ───────────────────────────────────────────────────
// Kept for backward compatibility. Types that conflict with the unified
// services are NOT re-exported here to avoid ambiguity.
export { PharmacyBillingService } from "./pharmacyBilling.service";
export { PharmacyDashboardService } from "./pharmacyDashboard.service";
export { LabBillingService } from "./labBilling.service";
export { LabSampleService } from "./labSample.service";
export { LabSettingsService } from "./labSettings.service";
export { LabTestService } from "./labTest.service";
export { LabDashboardService } from "./labDashboard.service";
export * from "./product.service";
export * from "./supplier.service";
export * from "./pharmacyAnalytics.service";
