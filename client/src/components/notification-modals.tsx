import { useNotifications } from "@/hooks/use-notifications";
import { OrderNotificationContent, ReservationNotificationContent } from "@/lib/api-client";
import { ParsedNotification } from "@/lib/store";
import OrderNotificationModal from "./modals/order-notification-modal";
import ReservationNotificationModal from "./modals/reservation-notification-modal";

export default function NotificationModals() {
  const { selectedNotification, closeNotification } = useNotifications();

  console.log('NotificationModals - selectedNotification:', selectedNotification);

  if (!selectedNotification) return null;

  if (selectedNotification.notificationType === 'Order') {
    return (
      <OrderNotificationModal
        isOpen={true}
        onClose={closeNotification}
        content={selectedNotification.parsedContent as OrderNotificationContent}
      />
    );
  }

  if (selectedNotification.notificationType === 'Reservation') {
    return (
      <ReservationNotificationModal
        isOpen={true}
        onClose={closeNotification}
        content={selectedNotification.parsedContent as ReservationNotificationContent}
      />
    );
  }

  return null;
}