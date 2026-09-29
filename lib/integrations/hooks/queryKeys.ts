/**
 * HMS Performance Architecture v6 — Phase 3
 * Centralized Query Key Factory
 *
 * This file acts as the single source of truth for all React Query keys in the application.
 * Standardizing keys prevents duplicate cache entries and ensures that `queryClient.invalidateQueries`
 * always targets the exact same array structure across components.
 */

export const queryKeys = {
  // ---------------------------------------------------------------------------
  // 1. Unified Dashboards (Phase 2 Aggregators)
  // ---------------------------------------------------------------------------
  unifiedDashboard: {
    all: () => ["unified-dashboard"] as const,
    portal: (portal: string) => ["unified-dashboard", portal] as const,
    doctor: () => ["unified-dashboard", "doctor"] as const,
    hospitalAdmin: () => ["unified-dashboard", "hospital-admin"] as const,
    helpdesk: () => ["unified-dashboard", "helpdesk"] as const,
    nurse: () => ["unified-dashboard", "nurse"] as const,
    lab: () => ["unified-dashboard", "lab"] as const,
    pharmacy: () => ["unified-dashboard", "pharmacy"] as const,
    staff: () => ["unified-dashboard", "staff"] as const,
    hr: () => ["unified-dashboard", "hr"] as const,
  },

  // ---------------------------------------------------------------------------
  // 2. Doctor Portal
  // ---------------------------------------------------------------------------
  doctor: {
    all: () => ["doctor"] as const,
    profile: () => ["doctor", "profile"] as const,
    calendar: (params?: Record<string, any>) => ["doctor", "calendar", params] as const,
    patients: {
      my: () => ["doctor", "patients", "my"] as const,
      search: (query: string) => ["doctor", "patients", "search", query] as const,
      detail: (id: string) => ["doctor", "patients", id] as const,
      history: (id: string, scope?: string) => ["doctor", "patients", id, "history", scope] as const,
    },
    appointments: {
      all: () => ["doctor", "appointments"] as const,
      detail: (id: string) => ["doctor", "appointments", id] as const,
      paused: () => ["doctor", "appointments", "paused"] as const,
      consultationData: (id: string) => ["doctor", "appointments", id, "consultation"] as const,
    },
    quickNotes: () => ["doctor", "quick-notes"] as const,
    prescriptions: (id: string) => ["doctor", "prescriptions", id] as const,
    labTokens: (id: string) => ["doctor", "lab-tokens", id] as const,
    stats: {
      income: (range?: Record<string, any>) => ["doctor", "stats", "income", range] as const,
    },
    reference: {
      medicines: (query: string) => ["doctor", "reference", "medicines", query] as const,
      labTests: () => ["doctor", "reference", "lab-tests"] as const,
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Hospital Admin Portal
  // ---------------------------------------------------------------------------
  hospitalAdmin: {
    all: () => ["hospital-admin"] as const,
    metadata: () => ["hospital-admin", "metadata"] as const,
    hospital: () => ["hospital-admin", "hospital-details"] as const,
    dashboardParams: (params?: Record<string, any>) => ["hospital-admin", "dashboard", params] as const,
    doctors: () => ["hospital-admin", "doctors"] as const,
    nurses: () => ["hospital-admin", "nurses"] as const,
    staff: () => ["hospital-admin", "staff"] as const,
    hr: () => ["hospital-admin", "hr"] as const,
    patients: () => ["hospital-admin", "patients"] as const,
    helpdesks: () => ["hospital-admin", "helpdesks"] as const,
    attendance: {
      list: (params?: Record<string, any>) => ["hospital-admin", "attendance", "list", params] as const,
      stats: () => ["hospital-admin", "attendance", "stats"] as const,
      summary: () => ["hospital-admin", "attendance", "summary"] as const,
    },
    transactions: (params?: Record<string, any>) => ["hospital-admin", "transactions", params] as const,
    payroll: {
      list: (params?: Record<string, any>) => ["hospital-admin", "payroll", "list", params] as const,
      employeeStats: (userId: string, range?: string) => ["hospital-admin", "payroll", "employee", userId, range] as const,
    },
    shifts: () => ["hospital-admin", "shifts"] as const,
    announcements: () => ["hospital-admin", "announcements"] as const,
  },

  // ---------------------------------------------------------------------------
  // 4. Helpdesk Portal
  // ---------------------------------------------------------------------------
  helpdesk: {
    all: () => ["helpdesk"] as const,
    profile: () => ["helpdesk", "profile"] as const,
    doctors: () => ["helpdesk", "doctors"] as const, // For dropdowns/scheduling
    patients: {
      search: (query: string, page?: number, type?: string) => ["helpdesk", "patients", "search", query, page, type] as const,
      detail: (id: string) => ["helpdesk", "patients", id] as const,
    },
    appointments: {
      list: (params?: Record<string, any>) => ["helpdesk", "appointments", params] as const,
      availability: (doctorId: string, date: string) => ["helpdesk", "availability", doctorId, date] as const,
    },
    transactions: (params?: Record<string, any>) => ["helpdesk", "transactions", params] as const,
    transits: (params?: Record<string, any>) => ["helpdesk", "transits", params] as const,
  },

  // ---------------------------------------------------------------------------
  // 5. Nurse & IPD Portal
  // ---------------------------------------------------------------------------
  nurse: {
    all: () => ["nurse"] as const,
    patients: (params?: Record<string, any>) => ["nurse", "patients", params] as const,
    patientDetail: (id: string) => ["nurse", "patients", id] as const,
    tasks: (params?: Record<string, any>) => ["nurse", "tasks", params] as const,
    taskDetail: (id: string) => ["nurse", "tasks", id] as const,
    quickNotes: () => ["nurse", "quick-notes"] as const,
  },

  // ---------------------------------------------------------------------------
  // 6. Lab Portal
  // ---------------------------------------------------------------------------
  lab: {
    all: () => ["lab"] as const,
    dashboardParams: (range: string) => ["lab", "dashboard", range] as const,
    orders: (params?: Record<string, any>) => ["lab", "orders", params] as const,
    orderDetail: (id: string) => ["lab", "orders", id] as const,
    samples: (params?: Record<string, any>) => ["lab", "samples", params] as const,
    transactions: (params?: Record<string, any>) => ["lab", "transactions", params] as const,
    inventory: (params?: Record<string, any>) => ["lab", "inventory", params] as const,
    catalog: () => ["lab", "catalog"] as const, // Master test list
    departments: () => ["lab", "departments"] as const,
    settings: () => ["lab", "settings"] as const,
  },

  // ---------------------------------------------------------------------------
  // 7. Pharmacy Portal
  // ---------------------------------------------------------------------------
  pharmacy: {
    all: () => ["pharmacy"] as const,
    dashboardParams: (range: string) => ["pharmacy", "dashboard", range] as const,
    products: (params?: Record<string, any>) => ["pharmacy", "products", params] as const,
    productDetail: (id: string) => ["pharmacy", "products", id] as const,
    orders: (params?: Record<string, any>) => ["pharmacy", "orders", params] as const,
    orderDetail: (id: string) => ["pharmacy", "orders", id] as const,
    suppliers: (params?: Record<string, any>) => ["pharmacy", "suppliers", params] as const,
    transactions: (params?: Record<string, any>) => ["pharmacy", "transactions", params] as const,
    analytics: (params?: Record<string, any>) => ["pharmacy", "analytics", params] as const,
  },

  // ---------------------------------------------------------------------------
  // 8. Staff Portal
  // ---------------------------------------------------------------------------
  staff: {
    all: () => ["staff"] as const,
    profile: () => ["staff", "profile"] as const,
    attendance: (params?: Record<string, any>) => ["staff", "attendance", params] as const,
    schedule: (params?: Record<string, any>) => ["staff", "schedule", params] as const,
    leaves: () => ["staff", "leaves"] as const,
  },

  // ---------------------------------------------------------------------------
  // 9. HR Portal
  // ---------------------------------------------------------------------------
  hr: {
    all: () => ["hr"] as const,
    employees: (params?: Record<string, any>) => ["hr", "employees", params] as const,
    attendance: (params?: Record<string, any>) => ["hr", "attendance", params] as const,
    leaves: (params?: Record<string, any>) => ["hr", "leaves", params] as const,
    payroll: (params?: Record<string, any>) => ["hr", "payroll", params] as const,
    shifts: () => ["hr", "shifts"] as const,
  },

  // ---------------------------------------------------------------------------
  // 10. Shared / Global
  // ---------------------------------------------------------------------------
  shared: {
    notifications: () => ["shared", "notifications"] as const,
    userProfile: () => ["shared", "user-profile"] as const,
    announcements: () => ["shared", "announcements"] as const,
  },
} as const;
