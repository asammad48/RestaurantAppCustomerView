// Push Notification Service for Chrome Browser
export class PushNotificationService {
  private static instance: PushNotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Request notification permission from the user
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Notification permission:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Check if notifications are supported and permitted
  isSupported(): boolean {
    return 'Notification' in window;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  // Show a browser notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon.png',
        badge: '/badge.png',
        requireInteraction: false,
        ...options,
      });

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // If there's a URL in the data, navigate to it
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Show order status update notification
  async showOrderNotification(orderNumber: string, status: string): Promise<void> {
    const statusEmojis: Record<string, string> = {
      'Confirmed': '✅',
      'Preparing': '👨‍🍳',
      'Ready': '🍽️',
      'Delivered': '🚚',
      'Completed': '✨',
      'Cancelled': '❌',
    };

    const emoji = statusEmojis[status] || '📋';
    const title = `${emoji} Order ${status}`;
    const body = `Order #${orderNumber} has been ${status.toLowerCase()}`;

    await this.showNotification(title, {
      body,
      tag: `order-${orderNumber}`,
      data: {
        url: '/order-history',
        orderNumber,
        status,
      },
    });
  }

  // Request permission on page load (non-intrusive)
  async initializeOnLoad(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    // Only request if not already decided
    if (this.permission === 'default') {
      // Wait a bit before asking to avoid annoying the user immediately
      setTimeout(async () => {
        await this.requestPermission();
      }, 5000); // Wait 5 seconds after page load
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
