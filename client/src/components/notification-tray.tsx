import { Bell, Package, Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore, ParsedNotification } from "@/lib/store";
import {
  OrderNotificationContent,
  ReservationNotificationContent,
} from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/use-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface NotificationItemProps {
  notification: ParsedNotification;
  onNotificationClick: (notification: ParsedNotification) => void;
  isDropdown?: boolean; // Flag to determine if it's for dropdown or modal
}

function NotificationItem({
  notification,
  onNotificationClick,
  isDropdown = true,
}: NotificationItemProps) {
  const {
    id,
    notificationType,
    createdDate,
    isNotificationAcknowledged,
    parsedContent,
  } = notification;

  const handleClick = () => {
    console.log(`Notification clicked: ${JSON.stringify(notification)}`);
    onNotificationClick(notification);
  };

  const getNotificationIcon = () => {
    switch (notificationType) {
      case "Order":
        return <Package className="w-4 h-4" />;
      case "Reservation":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationTitle = () => {
    if (notificationType === "Order") {
      const content = parsedContent as OrderNotificationContent;
      return `Order ${content.OrderNumber}`;
    } else if (notificationType === "Reservation") {
      const content = parsedContent as ReservationNotificationContent;
      return content.ReservationName;
    }
    return "Notification";
  };

  const getNotificationDescription = () => {
    if (notificationType === "Order") {
      const content = parsedContent as OrderNotificationContent;
      return `Status: ${content.PaymentStatus}`;
    } else if (notificationType === "Reservation") {
      const content = parsedContent as ReservationNotificationContent;
      return `Status: ${content.ReservationStatus}`;
    }
    return "Click to view details";
  };

  const itemClasses = `flex items-start space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${
    !isNotificationAcknowledged
      ? "bg-blue-50 border-l-2 border-blue-500"
      : ""
  }`;

  const content = (
    <>
      <div
        className={`flex-shrink-0 mt-1 ${
          !isNotificationAcknowledged ? "text-blue-600" : "text-gray-400"
        }`}
      >
        {getNotificationIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={`text-sm font-medium truncate ${
              !isNotificationAcknowledged ? "text-gray-900" : "text-gray-600"
            }`}
          >
            {getNotificationTitle()}
          </p>
          {!isNotificationAcknowledged && (
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-100 text-blue-800"
            >
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
    </>
  );

  if (isDropdown) {
    return (
      <DropdownMenuItem
        className={itemClasses}
        onClick={handleClick}
        data-testid={`notification-item-${id}`}
      >
        {content}
      </DropdownMenuItem>
    );
  }

  // For modal (mobile), use a regular div
  return (
    <div
      className={itemClasses}
      onClick={handleClick}
      data-testid={`notification-item-${id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {content}
    </div>
  );
}

export default function NotificationTray() {
  // Use the notifications hook to fetch data from API
  const {
    notifications,
    unreadCount,
    isNotificationTrayOpen,
    toggleNotificationTray,
    showNotification,
    isLoading,
    error,
  } = useNotifications();

  const { clearAllNotifications, addNotification, setNotificationTrayOpen } =
    useNotificationStore();

  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Separate handlers for mobile and desktop
  const handleMobileToggle = () => {
    if (!isNotificationTrayOpen) {
      // Tray is closed, about to open - refresh notifications
      queryClient.refetchQueries({ queryKey: ['notifications'] });
    }
    toggleNotificationTray();
  };

  const handleDesktopToggle = () => {
    if (!isNotificationTrayOpen) {
      // Tray is closed, about to open - refresh notifications
      queryClient.refetchQueries({ queryKey: ['notifications'] });
      setNotificationTrayOpen(true);
    }
  };

  // Test function to create sample notifications and add them to the store
  const createTestNotifications = () => {
    console.log("Creating test notifications...");

    // Create test order notification
    const testOrderNotification: ParsedNotification = {
      id: Date.now(), // Use timestamp as unique ID
      notificationContent: JSON.stringify({
        OrderId: 123,
        OrderNumber: "ORD-2025-001",
        PaymentStatus: "Paid",
        IsScreenshotNeeded: true,
        IsFeedbackNeeded: true,
        IsTipNeeded: true,
        Currency: "USD",
      }),
      notificationType: "Order",
      createdDate: new Date().toISOString(),
      isNotificationAcknowledged: false,
      parsedContent: {
        OrderId: 123,
        OrderNumber: "ORD-2025-001",
        PaymentStatus: "Paid",
        IsScreenshotNeeded: true,
        IsFeedbackNeeded: true,
        IsTipNeeded: true,
        Currency: "USD",
      },
    };

    // Create test reservation notification
    const testReservationNotification: ParsedNotification = {
      id: Date.now() + 1, // Use timestamp + 1 as unique ID
      notificationContent: JSON.stringify({
        ReservationId: 456,
        ReservationName: "John Smith",
        ReservationStatus: "Confirmed",
      }),
      notificationType: "Reservation",
      createdDate: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      isNotificationAcknowledged: false,
      parsedContent: {
        ReservationId: 456,
        ReservationName: "John Smith",
        ReservationStatus: "Confirmed",
      },
    };

    // Add notifications to the store
    addNotification(testOrderNotification);
    addNotification(testReservationNotification);

    console.log("Test notifications added to store");
  };

  // Create notification content component
  const NotificationContent = ({ isDropdown = true }: { isDropdown?: boolean }) => (
    <>
      {isLoading ? (
        <div className="px-3 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="px-3 py-8 text-center">
          <Bell className="w-8 h-8 text-red-300 mx-auto mb-2" />
          <p className="text-sm text-red-500">Failed to load notifications</p>
          <p className="text-xs text-gray-500 mt-1">Please try again later</p>
        </div>
      ) : notifications.length === 0 ? (
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
                isDropdown={isDropdown}
              />
              {index < notifications.length - 1 && (
                isDropdown ? (
                  <DropdownMenuSeparator />
                ) : (
                  <div className="border-b border-gray-200 mx-3" />
                )
              )}
            </div>
          ))}
        </ScrollArea>
      )}

      {notifications.length > 0 && (
        <>
          {isDropdown ? (
            <DropdownMenuSeparator />
          ) : (
            <div className="border-b border-gray-200 mx-3" />
          )}
          <div className="px-3 py-2">
            <Button
              variant="outline"
              className="w-full text-xs"
              size="sm"
              onClick={clearAllNotifications}
              data-testid="button-clear-notifications"
            >
              Clear All Notifications
            </Button>
          </div>
        </>
      )}
    </>
  );

  if (isMobile) {
    // Mobile: Use centered modal
    return (
      <>
        <Button
          variant="ghost"
          className="relative p-2 hover:bg-gray-100"
          onClick={handleMobileToggle}
          data-testid="button-notification-toggle"
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center text-xs rounded-full font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        <Dialog open={isNotificationTrayOpen} onOpenChange={setNotificationTrayOpen}>
          <DialogContent className="w-[90vw] max-w-md max-h-[80vh] p-0">
            <DialogHeader className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-semibold">Notifications</DialogTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {unreadCount} new
                    </Badge>
                  )}
                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      data-testid="button-close-notification-modal"
                      aria-label="Close notifications"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <NotificationContent isDropdown={false} />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Use dropdown menu
  return (
    <DropdownMenu
      open={isNotificationTrayOpen}
      onOpenChange={setNotificationTrayOpen}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative p-2 hover:bg-gray-100"
          onClick={handleDesktopToggle}
          data-testid="button-notification-toggle"
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[20px] h-5 flex items-center justify-center text-xs rounded-full font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 max-h-96">
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
        <NotificationContent isDropdown={true} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
