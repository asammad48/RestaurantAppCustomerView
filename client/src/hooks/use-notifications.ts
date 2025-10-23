import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, Notification, OrderNotificationContent, ReservationNotificationContent } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore, ParsedNotification } from '@/lib/store';
import { getDeviceId } from '@/lib/device-id';

export function useNotifications() {
  const { isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use shared notification store
  const {
    selectedNotification,
    isNotificationTrayOpen,
    setNotificationTrayOpen,
    showNotification: storeShowNotification,
    closeNotification: storeCloseNotification,
    toggleNotificationTray: storeToggleNotificationTray
  } = useNotificationStore();

  // Query to fetch notifications (supports both authenticated and guest users)
  const { data: notificationsResponse, error, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (isAuthenticated && token) {
        return apiClient.getUserNotifications(token);
      } else {
        const deviceInfo = getDeviceId();
        return apiClient.getUserNotifications(undefined, deviceInfo);
      }
    },
    enabled: true,
    retry: false
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [error]);

  const notifications = notificationsResponse?.data || [];

  // Parse notification content and count unread with error handling
  const parsedNotifications: ParsedNotification[] = notifications.map(notification => {
    try {
      return {
        ...notification,
        parsedContent: JSON.parse(notification.notificationContent)
      };
    } catch (error) {
      console.error('Failed to parse notification content:', error, notification);
      // Return a safe fallback
      return {
        ...notification,
        parsedContent: {
          OrderId: 0,
          OrderNumber: 'N/A',
          PaymentStatus: 'Unknown',
          IsScreenshotNeeded: false,
          IsFeedbackNeeded: false,
          IsTipNeeded: false,
          Currency: 'USD'
        } as OrderNotificationContent
      };
    }
  }).filter(n => n.parsedContent); // Filter out any that failed to parse

  const unreadCount = parsedNotifications.filter(n => !n.isNotificationAcknowledged).length;

  // Function to show notification modal
  const showNotification = useCallback((notification: ParsedNotification) => {
    console.log('🔔 useNotifications: showNotification called with:', notification);
    console.log('🔔 Notification type:', notification.notificationType);
    console.log('🔔 Parsed content:', notification.parsedContent);
    storeShowNotification(notification);
  }, [storeShowNotification]);

  // Function to close notification modal
  const closeNotification = useCallback(() => {
    storeCloseNotification();
  }, [storeCloseNotification]);

  // Function to acknowledge notification with API call
  const acknowledgeNotification = useCallback(async (notificationId: number) => {
    if (!token || !isAuthenticated) {
      console.warn('Cannot acknowledge notification: No authentication token');
      return;
    }

    try {
      console.log('Acknowledging notification:', notificationId);
      await apiClient.acknowledgeNotification(token, [notificationId]);
      console.log('Notification acknowledged successfully:', notificationId);
      
      // Invalidate notifications query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge notification. Please try again.",
        variant: "destructive",
      });
    }
  }, [token, isAuthenticated, queryClient, toast]);

  // Function to toggle notification tray
  const toggleNotificationTray = useCallback(() => {
    storeToggleNotificationTray();
  }, [storeToggleNotificationTray]);

  // Listen for SignalR notifications pending events
  useEffect(() => {
    const handleNotificationsPending = (event: CustomEvent) => {
      console.log('🔔 Received notificationsPending event:', event.detail);
      if (event.detail?.IsNotificationPending) {
        console.log('🔔 Triggering notifications refresh from SignalR event');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    };

    // Add event listener
    window.addEventListener('notificationsPending', handleNotificationsPending as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('notificationsPending', handleNotificationsPending as EventListener);
    };
  }, [queryClient]);

  // Show toast for new unread notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const unreadNotifications = parsedNotifications.filter(n => !n.isNotificationAcknowledged);
      
      // Only show toast for the first unread notification to avoid spam
      if (unreadNotifications.length === 1) {
        const notification = unreadNotifications[0];
        const content = notification.parsedContent;
        
        if (notification.notificationType === 'Order') {
          const orderContent = content as OrderNotificationContent;
          toast({
            title: "Order Update",
            description: `Order ${orderContent.OrderNumber} - ${orderContent.PaymentStatus}`,
          });
        } else if (notification.notificationType === 'Reservation') {
          const reservationContent = content as ReservationNotificationContent;
          toast({
            title: "Reservation Update",
            description: `${reservationContent.ReservationName} - ${reservationContent.ReservationStatus}`,
          });
        }
      }
    }
  }, [notifications, toast]);

  return {
    notifications: parsedNotifications,
    unreadCount,
    selectedNotification,
    isNotificationTrayOpen,
    showNotification,
    closeNotification,
    acknowledgeNotification,
    toggleNotificationTray,
    setIsNotificationTrayOpen: setNotificationTrayOpen,
    isLoading,
    error
  };
}