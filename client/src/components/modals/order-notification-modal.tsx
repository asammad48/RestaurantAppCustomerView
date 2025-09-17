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
          className={`p-1 rounded transition-colors ${
            star <= rating 
              ? 'text-yellow-400 hover:text-yellow-500' 
              : 'text-gray-300 hover:text-yellow-400'
          }`}
          data-testid={`star-rating-${star}`}
        >
          <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
    
    try {
      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Submitting order response:', {
        orderNumber: content.OrderNumber,
        tipAmount: content.IsTipNeeded ? tipAmount : null,
        screenshot: content.IsScreenshotNeeded ? screenshot?.name : null,
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
    if (content.IsTipNeeded && (!tipAmount.trim() || parseFloat(tipAmount) < 0)) return false;
    if (content.IsScreenshotNeeded && !screenshot) return false;
    if (content.IsFeedbackNeeded && (!feedback.trim() || rating === 0)) return false;
    return true;
  };

  const hasRequiredFields = content.IsTipNeeded || content.IsScreenshotNeeded || content.IsFeedbackNeeded;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-order-notification">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Order Notification Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Information */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3 mb-3">
                <Package className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Order Number</p>
                  <p className="text-lg font-bold text-gray-900" data-testid="text-order-number">
                    {content.OrderNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Status</p>
                  <Badge 
                    className={`${getStatusColor(content.PaymentStatus)} mt-1 font-medium`}
                    data-testid="badge-payment-status"
                  >
                    {content.PaymentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Fields Section */}
          {hasRequiredFields && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-4">Additional Information Required</h4>
                
                {/* Tip Field */}
                {content.IsTipNeeded && (
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="tipAmount" className="flex items-center space-x-2 font-medium">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>Tip Amount ({content.Currency})</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="tipAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter tip amount (e.g. 5.00)"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                        className="pl-10"
                        data-testid="input-tip-amount"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {content.Currency === 'USD' ? '$' : content.Currency}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Enter the tip amount you'd like to provide</p>
                  </div>
                )}

                {/* Screenshot Upload */}
                {content.IsScreenshotNeeded && (
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="screenshot" className="flex items-center space-x-2 font-medium">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>Payment Screenshot</span>
                    </Label>
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      data-testid="input-payment-screenshot"
                    />
                    {screenshot && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            File uploaded: {screenshot.name}
                          </Badge>
                        </div>
                        <img
                          src={URL.createObjectURL(screenshot)}
                          alt="Payment screenshot preview"
                          className="max-w-full h-40 object-contain rounded border bg-gray-50"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Upload a screenshot of your payment confirmation</p>
                  </div>
                )}

                {/* Feedback and Rating */}
                {content.IsFeedbackNeeded && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2 font-medium">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <span>Rate Your Experience</span>
                      </Label>
                      <div className="flex items-center space-x-3">
                        <StarRating rating={rating} onRatingChange={setRating} />
                        <span className="text-sm text-gray-600 min-w-[100px]">
                          {rating === 0 && 'No rating selected'}
                          {rating === 1 && '1 star - Poor'}
                          {rating === 2 && '2 stars - Fair'}
                          {rating === 3 && '3 stars - Good'}
                          {rating === 4 && '4 stars - Very Good'}
                          {rating === 5 && '5 stars - Excellent'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="feedback" className="flex items-center space-x-2 font-medium">
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                        <span>Feedback</span>
                      </Label>
                      <Textarea
                        id="feedback"
                        placeholder="Please share your feedback about the order experience..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={4}
                        className="resize-none"
                        data-testid="textarea-feedback"
                      />
                      <p className="text-xs text-gray-500">Your feedback helps us improve our service</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            data-testid="button-cancel-order-notification"
          >
            Close
          </Button>
          {hasRequiredFields && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              className="min-w-[120px]"
              data-testid="button-submit-order-response"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Response'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}