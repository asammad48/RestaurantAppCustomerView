import { HubConnectionBuilder, HubConnection, HubConnectionState, HttpTransportType } from '@microsoft/signalr';
import { AuthService } from './auth-service';
import { toast } from '@/hooks/use-toast';
import { config } from '@/lib/config';
import { pushNotificationService } from './push-notification-service';

export interface OrderStatusUpdateEvent {
  orderId: number;
  orderNumber: string;
  status: string;
}

export interface NotificationsPendingEvent {
  IsNotificationPending: boolean;
}

export class SignalRService {
  private connection: HubConnection | null = null;
  private readonly hubUrl: string = config.signalRHubUrl;

  constructor() {
    this.connection = null;
  }

  // Initialize and start connection with authorization headers
  async startConnection(token: string): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      console.log('SignalR: Already connected');
      return;
    }

    try {
      // Create new connection with authorization header
      this.connection = new HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          accessTokenFactory: () => token,
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry intervals in milliseconds
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start the connection
      await this.connection.start();
      console.log('SignalR: Connected successfully to orderHub');
      
      // Show connection success toast
      toast({
        title: "Real-time updates enabled",
        description: "You'll receive live order status updates",
        duration: 3000,
      });

    } catch (error) {
      console.error('SignalR: Failed to start connection:', error);
      toast({
        title: "Connection failed",
        description: "Unable to connect to real-time updates",
        variant: "destructive",
        duration: 5000,
      });
      throw error;
    }
  }

  // Stop the connection
  async stopConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR: Connection stopped');
      } catch (error) {
        console.error('SignalR: Error stopping connection:', error);
      } finally {
        this.connection = null;
      }
    }
  }

  // Set up event handlers for SignalR events
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Listen for OrderStatusUpdate event
    this.connection.on('OrderStatusUpdate', (data: OrderStatusUpdateEvent) => {
      console.log('SignalR: Received OrderStatusUpdate:', data);
      this.handleOrderStatusUpdate(data);
    });

    // Listen for NotificationsPending event
    this.connection.on('NotificationsPending', (data: NotificationsPendingEvent) => {
      console.log('SignalR: Received NotificationsPending:', data);
      this.handleNotificationsPending(data);
    });

    // Handle connection events
    this.connection.onreconnecting((error) => {
      console.warn('SignalR: Connection lost, attempting to reconnect...', error);
      toast({
        title: "Reconnecting...",
        description: "Attempting to restore real-time updates",
        duration: 3000,
      });
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR: Reconnected successfully', connectionId);
      toast({
        title: "Reconnected",
        description: "Real-time updates restored",
        duration: 3000,
      });
    });

    this.connection.onclose((error) => {
      console.log('SignalR: Connection closed', error);
      if (error) {
        toast({
          title: "Connection lost",
          description: "Real-time updates are unavailable",
          variant: "destructive",
          duration: 5000,
        });
      }
    });
  }

  // Handle order status update events
  private handleOrderStatusUpdate(data: OrderStatusUpdateEvent): void {
    const { orderId, orderNumber, status } = data;
    
    // Map status to user-friendly messages
    const statusMessages: Record<string, { title: string; description: string; variant?: "default" | "destructive" }> = {
      'Confirmed': {
        title: '✅ Order Confirmed',
        description: `Order #${orderNumber} has been confirmed and is being prepared.`,
      },
      'Preparing': {
        title: '👨‍🍳 Order in Preparation',
        description: `Order #${orderNumber} is being prepared by our chefs.`,
      },
      'Ready': {
        title: '🍽️ Order Ready',
        description: `Order #${orderNumber} is ready for pickup or delivery.`,
      },
      'Delivered': {
        title: '🚚 Order Delivered',
        description: `Order #${orderNumber} has been delivered successfully.`,
      },
      'Completed': {
        title: '✨ Order Completed',
        description: `Order #${orderNumber} has been completed. Thank you for your order!`,
      },
      'Cancelled': {
        title: '❌ Order Cancelled',
        description: `Order #${orderNumber} has been cancelled.`,
        variant: 'destructive' as const,
      },
    };

    const statusInfo = statusMessages[status] || {
      title: '📋 Order Status Update',
      description: `Order #${orderNumber} status: ${status}`,
    };

    // Show toast notification
    toast({
      title: statusInfo.title,
      description: statusInfo.description,
      variant: statusInfo.variant || 'default',
      duration: 8000, // Show for 8 seconds for order updates
    });

    // Show browser push notification if permission granted
    pushNotificationService.showOrderNotification(orderNumber, status).catch(err => {
      console.log('Push notification failed:', err);
    });

    // Fire a custom event for other components to listen to if needed
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
      detail: { orderId, orderNumber, status }
    }));
  }

  // Handle notifications pending events
  private handleNotificationsPending(data: NotificationsPendingEvent): void {
    console.log('SignalR: Handling NotificationsPending event:', data);
    
    // Check if there are pending notifications
    if (data.IsNotificationPending === true) {
      console.log('SignalR: Notifications pending - triggering GetUserNotification call');
      
      // Fire a custom event that the notifications hook can listen to
      window.dispatchEvent(new CustomEvent('notificationsPending', {
        detail: { IsNotificationPending: true }
      }));
    }
  }

  // Get current connection state
  getConnectionState(): HubConnectionState | null {
    return this.connection?.state || null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  // Send a message to the hub (if needed for future features)
  async sendMessage(methodName: string, ...args: any[]): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke(methodName, ...args);
      } catch (error) {
        console.error(`SignalR: Failed to send message ${methodName}:`, error);
        throw error;
      }
    } else {
      throw new Error('SignalR connection is not established');
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();