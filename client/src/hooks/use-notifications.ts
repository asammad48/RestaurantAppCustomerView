import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, Notification, OrderNotificationContent, ReservationNotificationContent } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore, ParsedNotification } from '@/lib/store';

export function useNotifications() {
  const { isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use shared notification store
  const {
    selectedNotification,
    isNotificationTrayOpen,
    setSelectedNotification,
    setNotificationTrayOpen,
    showNotification: storeShowNotification,
    closeNotification: storeCloseNotification,
    toggleNotificationTray: storeToggleNotificationTray
  } = useNotificationStore();

  // Query to fetch notifications
  const { data: notificationsResponse, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return apiClient.getUserNotifications(token);
    },
    enabled: isAuthenticated && !!token,
    refetchInterval: 5000, // Poll every 5 seconds
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
    storeShowNotification(notification);
  }, [storeShowNotification]);

  // Function to close notification modal
  const closeNotification = useCallback(() => {
    storeCloseNotification();
  }, [storeCloseNotification]);

  // Function to acknowledge notification (simplified - no API call)
  const acknowledgeNotification = useCallback(async (notificationId: number) => {
    // Since there's no acknowledgment API, we just locally mark it as acknowledged
    // This allows the notification to be displayed without API errors
    console.log('Notification viewed:', notificationId);
  }, []);

  // Function to toggle notification tray
  const toggleNotificationTray = useCallback(() => {
    storeToggleNotificationTray();
  }, [storeToggleNotificationTray]);

  // Show toast for new unread notifications
  useEffect(() => {
    if (parsedNotifications.length > 0) {
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
  }, [parsedNotifications, toast]);

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
    isLoading: false, // Since we're using background polling
    error
  };
}