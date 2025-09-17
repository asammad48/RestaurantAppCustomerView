import { useNotifications } from "@/hooks/use-notifications";
import { OrderNotificationContent, ReservationNotificationContent } from "@/lib/api-client";
import OrderNotificationModal from "./modals/order-notification-modal";
import ReservationNotificationModal from "./modals/reservation-notification-modal";

export default function NotificationModals() {
  const { selectedNotification, closeNotification, acknowledgeNotification } = useNotifications();

  if (!selectedNotification) return null;

  const handleAcknowledge = () => {
    if (!selectedNotification.isNotificationAcknowledged) {
      acknowledgeNotification(selectedNotification.id);
    }
  };

  if (selectedNotification.notificationType === 'Order') {
    return (
      <OrderNotificationModal
        isOpen={true}
        onClose={closeNotification}
        content={selectedNotification.parsedContent as OrderNotificationContent}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  if (selectedNotification.notificationType === 'Reservation') {
    return (
      <ReservationNotificationModal
        isOpen={true}
        onClose={closeNotification}
        content={selectedNotification.parsedContent as ReservationNotificationContent}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  return null;
}