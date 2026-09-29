import { queryClient } from './queryClient';
import { QueryKey } from '@tanstack/react-query';

/**
 * Prefetch utilities for optimizing data loading
 * Use these to load data before it's needed (e.g., on hover, on route change)
 */

/**
 * Prefetch the next page of paginated data
 * Call this when user is viewing current page to load next page in background
 */
export const prefetchNextPage = async (
    queryKey: QueryKey,
    fetchFn: () => Promise<unknown>,
    currentPage: number,
    totalPages: number
) => {
    if (currentPage < totalPages && Array.isArray(queryKey)) {
        const lastPart = queryKey[queryKey.length - 1];
        const nextPageKey = [
            ...queryKey.slice(0, -1),
            typeof lastPart === 'object' ? { ...lastPart, page: currentPage + 1 } : lastPart
        ];
        await queryClient.prefetchQuery({
            queryKey: nextPageKey,
            queryFn: fetchFn,
        });
    }
};

/**
 * Prefetch related data (e.g., patient details when viewing order)
 */
export const prefetchRelatedData = async (
    queryKey: QueryKey,
    fetchFn: () => Promise<unknown>
) => {
    await queryClient.prefetchQuery({
        queryKey,
        queryFn: fetchFn,
    });
};

/**
 * Invalidate all queries matching a pattern
 * Use this after mutations to refresh data
 */
export const invalidateQueries = async (queryKey: QueryKey) => {
    await queryClient.invalidateQueries({ queryKey });
};

/**
 * Set query data manually (for optimistic updates)
 */
export const setQueryData = <T>(queryKey: QueryKey, updater: T | ((old: T | undefined) => T)) => {
    queryClient.setQueryData(queryKey, updater);
};
