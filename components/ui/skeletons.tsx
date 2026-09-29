/**
 * Skeleton Loading Components
 * Provides instant visual feedback while data loads
 * Part of <1.5s UI load optimization
 */

import React from 'react';

// ==================== Base Skeleton Components ====================

export const SkeletonBox = ({ className = "" }: { className?: string }) => (
    <div className={`bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer rounded ${className}`} />
);

export const SkeletonText = ({ className = "", width = "full" }: { className?: string; width?: string }) => (
    <div className={`h-4 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer rounded ${width === 'full' ? 'w-full' : width === 'half' ? 'w-1/2' : width === 'third' ? 'w-1/3' : `w-${width}`} ${className}`} />
);

export const SkeletonCircle = ({ size = "12" }: { size?: string }) => (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer`} />
);

// ==================== Dashboard Skeleton Components ====================

/**
 * Stat Card Skeleton
 * Used for dashboard statistics cards
 */
export const StatCardSkeleton = () => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <SkeletonBox className="w-10 h-10 rounded-xl" />
            <SkeletonBox className="w-12 h-6 rounded" />
        </div>
        <div className="space-y-2">
            <SkeletonText width="third" className="h-3" />
            <SkeletonBox className="w-16 h-8 rounded" />
        </div>
    </div>
);

/**
 * Helpdesk Dashboard Skeleton
 * Matches the exact layout of the Helpdesk dashboard
 */
export const HelpdeskDashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 max-w-7xl mx-auto">
            <div className="space-y-2">
                <SkeletonBox className="h-8 w-64 rounded" />
                <SkeletonBox className="h-3 w-96 rounded" />
            </div>
            <div className="flex items-center gap-3">
                <SkeletonBox className="w-12 h-12 rounded-xl" />
                <SkeletonBox className="w-40 h-12 rounded-xl" />
            </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
            {/* Doctor Queues Skeleton */}
            <div className="md:col-span-1 lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between px-1">
                    <SkeletonBox className="h-4 w-32 rounded" />
                    <SkeletonBox className="h-6 w-24 rounded" />
                </div>
                <div className="grid grid-cols-1 gap-3 h-[500px] overflow-y-auto pr-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <SkeletonBox className="w-10 h-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <SkeletonBox className="h-4 w-24 rounded" />
                                    <SkeletonBox className="h-3 w-32 rounded" />
                                </div>
                            </div>
                            <SkeletonBox className="w-12 h-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Appointment List Skeleton */}
            <div className="lg:col-span-8 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[525px]">
                    {/* Tabs */}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                        <SkeletonBox className="w-64 h-12 rounded-xl" />
                        <SkeletonBox className="w-full sm:w-64 h-12 rounded-xl" />
                    </div>

                    {/* List Items */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50 px-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-6 grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                <SkeletonBox className="col-span-1 h-6 w-8 rounded" />
                                <div className="col-span-5 flex items-center gap-4">
                                    <SkeletonBox className="w-11 h-11 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <SkeletonBox className="h-4 w-32 rounded" />
                                        <SkeletonBox className="h-3 w-24 rounded" />
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <SkeletonBox className="h-4 w-28 rounded" />
                                </div>
                                <div className="col-span-3 flex items-center gap-3 justify-end">
                                    <SkeletonBox className="h-10 w-32 rounded-xl" />
                                    <SkeletonBox className="w-8 h-8 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between px-8">
                        <SkeletonBox className="h-3 w-32 rounded" />
                        <SkeletonBox className="h-3 w-40 rounded" />
                    </div>
                </div>
            </div>
        </div>

        <style jsx global>{`
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      .animate-shimmer {
        animation: shimmer 2s ease-in-out infinite;
      }
    `}</style>
    </div>
);

/**
 * Staff Dashboard Skeleton
 * Matches the exact layout of the Staff dashboard
 */
export const StaffDashboardSkeleton = () => (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
                <SkeletonBox className="h-10 w-64 rounded" />
                <SkeletonBox className="h-5 w-96 rounded" />
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end mr-2 space-y-1">
                    <SkeletonBox className="h-5 w-32 rounded" />
                    <SkeletonBox className="h-4 w-40 rounded" />
                </div>
            </div>
        </div>

        {/* Quick Actions & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Check In/Out Card */}
            <div className="lg:col-span-4 h-full">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <SkeletonBox className="w-12 h-12 rounded-2xl" />
                        <SkeletonBox className="h-6 w-32 rounded" />
                    </div>
                    <div className="flex-1 space-y-8">
                        <div className="text-center space-y-4">
                            <SkeletonBox className="h-12 w-full rounded-3xl mx-auto" />
                            <SkeletonBox className="h-5 w-3/4 rounded mx-auto" />
                        </div>
                        <SkeletonBox className="w-full h-16 rounded-3xl" />
                    </div>
                </div>
            </div>

            {/* Stats Cards Cluster */}
            <div className="lg:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-gray-100">
                            <div className="flex items-center justify-between mb-8">
                                <SkeletonBox className="h-6 w-48 rounded" />
                                <SkeletonBox className="w-10 h-10 rounded-xl" />
                            </div>
                            <SkeletonBox className="h-16 w-32 rounded mb-8" />
                            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-100">
                                <div className="space-y-2">
                                    <SkeletonBox className="h-3 w-20 rounded" />
                                    <SkeletonBox className="h-8 w-16 rounded" />
                                </div>
                                <div className="space-y-2">
                                    <SkeletonBox className="h-3 w-20 rounded" />
                                    <SkeletonBox className="h-8 w-16 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Bottom Section: History & Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Recent Attendance */}
            <div className="xl:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <SkeletonBox className="h-8 w-48 rounded mb-8" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50">
                            <SkeletonBox className="h-5 w-20 rounded" />
                            <SkeletonBox className="h-5 w-24 rounded" />
                            <SkeletonBox className="h-5 w-24 rounded" />
                            <SkeletonBox className="h-5 w-20 rounded" />
                            <SkeletonBox className="h-6 w-24 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Announcements */}
            <div className="xl:col-span-4">
                <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100 h-full">
                    <div className="flex items-center justify-between mb-8">
                        <SkeletonBox className="h-6 w-32 rounded" />
                        <SkeletonBox className="w-5 h-5 rounded" />
                    </div>
                    <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <SkeletonBox className="h-3 w-24 rounded" />
                                <SkeletonBox className="h-5 w-full rounded" />
                                <SkeletonBox className="h-4 w-3/4 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <style jsx global>{`
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      .animate-shimmer {
        animation: shimmer 2s ease-in-out infinite;
      }
    `}</style>
    </div>
);

/**
 * Generic Table Skeleton
 * Reusable for various table layouts
 */
export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {[...Array(columns)].map((_, i) => (
                    <SkeletonBox key={i} className="h-4 w-full rounded" />
                ))}
            </div>
        </div>
        <div className="divide-y divide-slate-50">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="p-4">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {[...Array(columns)].map((_, j) => (
                            <SkeletonBox key={j} className="h-6 w-full rounded" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/**
 * Pharmacy Table Skeleton
 * Tailored for Pharmacy Products and Transactions tables
 */
export const PharmacyTableSkeleton = ({ rows = 10 }: { rows?: number }) => (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
            <div className="grid grid-cols-8 gap-4">
                {[...Array(8)].map((_, i) => (
                    <SkeletonBox key={i} className="h-4 w-20 rounded" />
                ))}
            </div>
        </div>
        <div className="divide-y dark:divide-gray-800">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="p-6">
                    <div className="grid grid-cols-8 gap-4 items-center">
                        <div className="col-span-1 space-y-2">
                            <SkeletonBox className="h-4 w-24 rounded" />
                            <SkeletonBox className="h-3 w-16 rounded" />
                        </div>
                        <SkeletonBox className="col-span-2 h-4 w-32 rounded" />
                        <SkeletonBox className="col-span-1 h-4 w-12 mx-auto rounded" />
                        <SkeletonBox className="col-span-1 h-4 w-16 mx-auto rounded" />
                        <SkeletonBox className="col-span-1 h-4 w-16 ml-auto rounded" />
                        <SkeletonBox className="col-span-1 h-4 w-20 mx-auto rounded-full" />
                        <SkeletonBox className="col-span-1 h-8 w-8 ml-auto rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/**
 * Pharmacy Dashboard Skeleton
 * Matches the layout of app/pharmacy/dashboard/page.tsx
 */
export const PharmacyDashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-4">
                <SkeletonBox className="h-10 w-64 rounded-xl" />
                <SkeletonBox className="h-4 w-48 rounded" />
            </div>
            <div className="flex items-center gap-4">
                <SkeletonBox className="h-12 w-80 rounded-2xl" />
                <SkeletonBox className="h-12 w-40 rounded-2xl" />
                <SkeletonBox className="h-12 w-12 rounded-2xl" />
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                        <SkeletonBox className="h-4 w-32 rounded" />
                        <SkeletonBox className="h-10 w-10 rounded-xl" />
                    </div>
                    <SkeletonBox className="h-10 w-40 rounded-xl" />
                    <SkeletonBox className="h-3 w-24 rounded" />
                </div>
            ))}
        </div>

        {/* Action Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-5 text-left">
                        <SkeletonBox className="h-14 w-14 rounded-2xl" />
                        <div className="space-y-2">
                            <SkeletonBox className="h-6 w-32 rounded" />
                            <SkeletonBox className="h-3 w-24 rounded" />
                        </div>
                    </div>
                    <SkeletonBox className="h-6 w-6 rounded" />
                </div>
            ))}
        </div>

        {/* Bottom Detail Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-8 space-y-6">
                <SkeletonBox className="h-6 w-48 rounded" />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-700/30 rounded-3xl border border-gray-100/50">
                        <div className="space-y-2">
                            <SkeletonBox className="h-3 w-24 rounded" />
                            <SkeletonBox className="h-2 w-32 rounded" />
                        </div>
                        <SkeletonBox className="h-6 w-24 rounded" />
                    </div>
                ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-8">
                <SkeletonBox className="h-6 w-48 rounded mb-8" />
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-5 bg-gray-50/50 dark:bg-gray-700/30 rounded-2xl border border-gray-100/50 space-y-2">
                            <SkeletonBox className="h-3 w-16 rounded" />
                            <SkeletonBox className="h-6 w-24 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

/**
 * Pharmacy Analytics Skeleton
 * Matches the layout of app/pharmacy/analytics/page.tsx
 */
export const PharmacyAnalyticsSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-4">
                <SkeletonBox className="h-10 w-72 rounded-xl" />
                <SkeletonBox className="h-4 w-64 rounded" />
            </div>
            <div className="flex items-center gap-4">
                <SkeletonBox className="h-12 w-64 rounded-2xl" />
                <SkeletonBox className="h-12 w-12 rounded-2xl" />
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex justify-between">
                        <div className="space-y-2">
                            <SkeletonBox className="h-3 w-20 rounded" />
                            <SkeletonBox className="h-8 w-32 rounded-xl" />
                        </div>
                        <SkeletonBox className="h-12 w-12 rounded-2xl" />
                    </div>
                    <SkeletonBox className="h-4 w-24 rounded" />
                </div>
            ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-4">
                        <SkeletonBox className="h-12 w-12 rounded-2xl" />
                        <div className="space-y-2">
                            <SkeletonBox className="h-4 w-48 rounded" />
                            <SkeletonBox className="h-2 w-32 rounded" />
                        </div>
                    </div>
                    <SkeletonBox className="h-[250px] w-full rounded-2xl" />
                </div>
            ))}
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                <SkeletonBox className="h-4 w-40 rounded" />
                <SkeletonBox className="h-[250px] w-full rounded-full" />
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                <SkeletonBox className="h-4 w-64 rounded" />
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <SkeletonBox className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2">
                                <SkeletonBox className="h-4 w-32 rounded" />
                                <SkeletonBox className="h-2 w-20 rounded" />
                            </div>
                        </div>
                        <SkeletonBox className="h-4 w-16 rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/**
 * Pharmacy Profile Skeleton
 * Matches the layout of app/pharmacy/profile/page.tsx
 */
export const PharmacyProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse mt-10">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
                <SkeletonBox className="h-10 w-72 rounded-xl" />
                <SkeletonBox className="h-4 w-64 rounded" />
            </div>
            <SkeletonBox className="h-12 w-48 rounded-2xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Branding Sidebar Skeleton */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-4xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center">
                    <SkeletonBox className="w-40 h-40 rounded-3xl mb-6" />
                    <SkeletonBox className="h-12 w-full rounded-xl mb-6" />
                    <SkeletonBox className="h-6 w-48 rounded" />
                    <SkeletonBox className="h-4 w-32 rounded mt-2" />
                </div>
                <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-4xl border border-blue-100/50 space-y-3">
                    <div className="flex gap-3">
                        <SkeletonBox className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <SkeletonBox className="h-4 w-24 rounded" />
                            <SkeletonBox className="h-2 w-32 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section Skeleton */}
            <div className="md:col-span-2 space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-4xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <SkeletonBox className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2">
                                <SkeletonBox className="h-4 w-32 rounded" />
                                <SkeletonBox className="h-2 w-24 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {[...Array(2)].map((_, j) => (
                                <div key={j} className="space-y-2">
                                    <SkeletonBox className="h-3 w-20 rounded" />
                                    <SkeletonBox className="h-12 w-full rounded-2xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
