"use client";

import React, { memo, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Stethoscope,
  Headphones,
  Pill,
  FlaskConical,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  X,
  LineChart,
  AlertTriangle,
  CreditCard,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  subItems?: { label: string; path: string }[];
}

// ✅ STATIC MENU - defined outside component to prevent recreation
const MENU_ITEMS: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/hospital-admin" },
  { icon: LineChart, label: "Analytics", path: "/hospital-admin/analytics" },
  { icon: ShieldCheck, label: "Quality Improvement", path: "/hospital-admin/quality" },
  {
    icon: ClipboardCheck,
    label: "Management",
    subItems: [
      { label: "Personnel List", path: "/hospital-admin/staff" },
      { label: "Discharge Staff", path: "/hospital-admin/discharge-staff" },
      { label: "Leave Requests", path: "/hospital-admin/leaves" },
      { label: "Live Overview", path: "/hospital-admin/attendance/overview" },
      { label: "Attendance Logs", path: "/hospital-admin/attendance/logs" },
      { label: "Shift Management", path: "/hospital-admin/attendance/schedules" },
    ],
  },
  {
    icon: Stethoscope,
    label: "Clinical Team",
    subItems: [
      { label: "Doctors List", path: "/hospital-admin/doctors" },
      { label: "Nursing Registry", path: "/hospital-admin/nurses" },
    ],
  },
  {
    icon: Building2,
    label: "Hospital Meta",
    subItems: [
      { label: "Profile & Identity", path: "/hospital-admin/hospital/details" },
      { label: "Departments", path: "/hospital-admin/management/departments" },
      { label: "Room Master", path: "/hospital-admin/management/rooms" },
      { label: "Bed Inventory", path: "/hospital-admin/management/beds" },
    ],
  },
  { icon: Headphones, label: "Helpdesk Support", path: "/hospital-admin/helpdesks" },
  { icon: CreditCard, label: "Transactions", path: "/hospital-admin/transactions" },
  { icon: Bell, label: "Notice Board", path: "/hospital-admin/announcements" },
  {
    icon: Pill,
    label: "Pharmacy Unit",
    subItems: [
      { label: "Dashboard", path: "/hospital-admin/pharma/dashboard" },
      { label: "Products Registry", path: "/hospital-admin/pharma/products" },
      { label: "Supplier Network", path: "/hospital-admin/pharma/suppliers" },
      { label: "Transaction Logs", path: "/hospital-admin/pharma/transactions" },
    ],
  },
  {
    icon: FlaskConical,
    label: "Diagnostics Lab",
    subItems: [
      { label: "Dashboard", path: "/hospital-admin/labs/dashboard" },
      { label: "Transactions", path: "/hospital-admin/labs/transactions" },
      { label: "Departments", path: "/hospital-admin/labs/departments" },
      { label: "Test Master", path: "/hospital-admin/labs/tests" },
      { label: "Edited Results", path: "/hospital-admin/labs/edited-results" },
    ],
  },
  { icon: AlertTriangle, label: "Medical Incidents", path: "/hospital-admin/incidents" },
  { icon: LifeBuoy, label: "System Support", path: "/hospital-admin/support" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() as string;
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Management: true,
  });

  const toggleMenu = useCallback((label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile Close Button */}
      {isOpen && (
        <button
          onClick={onClose}
          className="lg:hidden fixed top-2 right-4 z-50 p-2 rounded-lg shadow-sm bg-card text-gray-600 dark:text-gray-300"
        >
          <X size={20} />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-56 text-gray-600 dark:text-gray-300 flex flex-col z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          border-r border-border-theme bg-card
        `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-border-theme">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-linear-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">
                CureChain
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-tighter font-bold">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 hide-scrollbar">
          {MENU_ITEMS.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.label];
            const isActive = item.path
              ? pathname === item.path
              : item.subItems?.some((s) => pathname === s.path);
            const IconComponent = item.icon;

            return (
              <div key={item.label} className="space-y-0.5">
                {/* ✅ OPTIMIZATION: Use Link for direct paths, button for submenus */}
                {hasSubItems ? (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left group
                      ${isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent
                        size={18}
                        className={
                          isActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-400 group-hover:text-emerald-600"
                        }
                      />
                      {item.label}
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  // ✅ USE <Link> FOR NAVIGATION - enables prefetch & reduces compilation cost
                  <Link
                    href={item.path!}
                    prefetch={true}
                    scroll={false}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left group
                      ${isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent
                        size={18}
                        className={
                          isActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-400 group-hover:text-emerald-600"
                        }
                      />
                      {item.label}
                    </div>
                  </Link>
                )}

                {/* Sub Items - Also use Link */}
                {hasSubItems && isExpanded && (
                  <div className="ml-4 pl-3 border-l border-gray-100 dark:border-gray-800 space-y-0.5 mt-1">
                    {item.subItems?.map((sub) => (
                      <Link
                        key={sub.path}
                        href={sub.path}
                        prefetch={true}
                        scroll={false}
                        onClick={onClose}
                        className={`block w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                          ${pathname === sub.path
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 font-bold"
                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                          }`}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ✅ CRITICAL: Memoize to prevent re-renders on parent state changes
export default memo(Sidebar);
