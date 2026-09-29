
"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from '@/stores/authStore';
import { 
    Settings, LogOut, X, User, ChevronDown, ChevronRight,
    LayoutDashboard, PieChart, Users, Building2, Stethoscope, 
    UserRound, Headset, Briefcase, Shield, Key, UserPlus, 
    UserCog, Pill, FlaskConical, Ambulance, Contact, 
    PlusSquare, UserCheck, Globe, FileText, Quote, Menu, QrCode
} from "lucide-react";
import LogoutModal from "@/components/auth/LogoutModal";
import NotificationCenter from "@/components/navbar/NotificationCenter";
import AdminSupportFloatingBox from "@/components/admin/AdminSupportFloatingBox";
import ProgressBar from "@/components/ui/ProgressBar";

import SharedSidebar from "@/components/navbar/SharedSidebar";

const adminMenuItems: any[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: PieChart, label: "Analytics", path: "/admin/analytics" },
    { icon: Users, label: "All Users", path: "/admin/users" },
    { icon: Building2, label: "Hospitals", path: "/admin/hospitals" },
    { icon: FileText, label: "Audit Logs", path: "/admin/audit-logs" },
    { icon: Shield, label: "Hospital Admins", path: "/admin/hospital-admins" },
    { icon: Stethoscope, label: "Doctors", path: "/admin/doctors" },
    { icon: Headset, label: "Front Desk", path: "/admin/helpdesks" },
    { icon: Briefcase, label: "HR Management", path: "/admin/hr" },
    { icon: UserRound, label: "Patients", path: "/admin/patients" },
    {
        icon: Key,
        label: "Creating Credentials",
        subItems: [
            { label: "Create Hospital", path: "/admin/create-hospital" },
            { label: "Create Hospital Admin", path: "/admin/create-hospital-admin" },
            { label: "Create HelpDesk", path: "/admin/create-helpdesk" },
            { label: "Create Master Helpdesk", path: "/admin/create-masterhelpdesk" },
            { label: "Create Doctor", path: "/admin/create-doctor" },
            { label: "Create HR", path: "/admin/create-hr" },
            { label: "Create Pharmacy", path: "/admin/create-pharma" },
            { label: "Create Lab", path: "/admin/create-lab" },
            { label: "Create Emergency", path: "/admin/create-emergency" },
            { label: "Create Radiology", path: "/admin/create-radiology" },
        ]
    },
    {
        icon: FlaskConical,
        label: "Smart Laboratory",
        subItems: [
            { label: "Master Lab Tests", path: "/admin/master-lab-tests" },
        ]
    },
    {
        icon: Globe,
        label: "CMS Management",
        subItems: [
            { label: "Manage Blogs", path: "/admin/cms/blogs" },
            { label: "Manage Testimonials", path: "/admin/cms/testimonials" },
        ]
    },
    { icon: QrCode, label: "QR Booking Code", path: "/admin/qr-generator" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname() as string;
    const { user, logout, isAuthenticated, checkAuth, isLoading, isInitialized } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        useAuthStore.getState().initEvents();
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (isInitialized) {
            if (!isAuthenticated) {
                router.push('/auth/login');
            } else if (user?.role !== 'admin' && user?.role !== 'super-admin') {
                const routeMap: Record<string, string> = {
                    'staff': '/staff',
                    'doctor': '/doctor',
                    'hospital-admin': '/hospital-admin',
                    'lab': '/lab/dashboard',
                    'pharmacy': '/pharmacy/dashboard',
                    'helpdesk': '/helpdesk',
                    'patient': '/patient'
                };
                router.push(routeMap[user?.role || ''] || '/auth/login');
            }
        }
    }, [isAuthenticated, isInitialized, user?.role, router]);

    if (!isMounted || isLoading || !isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic text-center">Super Admin</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-1">Verifying Root Node</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super-admin')) return null;

    const adminUser = user || { name: "Super Admin", role: "Super Admin" };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={async () => { await logout(); router.push('/'); }}
                userName={user?.name}
            />

            <SharedSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                menuItems={adminMenuItems}
                branding={{ logo: Shield, title: "CureChain", subtitle: "Super Admin" }}
                currentPath={pathname}
                onMenuItemClick={(path) => {
                    startTransition(() => {
                        router.push(path);
                        setIsSidebarOpen(false);
                    });
                }}
            />

            <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
                <header className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-border-theme bg-card shadow-sm z-30 sticky top-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden text-foreground hover:opacity-80 transition-opacity p-2"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex-1"></div>
                    <div className="flex items-center gap-3">
                        <NotificationCenter />
                        <div className="h-6 w-px bg-border-theme opacity-30"></div>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center gap-2 hover:opacity-80"
                            >
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                                    {adminUser.name?.charAt(0).toUpperCase() || "A"}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-foreground">{adminUser.name}</p>
                                    <p className="text-xs opacity-60">Super Admin</p>
                                </div>
                            </button>

                            {isProfileDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileDropdownOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border border-border-theme z-40 overflow-hidden bg-card transition-all animate-in fade-in slide-in-from-top-2">
                                        <div className="p-4 border-b border-border-theme">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {adminUser.name?.charAt(0).toUpperCase() || "A"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{adminUser.name}</p>
                                                    <p className="text-[10px] opacity-60 uppercase font-black">Super Admin</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="py-2">
                                            <button
                                                onClick={() => { router.push('/admin/profile'); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-muted/10 transition-colors"
                                            >
                                                <User size={16} className="text-blue-500" />
                                                <span>My Profile</span>
                                            </button>
                                            <button
                                                onClick={() => { setIsLogoutModalOpen(true); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                            >
                                                <LogOut size={16} />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="p-2 md:p-6 flex-1 overflow-y-auto relative bg-background">
                    <ProgressBar isPending={isPending} color="#2563eb" />
                    <div className="max-w-[1600px] mx-auto w-full">
                        <React.Fragment>
                            {children}
                        </React.Fragment>
                    </div>
                </main>
            </div>
            <AdminSupportFloatingBox />
        </div>
    );
};

export default AdminLayout;
