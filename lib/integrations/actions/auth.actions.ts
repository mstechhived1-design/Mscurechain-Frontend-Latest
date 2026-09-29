"use server";

import { cookies } from 'next/headers';
import { apiServer } from '../api/apiServer';
import { endpoints } from '../config';
import type { LoginRequest, AuthResponse, MeResponse } from '../types';

export async function loginAction(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiServer<any>(endpoints.auth.login, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  const { accessToken, refreshToken, csrfToken, user, accessTokenExpiresIn, refreshTokenExpiresIn } = response;

  if (accessToken || refreshToken) {
    const cookieStore = await cookies();
    
    // ✅ MULTI-TENANCY: Identify the hospital context for namespacing cookies
    const rawHospId = user?.hospital || user?.hospitalId;
    const userHospId = (rawHospId && typeof rawHospId === 'object') ? (rawHospId._id || rawHospId.id || rawHospId.toString()) : rawHospId;
    const effectiveId = userHospId || "";
    // Role MUST NOT come from client (deterministic architectural rule)
    const role = user?.role ? user.role.toLowerCase() : '';

    // Set hospitalId legacy cookie for discovery
    if (effectiveId) {
      cookieStore.set('hospitalId', effectiveId, { path: '/', maxAge: 604800, sameSite: 'lax' });
    }

    const hospitalSuffix = effectiveId ? `_${effectiveId}` : "";
    const roleSuffix = role ? `_${role}` : "";

    const nextHeaders = await import('next/headers').then(m => m.headers());
    const host = (await nextHeaders).get('host');
    const isLocal = !host || host.includes('localhost') || host.includes('127.0.0.1');
    const secureFlag = process.env.NODE_ENV === 'production' && !isLocal;

    // ✅ ACCESS TOKEN: Dynamic TTL from backend .env (fallback 15m)
    const ACCESS_TOKEN_MAX_AGE = accessTokenExpiresIn || 30 * 60; // default 1800s
    if (accessToken) {
      cookieStore.set('accessToken', accessToken, {
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        httpOnly: false, // Readable by JS for Authorization header fallback
        secure: secureFlag,
        sameSite: 'lax',
      });
      if (hospitalSuffix) {
        cookieStore.set(`accessToken${hospitalSuffix}`, accessToken, {
          path: '/',
          maxAge: ACCESS_TOKEN_MAX_AGE,
          httpOnly: false,
          secure: secureFlag,
          sameSite: 'lax',
        });
      }
      if (roleSuffix) {
        cookieStore.set(`accessToken${roleSuffix}`, accessToken, {
          path: '/',
          maxAge: ACCESS_TOKEN_MAX_AGE,
          httpOnly: false,
          secure: secureFlag,
          sameSite: 'lax',
        });
      }
    }

    const REFRESH_TOKEN_MAX_AGE = refreshTokenExpiresIn || 7 * 24 * 60 * 60;
    if (refreshToken) {
      cookieStore.set('refreshToken', refreshToken, {
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        httpOnly: true,
        secure: secureFlag,
        sameSite: 'lax', // Changed from strict for better multi-port dev stability
      });
    }

    if (csrfToken) {
      cookieStore.set('csrf_token', csrfToken, {
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        httpOnly: false,
        secure: secureFlag,
        sameSite: 'lax',
      });
      if (hospitalSuffix) {
        cookieStore.set(`csrf_token${hospitalSuffix}`, csrfToken, {
          path: '/',
          maxAge: REFRESH_TOKEN_MAX_AGE,
          httpOnly: false,
          secure: secureFlag,
          sameSite: 'lax',
        });
      }
      if (roleSuffix) {
        cookieStore.set(`csrf_token${roleSuffix}`, csrfToken, {
          path: '/',
          maxAge: REFRESH_TOKEN_MAX_AGE,
          httpOnly: false,
          secure: secureFlag,
          sameSite: 'lax',
        });
      }
    }

    if (role) {
      cookieStore.set('userRole', role, { path: '/', maxAge: 604800, sameSite: 'lax' });
      if (hospitalSuffix) {
        cookieStore.set(`userRole${hospitalSuffix}`, role, { path: '/', maxAge: 604800, sameSite: 'lax' });
      }
      if (roleSuffix) {
        cookieStore.set(`userRole${roleSuffix}`, role, { path: '/', maxAge: 604800, sameSite: 'lax' });
      }
    }
  }

  return response;
}

// Sync session cookies from client to server (e.g. after refresh)
export async function syncSessionAction(
  accessToken: string, 
  refreshToken: string, 
  csrfToken?: string, 
  accessExpiry?: number, 
  refreshExpiry?: number,
  role?: string
) {
  const cookieStore = await cookies();

  // ⚠️ MULTI-TENANCY: Attempt to resolve context for suffixing
  const nextHeaders = await import('next/headers').then(m => m.headers());
  const referer = (await nextHeaders).get('referer');
  let hospitalSuffix = "";
  if (referer) {
    try {
      const url = new URL(referer);
      const parts = url.pathname.split('/').filter(Boolean);
      const firstSegment = parts[0];
      
      // Robust Hospital Identifier Match (MongoDB ObjectId OR alphanumeric slug)
      // Must NOT be a reserved system route.
      const reserved = ["auth", "api", "dashboard", "login", "admin", "super-admin", "about", "blogs", "features", "pricing", "solutions", "portals", "support", "coming-soon", "ambulance", "patient"];
      if (firstSegment && !reserved.includes(firstSegment.toLowerCase())) {
        if (/^[a-f0-9]{24}$/i.test(firstSegment) || /^[a-z0-9][a-z0-9-]{2,58}[a-z0-9]$/i.test(firstSegment)) {
          hospitalSuffix = `_${firstSegment}`;
        }
      }
    } catch (e) {}
  }

  const roleSuffix = role ? `_${role.toLowerCase()}` : "";

  // ✅ ACCESS TOKEN: Dynamic TTL from backend .env
  const ACCESS_TOKEN_MAX_AGE = accessExpiry || 30 * 60; // fallback 1800s
  
  const host = (await nextHeaders).get('host');
  const isLocal = !host || host.includes('localhost') || host.includes('127.0.0.1');
  const secureFlag = process.env.NODE_ENV === 'production' && !isLocal;

  if (accessToken) {
    cookieStore.set('accessToken', accessToken, {
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      httpOnly: false, // Must be readable by client for Authorization header fallback
      secure: secureFlag,
      sameSite: 'lax',
    });
    if (hospitalSuffix) {
      cookieStore.set(`accessToken${hospitalSuffix}`, accessToken, {
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        httpOnly: false,
        secure: secureFlag,
        sameSite: 'lax',
      });
    }
    if (roleSuffix) {
      cookieStore.set(`accessToken${roleSuffix}`, accessToken, {
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        httpOnly: false,
        secure: secureFlag,
        sameSite: 'lax',
      });
    }
  }

  const REFRESH_TOKEN_MAX_AGE = refreshExpiry || 7 * 24 * 60 * 60; // fallback 7d

  // ✅ REFRESH TOKEN: Only set if non-empty.
  if (refreshToken) {
    cookieStore.set('refreshToken', refreshToken, {
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
    });
  }

  if (csrfToken) {
    cookieStore.set('csrf_token', csrfToken, {
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE, // CSRF token lifetime = refresh token lifetime
      httpOnly: false,
      secure: secureFlag,
      sameSite: 'lax',
    });
    if (hospitalSuffix) {
       cookieStore.set(`csrf_token${hospitalSuffix}`, csrfToken, {
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        httpOnly: false,
        secure: secureFlag,
        sameSite: 'lax',
      });
    }
    if (roleSuffix) {
       cookieStore.set(`csrf_token${roleSuffix}`, csrfToken, {
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        httpOnly: false,
        secure: secureFlag,
        sameSite: 'lax',
      });
    }
  }

  return { success: true };
}

export async function getMeAction(): Promise<MeResponse> {
  return apiServer<MeResponse>(endpoints.auth.me);
}
