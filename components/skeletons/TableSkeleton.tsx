import React from 'react';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

/**
 * Skeleton component for table loading states
 * Improves perceived performance and LCP scores
 */
export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
    return (
        <div className="animate-pulse">
            {/* Table Header Skeleton */}
            <div className="bg-gray-50/50 dark:bg-gray-900/50 border-b dark:border-gray-700 p-6 flex gap-6">
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`header-${i}`}
                        className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1"
                    />
                ))}
            </div>

            {/* Table Body Skeleton */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="border-b dark:border-gray-700/50 p-6 flex gap-6 items-center"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="flex-1"
                        >
                            {colIndex === 0 ? (
                                // First column - badge style
                                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                            ) : colIndex === columns - 1 ? (
                                // Last column - button style
                                <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl ml-auto" />
                            ) : (
                                // Other columns - text style
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Skeleton for card-based layouts
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={`card-${i}`}
                    className="bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 animate-pulse"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Skeleton for list items
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
    return (
        <div className="space-y-4 animate-pulse">
            {Array.from({ length: items }).map((_, i) => (
                <div
                    key={`list-${i}`}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
                >
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                    <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
            ))}
        </div>
    );
}
