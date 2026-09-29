export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  NURSE_LOGIN: "/auth/nurse/login",
  LAB_LOGIN: "/auth/lab/login",
  PHARMACY_LOGIN: "/auth/pharmacy/login",
  EMERGENCY_LOGIN: "/auth/emergency/login",
  REGISTER: "/auth/register",
  SEND_OTP: "/auth/send-otp",
  VERIFY_OTP: "/auth/verify-otp",
  ME: "/auth/me",
  LOGOUT: "/auth/logout",
  REFRESH: "/auth/refresh",
  CHECK_EXISTENCE: "/auth/check-existence",
};

export const DISCHARGE_ENDPOINTS = {
  LOGIN: "/discharge/auth/login",
  LOGOUT: "/discharge/auth/logout",
  RECORDS: {
    BASE: "/discharge/records",
    BY_ID: (id: string) => `/discharge/records/${id}`,
  },
};

export const USER_ENDPOINTS = {
  PROFILE: "/auth/me", // Unified profile endpoint in new backend
  PATCH_PROFILE: "/auth/me",
  UPDATE_PROFILE: "/auth/me", // Updated to match backend route
  PATIENT_PROFILE: "/patients/profile",
  DOCTOR_PROFILE: "/doctors/me",
  UPDATE_PATIENT_PROFILE: "/patients/profile",
  UPDATE_DOCTOR_PROFILE: "/doctors/me",
  ATTENDANCE: "/staff/attendance/me",
  ATTENDANCE_TODAY_STATUS: "/staff/attendance/me", // Use /me and filter today in frontend if needed, or backend might return it
  ATTENDANCE_CHECK_IN: "/staff/attendance/check-in",
  ATTENDANCE_CHECK_OUT: "/staff/attendance/check-out",
};

export const ADMIN_ENDPOINTS = {
  DASHBOARD: "/super-admin/stats",
  ANALYTICS: "/super-admin/analytics",
  BROADCAST: "/super-admin/broadcast",
  PROFILE: "/super-admin/profile",
  AUTH_LOGS: "/super-admin/auth-logs",
  AUTH_LOG_FILTERS: "/super-admin/auth-log-filters",

  // User Management
  USERS: "/super-admin/users",
  CREATE_USER: "/super-admin/users",
  UPDATE_USER: (id: string) => `/super-admin/users/${id}`,
  DELETE_USER: (id: string) => `/super-admin/users/${id}`,

  // HR Management
  HR_USERS: "/super-admin/hr-users",
  SEED_HR: "/super-admin/seed-hr",

  // Ambulance Personnel
  EMERGENCY_USERS: "/super-admin/emergency-users",
  CREATE_EMERGENCY_USER: "/super-admin/emergency-users",
  UPDATE_EMERGENCY_USER: (id: string) => `/super-admin/emergency-users/${id}`,
  DELETE_EMERGENCY_USER: (id: string) => `/super-admin/emergency-users/${id}`,

  // Hospital Management
  HOSPITALS: "/super-admin/hospitals",
  CREATE_HOSPITAL: "/super-admin/create-hospital",
  CREATE_HOSPITAL_ADMIN: "/super-admin/create-hospital-admin",
  UPDATE_HOSPITAL_STATUS: (id: string) => `/super-admin/hospitals/${id}/status`,
  HOSPITAL_PERSONNEL: (id: string) => `/super-admin/hospitals/${id}/personnel`,
  BULK_HOSPITALS: "/super-admin/hospitals/upload",

  // Legacy/Compatibility
  DOCTORS: "/super-admin/users?role=doctor",
  PATIENTS: "/super-admin/users?role=patient",
  HELPDESKS: "/super-admin/users?role=helpdesk",
  ADMINS: "/super-admin/users?role=admin",
  UPDATE_HOSPITAL: (id: string) => `/hospitals/${id}`,
  DELETE_HOSPITAL: (id: string) => `/hospitals/${id}`,
  ASSIGN_DOCTOR: "/hospital/assign-doctor",
  ASSIGN_HELPDESK: "/hospital/assign-helpdesk",
  CREATE_ADMIN: "/super-admin/create-hospital-admin",
  CREATE_DOCTOR: "/hospital/create-doctor",
  DELETE_HELPDESK: (id: string) => `/helpdesk/${id}`,
  HOSPITAL_DETAILS: (id: string) => `/hospital/hospitals/${id}/details`,
  HOSPITAL_DOCTORS: (id: string) => `/hospital/hospitals/${id}/doctors`,
  SUPPORT_REQUESTS: "/support",

  // CMS Management
  BLOGS: {
    BASE: "/admin/blogs",
    BY_ID: (id: string) => `/admin/blogs/${id}`,
  },
  TESTIMONIALS: {
    BASE: "/admin/testimonials",
    BY_ID: (id: string) => `/admin/testimonials/${id}`,
  },
};

