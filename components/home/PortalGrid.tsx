'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Stethoscope,
  Building2,
  Beaker,
  Pill,
  Truck,
  Headset,
  Users,
  ArrowRight,
  HeartPulse
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const servicePortals = [
  {
    title: 'Patient Portal',
    desc: 'Access your health records, book appointments, and view reports.',
    icon: User,
    color: 'blue',
    image: '/assets/patinet.jpeg',
    classes: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'hover:border-blue-500/50',
      shadow: 'hover:shadow-blue-500/20',
      iconBg: 'bg-blue-50',
    },
    path: '/auth/login',
  },
  {
    title: 'Doctor Portal',
    desc: 'Manage patient consultations, digital prescriptions, and schedules.',
    icon: Stethoscope,
    color: 'emerald',
    image: '/assets/doctor.jpeg',
    classes: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'hover:border-emerald-500/50',
      shadow: 'hover:shadow-emerald-500/20',
      iconBg: 'bg-emerald-50',
    },
    path: '/auth/login',
  },
  {
    title: 'Staff Portal',
    desc: 'Staff attendance, profile management, and internal communications.',
    icon: Users,
    color: 'amber',
    image: '/assets/staff1.jpeg',
    classes: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      border: 'hover:border-amber-500/50',
      shadow: 'hover:shadow-amber-500/20',
      iconBg: 'bg-amber-50',
    },
    path: '/auth/login',
  },
  
  {
    title: 'Lab & Diagnostics',
    desc: 'Manage test reports, sample tracking, and diagnostic data.',
    icon: Beaker,
    color: 'purple',
    image: '/assets/lab3.jpeg',
    classes: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-600',
      border: 'hover:border-purple-500/50',
      shadow: 'hover:shadow-purple-500/20',
      iconBg: 'bg-purple-50',
    },
    path: '/lab/login',
  },
  {
    title: 'Pharmacy Portal',
    desc: 'Inventory control, medicine dispensing, and billing systems.',
    icon: Pill,
    color: 'teal',
    image: '/assets/pharma1.jpeg',
    classes: {
      bg: 'bg-teal-500/10',
      text: 'text-teal-600',
      border: 'hover:border-teal-500/50',
      shadow: 'hover:shadow-teal-500/20',
      iconBg: 'bg-teal-50',
    },
    path: '/pharmacy/login',
  },
  {
    title: 'Emergency Care',
    desc: 'Dispatch management and critical care response tracking.',
    icon: Truck,
    color: 'red',
    image: '/assets/emergency.jpg',
    classes: {
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      border: 'hover:border-red-500/50',
      shadow: 'hover:shadow-red-500/20',
      iconBg: 'bg-red-50',
    },
    path: '/emergency/login',
  },

];

const adminPortals = [
  {
    title: 'Hospital Admin',
    desc: 'Complete hospital management, staff oversight, and analytics.',
    icon: Building2,
    color: 'indigo',
    image: '/assets/admin2.jpeg',
    classes: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-600',
      border: 'hover:border-indigo-500/50',
      shadow: 'hover:shadow-indigo-500/20',
      iconBg: 'bg-indigo-50',
    },
    path: '/auth/login',
  },
  {
    title: 'HR Portal',
    desc: 'Manage staff, handle payroll, track attendance, and recruit seamlessly.',
    icon: Users,
    color: 'blue',
    image: '/assets/hosptial_hr.png',
    classes: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'hover:border-blue-500/50',
      shadow: 'hover:shadow-blue-500/20',
      iconBg: 'bg-blue-50',
    },
    path: '/hr/login',
  },
  {
    title: 'Frontdesk Portal',
    desc: 'Front desk operations, patient registry, and queue management.',
    icon: Headset,
    color: 'orange',
    image: '/assets/frontdesk.png',
    classes: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-600',
      border: 'hover:border-orange-500/50',
      shadow: 'hover:shadow-orange-500/20',
      iconBg: 'bg-orange-50',
    },
    path: '/auth/login',
  },

  
   {
    title: 'Nurse Portal',
    desc: 'Dynamic nursing dashboard for vitals, medication, and ward management.',
    icon: HeartPulse,
    color: 'emerald',
    image: '/assets/nurse.png',
    classes: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'hover:border-emerald-500/50',
      shadow: 'hover:shadow-emerald-500/20',
      iconBg: 'bg-emerald-50',
    },
    path: '/nurse/login',
  }
  
];

const PortalCard = ({ portal, onClick }: { portal: any, onClick: (path: string) => void }) => (
  <div
    onClick={() => onClick(portal.path)}
    className={`group relative flex flex-col rounded-[1rem] border border-primary-theme/30 bg-card cursor-pointer overflow-hidden shadow-sm hover:shadow-xl ${portal.classes.border} ${portal.classes.shadow} hover:-translate-y-1`}
  >
    {/* Image Section */}
    <div className="relative h-[240px] w-full overflow-hidden">
      <img
        src={portal.image}
        alt={portal.title}
        className={`w-full h-full object-cover group-hover:scale-105 ${portal.imagePosition || ''}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
    </div>

    {/* Content Section */}
    <div className="p-8 flex flex-col flex-grow bg-white">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${portal.classes.iconBg}`}>
          <portal.icon className={`w-6 h-6 ${portal.classes.text}`} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
          {portal.title}
        </h3>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
        {portal.desc}
      </p>

      <div className="mt-auto flex items-center text-[0.8rem] font-black text-blue-600 uppercase tracking-widest group-hover:gap-3 gap-2">
        Portal Details <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const PortalGrid = ({ onPortalClick }: { onPortalClick?: (path: string) => void }) => {
  const router = useRouter();
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const agreed = localStorage.getItem('mscurechain_terms_accepted');
    if (agreed === 'true') {
      setHasAgreed(true);
    }
  }, []);

  const handlePortalClick = (path: string) => {
    if (onPortalClick) {
      onPortalClick(path);
      return;
    }

    if (hasAgreed) {
      router.push(path);
    } else {
      const element = document.getElementById('terms-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push('/#terms-section');
      }
    }
  };

  return (
    <div className="py-16 sm:py-24 px-4 sm:px-6 space-y-16 sm:space-y-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">
        {/* Service Portals */}
        <section className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
              Our Core Healthcare Portals
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
              Primary gateways for patients, medical professionals, and clinical management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicePortals.map((portal) => (
              <PortalCard key={portal.title} portal={portal} onClick={handlePortalClick} />
            ))}
          </div>
        </section>

        {/* Admin Portals */}
        <section className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
              Management Gateways
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
              Dedicated portals for support staff, internal management, and system governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {adminPortals.map((portal) => (
              <PortalCard key={portal.title} portal={portal} onClick={handlePortalClick} />
            ))}
          </div>
        </section>

        {/* See More Button */}
        <section className="max-w-7xl mx-auto  flex justify-center">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => handlePortalClick('/coming-soon')}
            className="group relative px-12 py-5 rounded-2xl bg-primary-theme border border-slate-200 text-white font-black text-sm  tracking-[0.2em] hover:bg-primary-theme/90 hover:text-white shadow-xl hover:shadow-slate-200 active:scale-95 flex items-center gap-3"
          >
            See More Modules
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2" />
          </button>
        </section>
      </div>
    </div>
  );
};


export default PortalGrid;
