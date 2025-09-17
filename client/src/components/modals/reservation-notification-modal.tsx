import { Calendar, User, AlertCircle, CheckCircle, XCircle } from "lucide-react";
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
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Calendar className="w-6 h-6 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
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
      <DialogContent className="sm:max-w-md" data-testid="modal-reservation-notification">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Reservation Update</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon(content.ReservationStatus)}
            <div className="text-center">
              <Badge className={`${getStatusColor(content.ReservationStatus)} text-sm px-3 py-1`}>
                {content.ReservationStatus}
              </Badge>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Reservation Name</p>
                <p className="font-semibold" data-testid="text-reservation-name">
                  {content.ReservationName}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Reservation ID</p>
                <p className="font-semibold" data-testid="text-reservation-id">
                  #{content.ReservationId}
                </p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              {content.ReservationStatus === 'Confirmed' && 
                `Your reservation has been confirmed! We look forward to seeing you.`}
              {content.ReservationStatus === 'Rejected' && 
                `Sorry, your reservation couldn't be confirmed. Please contact us for alternative options.`}
              {content.ReservationStatus === 'Pending' && 
                `Your reservation is being reviewed. We'll notify you once it's confirmed.`}
              {!['Confirmed', 'Rejected', 'Pending'].includes(content.ReservationStatus) && 
                `Your reservation status has been updated to ${content.ReservationStatus}.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleClose}
            className="w-full"
            data-testid="button-close-reservation-notification"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}