export const PHARMACY_ENDPOINTS = {
  DASHBOARD: "/pharmacy/dashboard",
  PRODUCTS: {
    BASE: "/pharmacy/products",
    BULK: "/pharmacy/products/bulk",
    BY_ID: (id: string) => `/pharmacy/products/${id}`,
  },
  SUPPLIERS: {
    BASE: "/pharmacy/suppliers",
    BY_ID: (id: string) => `/pharmacy/suppliers/${id}`,
    PRODUCTS: (id: string) => `/pharmacy/suppliers/${id}/products`,
    PURCHASES: "/pharmacy/suppliers/purchases",
  },
  BILLS: {
    BASE: "/pharmacy/invoices",
    BY_ID: (id: string) => `/pharmacy/invoices/${id}`,
    STATS: "/pharmacy/reports/dashboard",
  },
  REPORTS: {
    DASHBOARD: "/pharmacy/reports/dashboard",
    SALES: "/pharmacy/reports/sales",
    INVENTORY: "/pharmacy/reports/inventory",
    ANALYTICS: "/pharmacy/reports/analytics",
  },
  ORDERS: (hospitalId: string) => `/pharmacy/orders/hospital/${hospitalId}`,
  UPLOAD_DOCUMENT: "/pharmacy/upload-document",
  AUDITS: "/pharmacy/audit-logs",

  // ─── IPD Medicine Reconciliation ──────────────────────────────────────────
  IPD_ISSUANCE: {
    BASE: "/pharmacy/ipd-issuance",
    BY_ADMISSION: (admissionId: string) =>
      `/pharmacy/ipd-issuance/${admissionId}`,
    SUMMARY: (admissionId: string) =>
      `/pharmacy/ipd-issuance/${admissionId}/summary`,
  },
  MEDICINE_RETURN: {
    BASE: "/pharmacy/medicine-return",
    BY_ADMISSION: (admissionId: string) =>
      `/pharmacy/medicine-return/${admissionId}`,
    APPROVE: (id: string) => `/pharmacy/medicine-return/${id}/approve`,
    REJECT: (id: string) => `/pharmacy/medicine-return/${id}/reject`,
  },
  PHARMACY_SIGNOFF: (admissionId: string) => `/pharmacy/signoff/${admissionId}`,
};

