import { useNotificationStore } from "@/lib/store";
import { useNotifications } from "@/hooks/use-notifications";
import OrderNotificationModal from "@/components/modals/order-notification-modal";
import ReservationNotificationModal from "@/components/modals/reservation-notification-modal";
import { OrderNotificationContent, ReservationNotificationContent } from "@/lib/api-client";

/**
 * NotificationModals component manages all notification modal instances.
 * It subscribes to the notification store and renders the appropriate modal
 * based on the active notification type.
 */
export default function NotificationModals() {
  const {
    selectedNotification,
    closeNotification
  } = useNotificationStore();
  
  // Use the API-enabled acknowledgement from the hook
  const { acknowledgeNotification } = useNotifications();

  console.log('📱 NotificationModals render - selectedNotification:', selectedNotification);
  
  // Debug: Show more details about the selected notification
  if (selectedNotification) {
    console.log('📱 Modal should render for notification type:', selectedNotification.notificationType);
    console.log('📱 Modal content:', selectedNotification.parsedContent);
  }

  // Handle acknowledgment when a notification is closed
  const handleAcknowledge = () => {
    if (selectedNotification) {
      acknowledgeNotification(selectedNotification.id);
    }
  };

  const handleClose = () => {
    closeNotification();
  };

  // If no selected notification, render nothing
  if (!selectedNotification) {
    return null;
  }

  // Render order notification modal
  if (selectedNotification.notificationType === 'Order') {
    console.log('📱 Rendering OrderNotificationModal with content:', selectedNotification.parsedContent);
    const content = selectedNotification.parsedContent as OrderNotificationContent;
    return (
      <OrderNotificationModal
        isOpen={true}
        onClose={handleClose}
        content={content}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  // Render reservation notification modal
  if (selectedNotification.notificationType === 'Reservation') {
    console.log('📱 Rendering ReservationNotificationModal with content:', selectedNotification.parsedContent);
    const content = selectedNotification.parsedContent as ReservationNotificationContent;
    return (
      <ReservationNotificationModal
        isOpen={true}
        onClose={handleClose}
        content={content}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  // Fallback for unknown notification types
  return null;
}