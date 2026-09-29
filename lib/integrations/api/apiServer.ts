import { API_CONFIG } from '../config';
import { cookies, headers as getNextHeaders } from 'next/headers';

export async function apiServer<T>(
  path: string,
  options?: RequestInit
 ): Promise<T> {
  const cookieStore = await cookies();
  const headerStore = await getNextHeaders();

  // ✅ TENANT RESOLUTION: Prioritize header (from middleware URL) over global cookie
  let hospitalId = headerStore.get('X-Hospital-Id') || cookieStore.get('hospitalId')?.value;
  // Role MUST NOT come from cookies (deterministic architectural rule)
  let role = headerStore.get('X-User-Role');

  // 🛡️ MULTI-TAB ACTION FIX: If context is missing, extract from referer
  if (!hospitalId) {
    const referer = headerStore.get('referer');
    if (referer) {
      try {
        const url = new URL(referer);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const firstSegment = pathParts[0];
        
        if (firstSegment && /^[a-f0-9]{24}$/i.test(firstSegment) || (firstSegment && /^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(firstSegment))) {
           const reserved = ["auth", "api", "dashboard", "login", "admin", "super-admin", "pharmacy", "pharma", "pharma-owner","lab", "nurse", "hr", "emergency", "discharge", "helpdesk", "doctor", "staff", "about", "blogs", "features", "pricing", "solutions", "portals", "support", "coming-soon", "ambulance", "patient"];
           if (!reserved.includes(firstSegment.toLowerCase())) {
             hospitalId = firstSegment;
             if (!role && pathParts[1] && reserved.includes(pathParts[1].toLowerCase())) {
               role = pathParts[1].toLowerCase();
             }
           }
        } else if (!role && firstSegment) {
           const reserved = ["admin", "super-admin", "pharmacy", "pharma", "pharma-owner","lab", "nurse", "hr", "emergency", "discharge", "helpdesk", "doctor", "staff", "ambulance", "patient", "hospital-admin"];
           if (reserved.includes(firstSegment.toLowerCase())) {
               role = firstSegment.toLowerCase();
           }
        }
      } catch (e) {}
    }
  }
  
  // ✅ TOKEN RESOLUTION: Prefer X-Access-Token header set by middleware (always fresh after silentRefresh)
  // over cookie (which may be stale on first request after rotation)
  const accessToken = headerStore.get('X-Access-Token') || cookieStore.get('accessToken')?.value;
  
  // ✅ CSRF RESOLUTION: Multi-tenant support
  // The backend sets csrf_token (global) AND csrf_token_${hospitalId} or csrf_token_${role}
  let csrfToken = headerStore.get('X-CSRF-Token');
  
  if (!csrfToken) {
    // 1. Check Global
    csrfToken = cookieStore.get('csrf_token')?.value ?? null;
    
    // 2. Check Hospital-Specific (if exists)
    if (!csrfToken && hospitalId && hospitalId !== 'global') {
      csrfToken = cookieStore.get(`csrf_token_${hospitalId}`)?.value ?? null;
    }
    
    // 3. Check Role-Specific (if exists)
    if (!csrfToken && role) {
      // 🔄 NORMALIZE ROLE: Try both underscore and hyphen suffixes for cross-runtime compatibility
      const underscored = role.replace(/-/g, "_");
      const hyphenated = role.replace(/_/g, "-");
      
      csrfToken = cookieStore.get(`csrf_token_${underscored}`)?.value 
               || cookieStore.get(`csrf_token_${hyphenated}`)?.value
               || null;
      
      // SuperAdmin and HospitalAdmin aliases
      if (!csrfToken) {
        if (underscored === 'admin' || underscored === 'super_admin') {
          csrfToken = cookieStore.get('csrf_token_admin')?.value 
                   || cookieStore.get('csrf_token_super_admin')?.value
                   || cookieStore.get('csrf_token_super-admin')?.value
                   || null;
        } else if (underscored === 'hospital_admin') {
          csrfToken = cookieStore.get('csrf_token_hospital-admin')?.value
                   || null;
        }
      }
    }

    // 4. LAST RESORT: Search for ANY available CSRF token cookie if we have a session
    if (!csrfToken) {
      const allCookies = cookieStore.getAll();
      const someCsrf = allCookies.find(c => c.name.startsWith('csrf_token'));
      if (someCsrf) {
        console.warn(`[apiServer] 🛡️ Using fallback CSRF token found in cookie: ${someCsrf.name}`);
        csrfToken = someCsrf.value;
      }
    }
  }
    
  const sessionId = cookieStore.get('sessionId')?.value ?? null;

  const backendBase = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "http://43.204.32.80:5002/api";
  const fullUrl = `${backendBase}${path}`;
  // ✅ ENHANCED LOGGING: Track token source for debugging
  const tokenSource = headerStore.get('X-Access-Token') ? 'MIDDLEWARE-HEADER' : (cookieStore.get('accessToken') ? 'STALE-COOKIE' : 'MISSING');
  console.log(`[apiServer] Request: ${path} | Hospital: ${hospitalId || 'global'} | Token: ${tokenSource} | CSRF: ${csrfToken ? 'YES' : 'NO'}`);

  const isFormData = options?.body instanceof FormData;

  // Forward all existing cookies to the backend so CSRF cookie validation works
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

  const fetchHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
    'User-Agent': headerStore.get('user-agent') || 'MS-CureChain-Server',
    'X-Forwarded-For': headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || '',
    ...options?.headers,
  };

  if (accessToken) {
    (fetchHeaders as any)['Authorization'] = `Bearer ${accessToken}`;
  }

  if (csrfToken) {
    (fetchHeaders as any)['X-CSRF-Token'] = csrfToken;
  }

  if (hospitalId) {
    (fetchHeaders as any)['X-Hospital-Id'] = hospitalId;
  }

  if (sessionId) {
    (fetchHeaders as any)['X-Session-Id'] = sessionId;
  }

  const res = await fetch(fullUrl, {
    ...options,
    headers: fetchHeaders,
    cache: options?.cache || 'no-store',
  });

  // ✅ FORWARD COOKIES: If backend sends new cookies (e.g. rotated CSRF or session), forward to client
  // ✅ FIX: Use robust splitting to handle aggregated Set-Cookie strings from combined runtimes.
  const setCookieHeader = res.headers.get('set-cookie');
  if (setCookieHeader) {
    // getSetCookie() is standard in Node 20 / Next.js 15
    const rawCookieList: string[] = (res.headers as any).getSetCookie
      ? (res.headers as any).getSetCookie()
      : [setCookieHeader];

    const processedCookies: string[] = [];
    rawCookieList.forEach(cStr => {
      // Split by comma followed by a space and then a key=value pattern (avoids Expires commas)
      const parts = cStr.split(/, (?=[a-zA-Z0-9_-]+=)/);
      processedCookies.push(...parts);
    });

    const writableCookies = await cookies();
    processedCookies.forEach(cookieStr => {
      if (!cookieStr || !cookieStr.includes('=')) return;
      const parts = cookieStr.split(';').map((p: string) => p.trim());
      const nameValue = parts[0];
      const eqIdx = nameValue.indexOf('=');
      if (eqIdx === -1) return;
      const name = nameValue.slice(0, eqIdx).trim();
      const value = nameValue.slice(eqIdx + 1).trim();
      if (!name) return;

      const opts: any = { path: '/' };
      parts.slice(1).forEach((dir: string) => {
        const di = dir.indexOf('=');
        const dn = (di > -1 ? dir.slice(0, di) : dir).trim().toLowerCase();
        const dv = di > -1 ? dir.slice(di + 1).trim() : '';
        if (dn === 'httponly') opts.httpOnly = true;
        if (dn === 'secure') opts.secure = true;
        if (dn === 'samesite' && dv) opts.sameSite = dv.toLowerCase() as any;
        if (dn === 'max-age' && dv) opts.maxAge = parseInt(dv, 10);
        if (dn === 'path' && dv) opts.path = dv;
      });

      writableCookies.set(name, value, opts);
    });
  }

  if (!res.ok) {
    const textData = await res.text().catch(() => 'Failed to read response body');
    let errorData = { message: 'API Server Error' };
    try {
      errorData = JSON.parse(textData);
    } catch(e) {}
    console.error('BACKEND ERROR DATA:', res.status, textData);
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}
