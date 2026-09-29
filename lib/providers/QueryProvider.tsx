'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Force refetch on every mount
                        staleTime: 0,
                        // Keep unused data in cache for 10 minutes
                        gcTime: 10 * 60 * 1000,
                        // Refetch on window focus for fresh data
                        refetchOnWindowFocus: true,
                        // Retry failed requests once
                        retry: 1,
                        // Always refetch on mount
                        refetchOnMount: true,
                    },
                    mutations: {
                        // Retry failed mutations once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
