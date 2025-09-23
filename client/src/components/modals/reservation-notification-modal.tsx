import { Calendar, User, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReservationNotificationContent } from "@/lib/api-client";

interface ReservationNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ReservationNotificationContent;
  onAcknowledge?: () => void;
}

export default function ReservationNotificationModal({
  isOpen,
  onClose,
  content,
  onAcknowledge
}: ReservationNotificationModalProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'modified':
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <Calendar className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'modified':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return "Great news! Your reservation has been confirmed. We look forward to serving you.";
      case 'rejected':
        return "Unfortunately, your reservation could not be confirmed. Please contact us to discuss alternative options.";
      case 'cancelled':
        return "Your reservation has been cancelled as requested. We hope to serve you again soon.";
      case 'pending':
        return "Your reservation is currently being reviewed. We'll notify you once it's confirmed.";
      case 'modified':
        return "Your reservation details have been updated. Please review the changes below.";
      default:
        return `Your reservation status has been updated to ${status}.`;
    }
  };

  const handleClose = () => {
    if (onAcknowledge) {
      onAcknowledge();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" data-testid="modal-reservation-notification">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Reservation Update</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-center space-x-3 p-6 bg-gray-50 rounded-lg">
            <div className="flex flex-col items-center space-y-3">
              {getStatusIcon(content.ReservationStatus)}
              <Badge 
                className={`${getStatusColor(content.ReservationStatus)} text-sm px-4 py-2 font-semibold`}
                data-testid="badge-reservation-status"
              >
                {content.ReservationStatus}
              </Badge>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <div className="p-4 bg-white border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Reservation Name</p>
                  <p className="text-lg font-bold text-gray-900" data-testid="text-reservation-name">
                    {content.ReservationName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Reservation ID</p>
                  <p className="text-sm font-semibold text-gray-700" data-testid="text-reservation-id">
                    #{content.ReservationId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-700 text-center leading-relaxed">
              {getStatusMessage(content.ReservationStatus)}
            </p>
          </div>

          {/* Additional Actions for specific statuses */}
          {content.ReservationStatus.toLowerCase() === 'rejected' && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-700 text-center">
                Need help? Contact us at (555) 123-4567 or email reservations@restaurant.com
              </p>
            </div>
          )}

          {content.ReservationStatus.toLowerCase() === 'confirmed' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 text-center">
                Please arrive 15 minutes early. Bring a valid ID for verification.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4 border-t">
          <Button 
            onClick={handleClose}
            className="w-full"
            data-testid="button-close-reservation-notification"
          >
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}