export const LAB_ENDPOINTS = {
  BILLING: {
    BASE: "/lab/invoices",
    BY_ID: (id: string) => `/lab/orders/${id}/invoice`,
  },
  DASHBOARD: {
    STATS: "/lab/dashboard-stats",
  },
  SAMPLES: {
    BASE: "/lab/orders",
    BY_ID: (id: string) => `/lab/orders/${id}`,
    STATUS: (id: string) => `/lab/orders/${id}/collect`,
    RESULTS: (id: string) => `/lab/orders/${id}/results`,
  },
  TESTS: {
    BASE: "/lab/tests",
    BY_ID: (id: string) => `/lab/tests/${id}`,
    PARAMETERS: (id: string) => `/lab/tests/${id}/parameters`,
    DESTROY_ALL: "/lab/tests/destroy/all",
  },
  DEPARTMENTS: {
    BASE: "/lab/departments",
    BY_ID: (id: string) => `/lab/departments/${id}`,
  },
  META: "/lab/meta",
  EQUIPMENT: {
    BASE: "/lab/equipment",
    BY_ID: (id: string) => `/lab/equipment/${id}`,
    RESTORE: (id: string) => `/lab/equipment/${id}/restore`,
    BULK_DELETE: "/lab/equipment/bulk-delete",
    BULK_RESTORE: "/lab/equipment/bulk-restore",
    BULK_STATUS: "/lab/equipment/bulk-status",
    BULK_IMPORT: "/lab/equipment/bulk-import",
  },
  INVENTORY: {
    BASE: "/lab/inventory",
    BY_ID: (id: string) => `/lab/inventory/${id}`,
    BULK_DELETE: "/lab/inventory/bulk-delete",
    BULK_IMPORT: "/lab/inventory/bulk-import",
  },
};

export const HOSPITAL_ADMIN_ENDPOINTS = {
  DASHBOARD: "/hospital/dashboard",
  STATS: "/hospital/stats",
  HOSPITAL: "/hospital/hospital",
  METADATA: "/hospitals/metadata",
  DOCTOR_PERFORMANCE: "/hospital/analytics/doctor-performance",
  DOCTOR_PERFORMANCE_DETAILS: (id: string) => `/hospital/analytics/doctor-performance/${id}/details`,
  DOCTORS: "/hospital/users?role=doctor",
  CREATE_DOCTOR: "/hospital/create-doctor",
  DOCTOR_DETAIL: (id: string) => `/doctors/${id}`,
  UPDATE_DOCTOR: (id: string) => `/hospital/users/${id}`,
  DELETE_DOCTOR: (id: string) => `/hospital/users/${id}`,
  HELPDESKS: "/hospital/users?role=helpdesk",
  CREATE_HELPDESK: "/hospital/create-helpdesk",
  HELPDESK_DETAIL: (id: string) => `/hospital/helpdesks/${id}`,
  PATIENTS: "/hospital/users?role=patient",
  PHARMA: "/hospital/users?role=pharma-owner",
  LABS: "/hospital/users?role=lab",
  STAFF: "/hospital/users?role=staff",
  STAFF_DETAIL: (id: string) => `/hospital/staff/${id}`,
  CREATE_STAFF: "/hospital/users",
  UPDATE_STAFF: (id: string) => `/hospital/users/${id}`,
  DELETE_STAFF: (id: string) => `/hospital/users/${id}`,
  ATTENDANCE: "/hospital/attendance",
  ATTENDANCE_STATS: "/hospital/attendance/report",
  ATTENDANCE_SUMMARY: "/hospital/attendance/summary",
  ATTENDANCE_DETAIL: (id: string) => `/hospital/attendance/${id}`,
  UPDATE_ATTENDANCE: (id: string) => `/hospital/attendance/${id}`,
  DELETE_ATTENDANCE: (id: string) => `/hospital/attendance/${id}`,
  ANNOUNCEMENTS: "/notifications",
  TRANSACTIONS: "/hospital/transactions",
  ANALYTICS: "/hospital/analytics",
  NURSES: "/hospital/users?role=nurse",
  CREATE_NURSE: "/hospital/users",
  HR: "/hospital/hrs",
  CREATE_HR: "/hospital/hrs",
  UPDATE_HR: (id: string) => `/hospital/hrs/${id}`,
  DELETE_HR: (id: string) => `/hospital/hrs/${id}`,
  DISCHARGE_STAFF: "/hospital/users?role=DISCHARGE",
  AUTH_LOGS: "/hospital/auth-logs",
  AUTH_LOG_FILTERS: "/hospital/auth-log-filters",
  PACKAGES: "/hospital/packages",
  PACKAGE_STATUS: (id: string) => `/hospital/packages/${id}/status`,
  PACKAGE_DETAIL: (id: string) => `/hospital/packages/${id}`,
  CHARGES: "/hospital/charges",
  RESET_CHARGES: "/hospital/charges/reset",
  CHARGE_DETAIL: (id: string) => `/hospital/charges/${id}`,
};

