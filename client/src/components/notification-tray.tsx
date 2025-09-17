import { Bell, Clock, Package, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { ParsedNotification } from "@/lib/store";
import { OrderNotificationContent, ReservationNotificationContent } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "@/lib/store";

interface NotificationItemProps {
  notification: ParsedNotification;
  onNotificationClick: (notification: ParsedNotification) => void;
  onAcknowledge: (id: number) => void;
}

function NotificationItem({ notification, onNotificationClick, onAcknowledge }: NotificationItemProps) {
  const { id, notificationType, createdDate, isNotificationAcknowledged, parsedContent } = notification;
  
  const handleClick = () => {
    console.log('Notification clicked:', notification);
    console.log('Parsed content:', parsedContent);
    onNotificationClick(notification);
    if (!isNotificationAcknowledged) {
      onAcknowledge(id);
    }
  };

  const getNotificationIcon = () => {
    switch (notificationType) {
      case 'Order':
        return <Package className="w-4 h-4" />;
      case 'Reservation':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationTitle = () => {
    if (notificationType === 'Order') {
      const content = parsedContent as OrderNotificationContent;
      return `Order ${content.OrderNumber}`;
    } else if (notificationType === 'Reservation') {
      const content = parsedContent as ReservationNotificationContent;
      return `Reservation Update`;
    }
    return 'Notification';
  };

  const getNotificationDescription = () => {
    if (notificationType === 'Order') {
      const content = parsedContent as OrderNotificationContent;
      return `Payment Status: ${content.PaymentStatus}`;
    } else if (notificationType === 'Reservation') {
      const content = parsedContent as ReservationNotificationContent;
      return `${content.ReservationName} - ${content.ReservationStatus}`;
    }
    return 'Click to view details';
  };

  return (
    <DropdownMenuItem 
      className={`flex items-start space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${
        !isNotificationAcknowledged ? 'bg-blue-50 border-l-2 border-blue-500' : ''
      }`}
      onClick={handleClick}
      data-testid={`notification-item-${id}`}
    >
      <div className={`flex-shrink-0 mt-1 ${
        !isNotificationAcknowledged ? 'text-blue-600' : 'text-gray-400'
      }`}>
        {getNotificationIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium truncate ${
            !isNotificationAcknowledged ? 'text-gray-900' : 'text-gray-600'
          }`}>
            {getNotificationTitle()}
          </p>
          {!isNotificationAcknowledged && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              New
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {getNotificationDescription()}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatDistanceToNow(new Date(createdDate), { addSuffix: true })}
        </p>
      </div>
    </DropdownMenuItem>
  );
}

export default function NotificationTray() {
  const {
    notifications,
    unreadCount,
    isNotificationTrayOpen,
    toggleNotificationTray,
    setIsNotificationTrayOpen,
    showNotification,
    acknowledgeNotification
  } = useNotifications();

  const { showNotification: storeShowNotification } = useNotificationStore();

  // Test function to create sample notifications
  const createTestNotifications = () => {
    const testOrderNotification: ParsedNotification = {
      id: 1,
      notificationContent: JSON.stringify({
        OrderId: 123,
        OrderNumber: "ORD-2025-001",
        PaymentStatus: "Paid",
        IsScreenshotNeeded: true,
        IsFeedbackNeeded: true,
        IsTipNeeded: true,
        Currency: "USD"
      }),
      notificationType: 'Order',
      createdDate: new Date().toISOString(),
      isNotificationAcknowledged: false,
      parsedContent: {
        OrderId: 123,
        OrderNumber: "ORD-2025-001",
        PaymentStatus: "Paid",
        IsScreenshotNeeded: true,
        IsFeedbackNeeded: true,
        IsTipNeeded: true,
        Currency: "USD"
      }
    };

    const testReservationNotification: ParsedNotification = {
      id: 2,
      notificationContent: JSON.stringify({
        ReservationId: 456,
        ReservationName: "John Smith",
        ReservationStatus: "Confirmed"
      }),
      notificationType: 'Reservation',
      createdDate: new Date().toISOString(),
      isNotificationAcknowledged: false,
      parsedContent: {
        ReservationId: 456,
        ReservationName: "John Smith",
        ReservationStatus: "Confirmed"
      }
    };

    console.log('Creating test notifications...');
    // Test the modal directly
    storeShowNotification(testOrderNotification);
  };

  return (
    <DropdownMenu open={isNotificationTrayOpen} onOpenChange={setIsNotificationTrayOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative p-2 hover:bg-gray-100"
          onClick={toggleNotificationTray}
          data-testid="button-notification-toggle"
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center text-xs rounded-full font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onNotificationClick={showNotification}
                  onAcknowledge={acknowledgeNotification}
                />
                {index < notifications.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <div className="px-3 py-2 space-y-2">
          {notifications.length > 0 && (
            <Button variant="ghost" className="w-full text-xs" size="sm">
              View All Notifications
            </Button>
          )}
          <Button 
            variant="outline" 
            className="w-full text-xs" 
            size="sm"
            onClick={createTestNotifications}
            data-testid="button-test-notification"
          >
            Test Order Modal
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}