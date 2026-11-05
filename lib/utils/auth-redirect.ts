/**
 * Helper to detect if running in native desktop (.exe / Tauri) or native mobile (.apk / Android WebView)
 * and resolve user's dashboard route.
 */

export const isNativeContainer = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).AndroidNative ||
    (window as any).AndroidPrintBridge ||
    (window as any).AndroidBridge ||
    /MSCureChain|Tauri|AndroidBridge|Electron/i.test(navigator.userAgent) ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'tauri.localhost'
  );
};

export const resolveUserDashboard = (user: any): string => {
  if (!user) return '/auth/login';
  const role = (user.role || '').toLowerCase();
  const rawIdVal = (user as any).hospitalId || (user as any).hospital;
  const hosp = (rawIdVal && typeof rawIdVal === 'object') ? (rawIdVal._id || rawIdVal.id) : rawIdVal;

  const ROLE_PATH_MAP: Record<string, string> = {
    'admin': '/admin',
    'super-admin': '/admin',
    'patient': '/patient/dashboard',
    'doctor': 'doctor',
    'hospital-admin': 'hospital-admin',
    'helpdesk': 'helpdesk',
    'masterhelpdesk': 'masterhelpdesk',
    'frontdesk': 'frontdesk',
    'staff': 'staff',
    'nurse': 'nurse',
    'pharma': 'pharmacy/dashboard',
    'pharma-owner': 'pharmacy/dashboard',
    'pharmacist': 'pharmacy/dashboard',
    'lab': 'lab/dashboard',
    'emergency': '/ambulance',
    'ambulance': '/ambulance',
    'hr': 'hr',
    'discharge': 'discharge',
  };

  const portal = ROLE_PATH_MAP[role] || 'frontdesk';
  if (portal.startsWith('/')) return portal;
  return hosp ? `/${hosp}/${portal}` : `/${portal}`;
};