export const HELPDESK_ENDPOINTS = {
  DASHBOARD: "/helpdesk/dashboard",
  ME: "/helpdesk/me",
  DOCTORS: "/helpdesk/doctors",
  CREATE_DOCTOR: "/helpdesk/doctor",
  PATIENTS_SEARCH: "/helpdesk/patients/search",
  PATIENT_DETAILS: (id: string) => `/helpdesk/patients/${id}`,
  UPDATE_PATIENT: (id: string) => `/helpdesk/patients/${id}`,
  REGISTER_PATIENT: "/helpdesk/patients/register",
  APPOINTMENTS: "/helpdesk/appointments",
  APPOINTMENT_STATUS: (id: string) => `/helpdesk/appointments/${id}/status`,
  TRANSACTIONS: "/helpdesk/transactions",
  IPD_ADMISSIONS: (id: string) => `/helpdesk/patients/${id}/ipd-admissions`,
  PACKAGES: "/helpdesk/packages",
};
export const MASTER_HELPDESK_ENDPOINTS = {
  DASHBOARD: "/masterhelpdesk/dashboard",
  QUEUE: "/masterhelpdesk/queue",
  TRANSACTIONS: "/masterhelpdesk/transactions",
  PATIENTS: "/masterhelpdesk/patients",
  PATIENT_DETAILS: (id: string) => `/masterhelpdesk/patients/${id}`,
  REGISTER_PATIENT: "/masterhelpdesk/patients/register",
  VISITS_TODAY: "/masterhelpdesk/visits/today",
  VISIT_HISTORY: (id: string) => `/masterhelpdesk/visits/history/${id}`,
  ACTIVE_VISITS: "/masterhelpdesk/visits/active",
  ALL_VISITS: "/masterhelpdesk/visits/all",
  IPD_ADMISSIONS: (id: string) => `/masterhelpdesk/patients/${id}/ipd-admissions`,
  APPOINTMENT_STATUS: (id: string) => `/masterhelpdesk/appointments/${id}/status`,
  ME: "/masterhelpdesk/me",
};



export const BOOKING_ENDPOINTS = {
  AVAILABILITY: "/bookings/availability",
  BOOK: "/bookings/book",
  STATS: "/bookings/hospital/stats",
  MY_APPOINTMENTS: "/bookings/my-appointments",
  DETAILS: (id: string) => `/bookings/${id}`,
};

