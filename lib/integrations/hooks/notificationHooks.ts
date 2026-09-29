import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';

export const notificationKeys = {
    all: ['notifications'] as const,
    list: () => [...notificationKeys.all, 'list'] as const,
};

export const useNotifications = () => {
    return useQuery({
        queryKey: notificationKeys.list(),
        queryFn: () => notificationService.getNotifications(),
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000,
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: notificationService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
        },
    });
};
