'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    Settings,
    LogOut,
    Package,
    FileText,
    BarChart,
    X,
    LucideIcon,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useTenantLink } from '@/hooks/useTenantLink';

export interface SidebarItem {
    id?: string;
    icon: LucideIcon;
    label: string;
    href: string;
    badge?: string;
    subItems?: SidebarItem[];
}

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
    items?: SidebarItem[];
    className?: string;
    /**
     * Custom footer content (e.g. Logout button, Help card)
     * If not provided, a default logout button will be shown if onLogout is provided
     */
    footer?: React.ReactNode;
    /**
     * Callback for the default logout button
     */
    onLogout?: () => void;
    /**
     * Active color theme (e.g. 'blue', 'green', 'indigo')
     * Defaults to 'blue'
     */
    activeColor?: string;
    /**
     * Sidebar width class (e.g. 'w-64', 'w-48')
     * Defaults to 'w-64'
     */
    width?: string;
}

const defaultItems: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Patients', href: '/admin/patients' },
    { icon: FileText, label: 'Appointments', href: '/admin/appointments', badge: '3' },
    { icon: Package, label: 'Inventory', href: '/admin/inventory' },
    { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
    { icon: BarChart, label: 'Reports', href: '/admin/reports' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

/**
 * Sidebar Component
 * 
 * A responsive, collapsible sidebar navigation.
 * - Slides in from left on mobile
 * - Fixed/Static on desktop depending on layout usage
 * - Highlights active route
 * - Fully customizable content via props
 */
function Sidebar({
    isOpen,
    onClose,
    items = defaultItems,
    className = "",
    footer,
    onLogout,
    activeColor = 'blue',
    width = 'w-56'
}: SidebarProps) {
    const pathname = usePathname() as string;
    const { getPath } = useTenantLink(); // ✅ MULTI-TENANCY: Prefix hrefs with hospitalId

    const handleLogoutClick = () => {
        if (onLogout) {
            onLogout();
        }
    };

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-50 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-60 h-screen ${width} bg-card lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${className}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header: Title or Close Button */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-border-theme">
                        <span className="text-lg font-black text-foreground lg:hidden">Menu</span>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {/* Desktop spacer or branding placeholder */}
                        <div className="hidden lg:block text-2xl font-semibold   tracking-wider">
                            MScurechain
                        </div>
                    </div>

                    {/* Scrollable Navigation */}
                    <div className="flex-1 overflow-y-auto py-4">
                        <nav className="space-y-1 px-3">
                            {items.map((item, idx) => {
                                if (item.subItems) {
                                  // For items with subItems, check if any child is active
                                  const isChildActive = item.subItems.some(sub => {
                                      const cleanPath = pathname.replace('/' + (pathname.split('/')[1] || ''), '');
                                      return cleanPath.startsWith(sub.href.replace(/^\/[^\/]+/, ''));
                                  });
                                  
                                  return (
                                    <CollapsibleMenuItem
                                      key={item.id || `${item.label}-${item.href}-${idx}`}
                                      item={item}
                                      pathname={pathname}
                                      activeColor={activeColor}
                                      getPath={getPath}
                                      onClose={onClose}
                                      isChildActive={isChildActive}
                                    />
                                  );
                                }

                                const tenantHref = getPath(item.href);
                                // For dashboard roots, we want exact match only
                                const isRoot = item.href.endsWith('/nurse') || item.href === '/admin' || item.href === '/staff';
                                const isActive = isRoot
                                    ? pathname === tenantHref
                                    : pathname === tenantHref || pathname.startsWith(tenantHref + '/');
                                return (
                                    <Link
                                        key={item.id || `${item.href}-${item.label}-${idx}`}
                                        href={tenantHref}
                                        onClick={(e) => {
                                            if (item.href === '#logout') {
                                                e.preventDefault();
                                                handleLogoutClick();
                                                return;
                                            }
                                            // Close sidebar on mobile when link clicked
                                            if (window.innerWidth < 1024 && onClose) {
                                                onClose();
                                            }
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group ${isActive
                                            ? 'bg-primary-theme/10 text-primary-theme font-black'
                                            : 'text-muted hover:bg-secondary-theme hover:text-foreground'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 ${isActive ? `text-${activeColor}-600 dark:text-${activeColor}-400` : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500'
                                            }`} />
                                        <span className="flex-1">{item.label}</span>

                                        {item.badge && (
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${isActive
                                                ? `bg-${activeColor}-100 text-${activeColor}-700 dark:bg-${activeColor}-800 dark:text-${activeColor}-200`
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Footer Section */}
                    {footer ? (
                        <div className="p-4 border-t border-border-theme">
                            {footer}
                        </div>
                    ) : (
                        // Default Footer if none provided
                        <div className="p-4 border-t border-border-theme">
                            {onLogout && (
                                <button
                                    onClick={handleLogoutClick}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 text-muted hover:bg-destructive-theme/10 hover:text-destructive-theme rounded-lg group mb-4 font-black"
                                >
                                    <LogOut className="w-5 h-5 group-hover:text-destructive-theme" />
                                    <span>Sign Out</span>
                                </button>
                            )}

                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

export default React.memo(Sidebar);

function CollapsibleMenuItem({ item, pathname, activeColor, getPath, onClose, isChildActive }: any) {
    const [isOpen, setIsOpen] = useState(isChildActive);

    return (
        <div className="space-y-1">
            <div 
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted cursor-pointer hover:bg-secondary-theme hover:text-foreground transition-colors overflow-hidden ${isChildActive ? 'text-primary-theme font-black' : ''}`}
            >
                <item.icon className={`w-5 h-5 shrink-0 ${isChildActive ? `text-${activeColor}-600 dark:text-${activeColor}-400` : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="flex-1 font-semibold text-xs tracking-wider uppercase text-gray-500">{item.label}</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
            
            <div className={`pl-6 space-y-1 border-l-2 border-gray-100 dark:border-gray-800 ml-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1 pb-1' : 'max-h-0 opacity-0 m-0 p-0 border-transparent'}`}>
              {item.subItems.map((subItem: any, sIdx: number) => {
                const tenantHref = getPath(subItem.href);
                const isActive = pathname === tenantHref || pathname.startsWith(tenantHref + '/');
                
                return (
                  <Link
                      key={subItem.id || `${subItem.href}-${subItem.label}-${sIdx}`}
                      href={tenantHref}
                      onClick={() => {
                          if (window.innerWidth < 1024 && onClose) {
                              onClose();
                          }
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group ${isActive
                          ? 'bg-primary-theme/10 text-primary-theme font-black'
                          : 'text-muted hover:bg-secondary-theme hover:text-foreground'
                          }`}
                  >
                      <subItem.icon className={`w-4 h-4 shrink-0 ${isActive ? `text-${activeColor}-600 dark:text-${activeColor}-400` : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500'}`} />
                      <span className="flex-1 text-sm">{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
        </div>
    );
}
