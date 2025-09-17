import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, Notification, OrderNotificationContent, ReservationNotificationContent } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

export interface ParsedNotification extends Notification {
  parsedContent: OrderNotificationContent | ReservationNotificationContent;
}

export function useNotifications() {
  const { isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState<ParsedNotification | null>(null);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);

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

  // Parse notification content and count unread
  const parsedNotifications: ParsedNotification[] = notifications.map(notification => ({
    ...notification,
    parsedContent: JSON.parse(notification.notificationContent)
  }));

  const unreadCount = parsedNotifications.filter(n => !n.isNotificationAcknowledged).length;

  // Function to show notification modal
  const showNotification = useCallback((notification: ParsedNotification) => {
    setSelectedNotification(notification);
  }, []);

  // Function to close notification modal
  const closeNotification = useCallback(() => {
    setSelectedNotification(null);
  }, []);

  // Function to acknowledge notification
  const acknowledgeNotification = useCallback(async (notificationId: number) => {
    if (!token) return;
    
    try {
      await apiClient.acknowledgeNotification(token, notificationId);
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to acknowledge notification"
      });
    }
  }, [token, queryClient, toast]);

  // Function to toggle notification tray
  const toggleNotificationTray = useCallback(() => {
    setIsNotificationTrayOpen(prev => !prev);
  }, []);

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
    setIsNotificationTrayOpen,
    isLoading: false, // Since we're using background polling
    error
  };
}