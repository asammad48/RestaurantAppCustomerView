import { useState } from "react";
import { Package, DollarSign, Camera, Star, MessageCircle, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { OrderNotificationContent } from "@/lib/api-client";

interface OrderNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: OrderNotificationContent;
  onAcknowledge?: () => void;
}

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

function StarRating({ rating, onRatingChange }: StarRatingProps) {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className={`p-1 rounded ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          } hover:text-yellow-400 transition-colors`}
          data-testid={`star-rating-${star}`}
        >
          <Star className="w-6 h-6 fill-current" />
        </button>
      ))}
    </div>
  );
}

export default function OrderNotificationModal({
  isOpen,
  onClose,
  content,
  onAcknowledge
}: OrderNotificationModalProps) {
  const [tipAmount, setTipAmount] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Here you would normally submit the data to your API
    // For now, we'll just simulate a submission
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      console.log('Submitting order response:', {
        tipAmount: content.IsTipNeeded ? tipAmount : null,
        screenshot: content.IsScreenshotNeeded ? screenshot : null,
        feedback: content.IsFeedbackNeeded ? feedback : null,
        rating: content.IsFeedbackNeeded ? rating : null
      });
      
      if (onAcknowledge) {
        onAcknowledge();
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit order response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onAcknowledge) {
      onAcknowledge();
    }
    onClose();
  };

  const isFormValid = () => {
    if (content.IsTipNeeded && !tipAmount.trim()) return false;
    if (content.IsScreenshotNeeded && !screenshot) return false;
    if (content.IsFeedbackNeeded && (!feedback.trim() || rating === 0)) return false;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-order-notification">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Order Update</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
              <Package className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Order Number</p>
                <p className="font-semibold" data-testid="text-order-number">
                  {content.OrderNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Payment Status</p>
                <Badge className={`${getStatusColor(content.PaymentStatus)} mt-1`} data-testid="badge-payment-status">
                  {content.PaymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Conditional Fields */}
          {(content.IsTipNeeded || content.IsScreenshotNeeded || content.IsFeedbackNeeded) && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Additional Information Required</h4>
              
              {/* Tip Field */}
              {content.IsTipNeeded && (
                <div className="space-y-2">
                  <Label htmlFor="tipAmount" className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Tip Amount ({content.Currency})</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="tipAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="pl-8"
                      data-testid="input-tip-amount"
                    />
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-2 top-3" />
                  </div>
                </div>
              )}

              {/* Screenshot Upload */}
              {content.IsScreenshotNeeded && (
                <div className="space-y-2">
                  <Label htmlFor="screenshot" className="flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>Payment Screenshot</span>
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="flex-1"
                      data-testid="input-payment-screenshot"
                    />
                    {screenshot && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Uploaded
                      </Badge>
                    )}
                  </div>
                  {screenshot && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(screenshot)}
                        alt="Payment screenshot preview"
                        className="max-w-full h-32 object-contain rounded border"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Feedback and Rating */}
              {content.IsFeedbackNeeded && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Star className="w-4 h-4" />
                      <span>Rate your experience</span>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <StarRating rating={rating} onRatingChange={setRating} />
                      <span className="text-sm text-gray-500">
                        {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'No rating'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedback" className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>Feedback</span>
                    </Label>
                    <Textarea
                      id="feedback"
                      placeholder="Please share your feedback about the order..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      data-testid="textarea-feedback"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid="button-cancel-order-notification"
          >
            Close
          </Button>
          {(content.IsTipNeeded || content.IsScreenshotNeeded || content.IsFeedbackNeeded) && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              className="min-w-[100px]"
              data-testid="button-submit-order-response"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}