export const DOCTOR_ENDPOINTS = {
  DASHBOARD: "/doctors/dashboard",
  PROFILE: "/doctors/me",
  MY_PATIENTS: "/doctors/my-patients",
  CALENDAR_STATS: "/doctors/calendar/stats",
  CALENDAR_APPOINTMENTS: "/doctors/calendar/appointments",
  QUICK_NOTES: "/doctors/quick-notes",
  START_NEXT: "/doctors/start-next",
  PATIENT_DETAILS: (id: string) => `/doctors/patient/${id}`,
  // Consultation Workflow
  START_CONSULTATION: (id: string) => `/doctor/appointments/${id}/start`,
  END_CONSULTATION: (id: string) => `/doctor/appointments/${id}/end`,
  CONSULTATION_SUMMARY: (id: string) => `/doctor/appointments/${id}/summary`,
  CREATE_PRESCRIPTION: "/doctor/prescriptions",
  CREATE_LAB_TOKEN: "/doctor/lab-tokens",
  SEND_TO_HELPDESK: "/doctor/send-to-helpdesk",
  GET_PRESCRIPTION: (id: string) => `/doctor/prescriptions/${id}`,
  GET_LAB_TOKEN: (id: string) => `/doctor/lab-tokens/${id}`,
  GET_DERMATOLOGY: (id: string) => `/doctor/prescriptions/${id}/dermatology`,
  GET_CARDIOLOGY: (id: string) => `/doctor/prescriptions/${id}/cardiology`,
  GET_ENT: (id: string) => `/doctor/prescriptions/${id}/ent`,
  GET_PEDIATRICS: (id: string) => `/doctor/prescriptions/${id}/pediatrics`,
  GET_GYNECOLOGY: (id: string) => `/doctor/prescriptions/${id}/gynecology`,
  GET_NEUROLOGY: (id: string) => `/doctor/prescriptions/${id}/neurology`,
  GET_GASTRO: (id: string) => `/doctor/prescriptions/${id}/gastroenterology`,
  GET_NEPHROLOGY: (id: string) => `/doctor/prescriptions/${id}/nephrology`,
  GET_UROLOGY: (id: string) => `/doctor/prescriptions/${id}/urology`,
  GET_RADIOLOGY: (id: string) => `/doctor/prescriptions/${id}/radiology`,
  GET_ORTHOPEDICS: (id: string) => `/doctor/prescriptions/${id}/orthopedics`,
  UPLOAD_PHOTO: "/doctors/upload-photo",
  SEARCH_MEDICINES: "/doctor/medicines/search",
  CREATE_PHARMACY_TOKEN: "/doctor/pharmacy-tokens",
  ANNOUNCEMENTS: "/announcements/hospital",
  ANALYTICS: "/doctors/analytics",
  INCOME_STATS: "/doctors/income-stats",
  STATUS: "/doctors/status",
  PATIENT_HISTORY: (id: string) => `/doctors/patient/${id}/history`,
};

export const TRANSIT_ENDPOINTS = {
  LIST: "/helpdesk/transits",
  COLLECT: (id: string) => `/helpdesk/transits/${id}/collect`,
};

export const STAFF_ENDPOINTS = {
  DASHBOARD: "/staff/attendance/dashboard",
  PROFILE: "/staff/attendance/profile",

  // Attendance
  ATTENDANCE: "/staff/attendance/me",
  ATTENDANCE_HISTORY: "/staff/attendance/me",
  TODAY_STATUS: "/staff/attendance/today-status",
  CHECK_IN: "/staff/attendance/check-in",
  CHECK_OUT: "/staff/attendance/check-out",

  // Leave Management
  LEAVES: "/leaves",
  LEAVE_DETAIL: (id: string) => `/leaves/${id}`,
  CREATE_LEAVE: "/leaves/request",
  UPDATE_LEAVE: (id: string) => `/leaves/${id}`,
  DELETE_LEAVE: (id: string) => `/leaves/${id}`,
  LEAVE_BALANCE: "/leaves/balance",

  // Schedules
  SCHEDULE: "/staff/attendance/schedule",

  // Payroll
  PAYROLL: "/staff/attendance/self-payroll",

  // Announcements
  ANNOUNCEMENTS: "/announcements/hospital",

  // Document Upload
  UPLOAD_DOCUMENT: "/staff/attendance/upload-document",
};

export const NOTIFICATION_ENDPOINTS = {
  BASE: "/notifications",
  READ: (id: string) => `/notifications/${id}/read`,
  READ_ALL: "/notifications/read-all",
  DELETE: (id: string) => `/notifications/${id}`,
  CLEAR_ALL: "/notifications/clear-all",
};

export const PATIENT_ENDPOINTS = {
  PROFILE: "/patients/profile",
  PROFILE_BY_ID: (id: string) => `/patients/profile/${id}`,
  UPDATE_PROFILE: "/patients/profile",
  APPOINTMENTS: "/patients/appointments",
  PRESCRIPTIONS: "/patients/prescriptions",
  LAB_RECORDS: "/patients/lab-records",
  HELPDESK_PRESCRIPTIONS: "/patients/helpdesk-prescriptions",
  DASHBOARD_DATA: "/patients/dashboard-data",
  HOSPITALS: "/patients/hospitals",
};

