'use client';

import React, { useState, useCallback, useMemo } from "react";
import {
    ChevronDown,
    X
} from "lucide-react";
import { usePathname, useParams } from "next/navigation";
import { useTenantLink } from "@/hooks/useTenantLink";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/integrations";

export interface MenuItem {
    icon: any;
    label: string;
    path?: string;
    subItems?: { label: string; path: string }[];
    badge?: string;
}

interface SharedSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    menuItems: MenuItem[];
    branding: {
        logo: any;
        title: string;
        subtitle?: string;
    };
    onMenuItemClick: (path: string) => void;
    currentPath: string;
    /** Called with `true` when sidebar expands (hover/open), `false` when collapsed */
    onHoverChange?: (expanded: boolean) => void;
}

const SharedSidebar: React.FC<SharedSidebarProps> = ({
    isOpen,
    onClose,
    menuItems,
    branding,
    onMenuItemClick,
    currentPath,
    onHoverChange,
}) => {
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
    const [isHovered, setIsHovered] = useState(false);
    const { getPath } = useTenantLink();
    const params = useParams() as any;
    const hospitalId = params?.hospitalId as string;

    // Determine if we should show the dynamic hospital name
    // Exclude Super Admin, Patient Portal, and Emergency portals
    const isExcluded = useMemo(() => {
        const sub = branding.subtitle?.toLowerCase() || "";
        return sub.includes("super admin") || 
               sub.includes("patient") || 
               sub.includes("emergency");
    }, [branding.subtitle]);

    const { data: dynamicBranding, isLoading: isBrandingLoading } = useQuery({
        queryKey: ["sidebar-hospital-branding", hospitalId],
        queryFn: async () => {
            if (!hospitalId || isExcluded) return null;
            try {
                // Correct path for apiClient is /auth/... NOT /api/auth/...
                // The BASE_URL already contains the /api prefix
                const data = await apiClient<{ valid: boolean; hospitalName?: string; hospitalLogo?: string }>(
                    `/auth/verify-hospital/${hospitalId}`
                );
                return {
                    name: data?.hospitalName || null,
                    logo: data?.hospitalLogo || null
                };
            } catch (err) {
                console.error("[Sidebar] Failed to fetch hospital branding:", err);
                return null;
            }
        },
        enabled: !!hospitalId && !isExcluded,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        retry: 2,
    });

    const displayTitle = useMemo(() => {
        // If it's an excluded portal (Admin/Patient/Emergency) or no hospital context, stay with standard branding
        if (!hospitalId || isExcluded) return branding.title;
        
        // While loading, show a subtle placeholder
        if (isBrandingLoading) return "...";
        
        // If we found a name, use it. 
        // If NO name found but we HAVE a hospitalId, still DO NOT show "CureChain" as requested.
        return dynamicBranding?.name || "HOSPITAL PORTAL";
    }, [hospitalId, isExcluded, dynamicBranding, isBrandingLoading, branding.title]);

    const toggleMenu = (label: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        onHoverChange?.(true);
    }, [onHoverChange]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        onHoverChange?.(false);
    }, [onHoverChange]);

    const handleCollapse = useCallback(() => {
        setIsHovered(false);
        onHoverChange?.(false);
        onClose();
    }, [onClose, onHoverChange]);

    const isExpanded = isOpen || isHovered;

    const BrandingIcon = branding.logo;

    return (
        <>
            {/* Backdrop for mobile drawer */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/30 z-30 backdrop-blur-sm transition-all duration-300"
                    onClick={handleCollapse}
                />
            )}

            {/* Sidebar Layout Container */}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed md:sticky left-0 top-0 h-screen z-50 shrink-0
                    transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isOpen
                        ? "translate-x-0 w-72"                            // mobile drawer
                        : "-translate-x-full w-72 md:translate-x-0 md:w-16 lg:w-[260px]" // default
                    }
                `}
            >
                <aside
                    className={`
                        absolute left-0 top-0 h-full flex flex-col bg-white border-r border-slate-200
                        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${isOpen
                            ? "w-72 shadow-2xl"
                            : isHovered
                                ? "w-[260px] shadow-2xl lg:shadow-none"
                                : "w-full shadow-xl lg:shadow-none"
                        }
                    `}
                >
                {/* Brand */}
                <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between overflow-hidden shrink-0 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 shrink-0 bg-primary-theme rounded-xl flex items-center justify-center shadow-lg shadow-primary-theme-200 transition-transform duration-300 hover:scale-105 active:scale-95 overflow-hidden">
                            {dynamicBranding?.logo ? (
                                <img src={dynamicBranding.logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <BrandingIcon className="text-white" size={19} />
                            )}
                        </div>
                        <div
                            className={`
                                min-w-0 overflow-hidden transition-all duration-500
                                ${isExpanded ? "opacity-100 max-w-[200px] translate-x-0" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[200px] -translate-x-2 lg:translate-x-0"}
                            `}
                        >
                            <h1 className="text-[14px] font-black text-slate-900 leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-xs" 
                                title={displayTitle}>
                                {displayTitle}
                            </h1>
                            {branding.subtitle && (
                                <p className="text-[8.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-[0.2em] whitespace-nowrap">
                                    {branding.subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* X button for mobile/hover close */}
                    <button
                        onClick={handleCollapse}
                        className={`
                            shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all lg:hidden
                            ${isExpanded ? "flex" : "hidden"}
                        `}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable menu area */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar overflow-x-hidden">
                    {menuItems.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isAutoExpanded = item.subItems?.some(s => currentPath === getPath(s.path));
                        const isMenuExpanded = expandedMenus[item.label] ?? isAutoExpanded;

                        const isActive = item.path
                            ? currentPath === getPath(item.path)
                            : item.subItems?.some((s) => currentPath === getPath(s.path));
                        const IconComponent = item.icon;

                        return (
                            <div key={`${item.label}-${item.path || index}`} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasSubItems) {
                                            toggleMenu(item.label);
                                        } else if (item.path) {
                                            onMenuItemClick(item.path);
                                        }
                                    }}
                                    title={item.label}
                                    className={`
                                        flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold
                                        transition-all duration-200 w-full text-left group/btn
                                        ${isActive
                                            ? "bg-primary-theme-50 text-primary-theme shadow-sm border border-primary-theme-100/50"
                                            : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 min-w-0 py-0.5">
                                        <div className={`p-1.5 rounded-lg transition-all duration-200 shrink-0 flex items-center justify-center ${isActive
                                            ? "bg-primary-theme text-white shadow-md shadow-primary-theme/20 scale-105"
                                            : "bg-slate-100 text-slate-500 group-hover/btn:bg-primary-theme-50 group-hover/btn:text-primary-theme group-hover/btn:scale-105"
                                            }`}>
                                            <IconComponent size={16} strokeWidth={2.2} />
                                        </div>
                                        <span
                                            className={`
                                                uppercase tracking-widest whitespace-nowrap transition-all duration-300 overflow-hidden shrink-0
                                                ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[200px]"}
                                            `}
                                        >
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span
                                                className={`
                                                    ml-auto px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase
                                                    transition-all duration-300 shrink-0
                                                    ${isActive
                                                        ? "bg-primary-theme text-white"
                                                        : "bg-slate-200 text-slate-600"
                                                    }
                                                    ${isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 lg:opacity-100 lg:scale-100"}
                                                `}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>

                                    {hasSubItems && (
                                        <div
                                            className={`
                                                transition-all duration-300 shrink-0 ml-2
                                                ${isMenuExpanded ? "rotate-180" : ""}
                                                ${isExpanded ? "opacity-100" : "opacity-0 lg:opacity-100"}
                                            `}
                                        >
                                            <ChevronDown size={14} className={isActive ? "text-primary-theme" : "text-slate-300"} />
                                        </div>
                                    )}
                                </button>

                                {/* Sub Items */}
                                {hasSubItems && (isMenuExpanded || isAutoExpanded) && (isExpanded || true) && (
                                    <div
                                        className={`
                                            ml-4 pl-4 border-l-2 border-slate-100 space-y-1 mt-1
                                            animate-in slide-in-from-top-2 duration-200
                                            ${isExpanded ? "block" : "hidden lg:block"}
                                        `}
                                    >
                                        {item.subItems?.map((sub, subIndex) => (
                                            <button
                                                key={sub.path || `sub-${subIndex}`}
                                                onClick={() => onMenuItemClick(sub.path)}
                                                className={`
                                                    w-full text-left px-3 py-2 rounded-lg text-[10px] font-black
                                                    uppercase tracking-widest transition-all whitespace-nowrap
                                                    ${currentPath === getPath(sub.path)
                                                        ? "text-primary-theme bg-primary-theme-50"
                                                        : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                                    }
                                                `}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>


            </aside>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e2e8f0;
                }
            `}</style>
        </>
    );
};

export default React.memo(SharedSidebar);
