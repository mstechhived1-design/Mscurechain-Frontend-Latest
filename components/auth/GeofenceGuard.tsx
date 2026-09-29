'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePathname } from 'next/navigation';
import { MapPinOff, Loader2 } from 'lucide-react';

// Haversine formula
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const pathname = usePathname() as string;
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      setStatus('allowed'); // Let normal auth guard handle unauthenticated state
      return;
    }

    const isHospitalAdminPortal = pathname?.includes('/hospital-admin') || pathname?.includes('/masterhelpdesk');
    
    // Admin is completely exempt
    if (isHospitalAdminPortal) {
      setStatus('allowed');
      return;
    }

    const settings = user.geofence?.settings;
    const location = user.geofence?.location;

    // If geofencing is not enabled or location not set, allow access
    if (!settings?.enabled || !location?.lat || !location?.lng) {
      setStatus('allowed');
      return;
    }

    // Portal-wise restriction check
    if (settings.restrictedPortals && settings.restrictedPortals.length > 0) {
      const currentPortal = pathname?.split('/')[2]; // Extract portal from /hospitalId/portalName
      if (currentPortal && !settings.restrictedPortals.includes(currentPortal)) {
        setStatus('allowed');
        return;
      }
    }

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistanceFromLatLonInM(latitude, longitude, location.lat, location.lng);

        if (distance <= settings.radiusMeters) {
          setStatus('allowed');
        } else {
          setStatus('allowed'); // Do not restrict the portal even if far
        }
      },
      (error) => {
        setStatus('allowed'); // Do not restrict the portal on error
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [user, pathname, isInitialized]);

  if (status === 'checking') {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', zIndex: 9999, position: 'fixed', top: 0, left: 0 }}>
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Verifying Location Security...</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 8 }}>Please allow location access if prompted by your browser.</p>
      </div>
    );
  }

  if (status === 'denied' || status === 'error') {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20, textAlign: 'center', zIndex: 9999, position: 'fixed', top: 0, left: 0 }}>
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: 20, borderRadius: '50%', marginBottom: 24 }}>
          <MapPinOff size={48} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Access Restricted</h1>
        <p style={{ color: '#475569', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>{errorMessage}</p>
        <button onClick={() => window.location.reload()} style={{ background: '#0f172a', color: 'white', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Try Again</button>
      </div>
    );
  }

  return <>{children}</>;
}