export const SUPPORT_ENDPOINTS = {
  CREATE: "/support",
  MY_TICKETS: "/support/my-tickets",
  LIST: "/support",
  DETAILS: (id: string) => `/support/${id}`,
  REPLY: (id: string) => `/support/${id}/reply`,
};

export const COMMON_ENDPOINTS = {
  MY_ANNOUNCEMENTS: "/notifications",
};

export const NURSE_ENDPOINTS = {
  DASHBOARD: {
    // GET /nurse/dashboard/stats
    STATS: "/nurse/dashboard/stats",
  },
  PATIENTS: {
    // GET /nurse/patients
    BASE: "/nurse/patients",
    // GET /nurse/patients/:id
    BY_ID: (id: string) => `/nurse/patients/${id}`,
  },
  TASKS: {
    // GET /nurse/tasks
    BASE: "/nurse/tasks",
    // PUT /nurse/tasks/:id
    UPDATE_STATUS: (id: string) => `/nurse/tasks/${id}`,
  },
  WARD: {
    BEDS: "/ipd/beds",
    DETAILS: (id: string) => `/ipd/beds/${id}`,
  },
  QUICK_NOTES: "/doctors/quick-notes",
};

// ─── Emergency / Ambulance ──────────────────────────────────────────────────
export const EMERGENCY_ENDPOINTS = {
  // Auth  â†’  /api/emergency/auth/*
  AUTH: {
    LOGIN: "/emergency/auth/login",
    LOGOUT: "/emergency/auth/logout",
    REFRESH: "/emergency/auth/refresh",
    ME: "/emergency/auth/me",
  },
  // Requests  â†’  /api/emergency/requests/*
  REQUESTS: {
    BASE: "/emergency/requests",
    PATIENT: "/emergency/requests/patient",
    MY_REQUESTS: "/emergency/requests/my-requests",
    HOSPITAL: "/emergency/requests/hospital",
    HOSPITAL_STATS: "/emergency/requests/hospital/stats",
    AVAILABLE_HOSPITALS: "/emergency/requests/hospitals",
    ACCEPT: (id: string) => `/emergency/requests/${id}/accept`,
    REJECT: (id: string) => `/emergency/requests/${id}/reject`,
  },
};

// ─── Super-Admin Ambulance Personnel ────────────────────────────────────────
export const AMBULANCE_ENDPOINTS = {
  BASE: "/super-admin/emergency-users",
  BY_ID: (id: string) => `/super-admin/emergency-users/${id}`,
};

export const IPD_ENDPOINTS = {
  BEDS: "/ipd/beds",
  BED_IMPORT: "/ipd/beds/import",
  BED_DETAILS: (id: string) => `/ipd/beds/${id}`,
  BED_STATUS: (id: string) => `/ipd/beds/${id}/quick-status`,
  ADMISSIONS: "/ipd/admissions",
  TRANSFER_BED: (id: string) => `/ipd/admissions/${id}/transfer`,
  DISCHARGE: (id: string) => `/ipd/admissions/${id}/discharge`,
  REQUEST_DISCHARGE: (id: string) => `/ipd/admissions/${id}/request-discharge`,
  REQUEST_TRANSFER: (id: string) => `/ipd/admissions/${id}/request-transfer`,
  PENDING_REQUESTS: "/ipd/admissions/pending-requests",
  ADMISSION_DETAILS: (id: string) => `/ipd/admissions/${id}`,
  CONFIRM_DISCHARGE: (id: string) => `/ipd/admissions/${id}/confirm-discharge`,
  CANCEL_DISCHARGE: (id: string) => `/ipd/admissions/${id}/cancel-discharge`,
  CANCEL_TRANSFER: (id: string) => `/ipd/admissions/${id}/cancel-transfer`,
  PRESCRIPTIONS: (id: string) => `/ipd/admissions/${id}/prescriptions`,
  LAB_REPORTS: (id: string) => `/ipd/admissions/${id}/lab-reports`,
  CLINICAL_HISTORY: (id: string) => `/ipd/admissions/${id}/clinical-history`,
  BILLING: {
    SUMMARY: (id: string) => `/ipd/billing/summary/${id}`,
    CHARGE: "/ipd/billing/charge",
    CHARGE_DETAIL: (id: string) => `/ipd/billing/charge/${id}`,
    BED_CHARGE: (id: string) => `/ipd/billing/bed-charge/${id}`,
    ADVANCE: "/ipd/billing/advance",
    DISCOUNT: "/ipd/billing/discount",
    LOCK: (id: string) => `/ipd/billing/lock/${id}`,
    UNLOCK: (id: string) => `/ipd/billing/unlock/${id}`,
    CATEGORIES: "/ipd/billing/categories",
    CATEGORY_DETAIL: (id: string) => `/ipd/billing/categories/${id}`,
  },
  THRESHOLDS: {
    BASE: "/ipd/thresholds",
    TEMPLATES: "/ipd/thresholds/templates",
    TEMPLATE_DETAIL: (id: string) => `/ipd/thresholds/templates/${id}`,
    ADMISSION: (id: string) => `/ipd/thresholds/admission/${id}`,
  },
  ALERTS: {
    BASE: "/ipd/alerts",
    DETAIL: (id: string) => `/ipd/alerts/${id}`,
    HISTORY: (id: string) => `/ipd/alerts/history/${id}`,
  },
};

export const INCIDENT_ENDPOINTS = {
  REPORT: "/incidents/report",
  ALL: "/incidents/all",
  RESPOND: (id: string) => `/incidents/respond/${id}`,
};

export const TRAINING_ENDPOINTS = {
  BASE: "/training",
  STAFF_HISTORY: "/training/my-history",
  STAFF_DETAIL: (staffId: string) => `/training/staff/${staffId}`,
  BY_ID: (id: string) => `/training/${id}`,
};

export const SOP_ENDPOINTS = {
  BASE: "/sop",
  UPDATE: (id: string) => `/sop/${id}`,
  ARCHIVE: (id: string) => `/sop/${id}/archive`,
  HISTORY: (name: string) => `/sop/history/${encodeURIComponent(name)}`,
  DOWNLOAD: (id: string) => `/sop/download/${id}`,
  ACKNOWLEDGE: (id: string) => `/sop/${id}/acknowledge`,
  REPORT: (id: string) => `/sop/${id}/report`,
};

export const QUALITY_ENDPOINTS = {
  INDICATORS: "/quality/indicators",
  INDICATOR_BY_ID: (id: string) => `/quality/indicators/${id}`,
  ACTIONS: "/quality/actions",
  STATUS: (id: string) => `/quality/actions/${id}/status`,
  EVALUATE: (id: string) => `/quality/actions/${id}/evaluate`,
};

export const HR_ENDPOINTS = {
  STATS: "/hr/stats",
  STAFF: {
    BASE: "/hr/staff",
    BY_ID: (id: string) => `/hr/staff/${id}`,
  },
  LEAVES: {
    BASE: "/hr/leaves",
    BY_ID: (id: string) => `/hr/leaves/${id}`,
  },
  ATTENDANCE: "/hr/attendance",
  PAYROLL: "/hr/payroll",
  RECRUITMENT: "/recruitment",
  PERFORMANCE: "/hr/performance",
  PERFORMANCE_DASHBOARD: "/hr/dashboard/performance",
  DOCTOR_PERFORMANCE_DASHBOARD: "/hr/dashboard/doctor-performance",
  DOCUMENTS: "/hr/documents",
  TRAINING: "/hr/training",
};

// ─── Enterprise Performance Analytics V2 ─────────────────────────────────────
export const PERFORMANCE_V2_ENDPOINTS = {
  DASHBOARD: "/performance/dashboard",
  DOCTORS: "/performance/doctors",
  NURSES: "/performance/nurses",
  STAFF: "/performance/staff",
  TRENDS: (employeeId: string) => `/performance/trends/${employeeId}`,
  WEIGHTS: "/performance/weights",
  UPDATE_WEIGHTS: (role: string) => `/performance/weights/${role}`,
};

export const RECRUITMENT_ENDPOINTS = {
  BASE: "/recruitment",
  REQUEST: "/recruitment/request",
  STATUS: (id: string) => `/recruitment/status/${id}`,
  REVIEW: (id: string) => `/recruitment/review/${id}`,
  DETAIL: (id: string) => `/recruitment/${id}`,
};

export const PUBLIC_ENDPOINTS = {
  BLOGS: "/public/blogs",
  TESTIMONIALS: "/public/testimonials",
};

// Legacy support to avoid breaking existing code immediately
export const endpoints = {
  auth: {
    login: AUTH_ENDPOINTS.LOGIN,
    register: AUTH_ENDPOINTS.REGISTER,
    sendOtp: AUTH_ENDPOINTS.SEND_OTP,
    verifyOtp: AUTH_ENDPOINTS.VERIFY_OTP,
    me: AUTH_ENDPOINTS.ME,
    logout: AUTH_ENDPOINTS.LOGOUT,
    refresh: AUTH_ENDPOINTS.REFRESH,
  },
  discharge: {
    login: DISCHARGE_ENDPOINTS.LOGIN,
    logout: DISCHARGE_ENDPOINTS.LOGOUT,
    records: {
      base: DISCHARGE_ENDPOINTS.RECORDS.BASE,
      byId: DISCHARGE_ENDPOINTS.RECORDS.BY_ID,
    },
  },
  users: "/super-admin/users",
  admin: {
    dashboard: ADMIN_ENDPOINTS.DASHBOARD,
    analytics: ADMIN_ENDPOINTS.ANALYTICS,
    users: ADMIN_ENDPOINTS.USERS,
    hospitals: ADMIN_ENDPOINTS.HOSPITALS,
    doctors: ADMIN_ENDPOINTS.DOCTORS,
    patients: ADMIN_ENDPOINTS.PATIENTS,
    helpdesks: ADMIN_ENDPOINTS.HELPDESKS,
    admins: ADMIN_ENDPOINTS.ADMINS,
    createAdmin: ADMIN_ENDPOINTS.CREATE_ADMIN,
    createDoctor: ADMIN_ENDPOINTS.CREATE_DOCTOR,
    createHelpdesk: ADMIN_ENDPOINTS.ASSIGN_HELPDESK,
    createHospital: ADMIN_ENDPOINTS.CREATE_HOSPITAL,
    updateHospitalStatus: ADMIN_ENDPOINTS.UPDATE_HOSPITAL_STATUS,
    deleteHospital: ADMIN_ENDPOINTS.DELETE_HOSPITAL,
    updateUser: ADMIN_ENDPOINTS.UPDATE_USER,
    deleteUser: ADMIN_ENDPOINTS.DELETE_USER,
    assignDoctor: ADMIN_ENDPOINTS.ASSIGN_DOCTOR,
    assignHelpdesk: ADMIN_ENDPOINTS.ASSIGN_HELPDESK,
    broadcast: ADMIN_ENDPOINTS.BROADCAST,
    hospitalDetails: ADMIN_ENDPOINTS.HOSPITAL_DETAILS,
    hospitalDoctors: ADMIN_ENDPOINTS.HOSPITAL_DOCTORS,
    supportRequests: ADMIN_ENDPOINTS.SUPPORT_REQUESTS,
  },
  quality: {
    indicators: QUALITY_ENDPOINTS.INDICATORS,
    indicatorById: QUALITY_ENDPOINTS.INDICATOR_BY_ID,
    actions: QUALITY_ENDPOINTS.ACTIONS,
    status: QUALITY_ENDPOINTS.STATUS,
    evaluate: QUALITY_ENDPOINTS.EVALUATE,
  },
};
