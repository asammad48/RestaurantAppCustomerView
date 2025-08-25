import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, User, Mail, Phone, Clock } from "lucide-react";
import { useCartStore } from "@/lib/store";

interface TakeawayDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialInstructions?: string;
  preferredTime?: string;
}

export default function TakeawayDetailsModal() {
  const { 
    isTakeawayDetailsModalOpen, 
    setTakeawayDetailsModalOpen, 
    setPaymentModalOpen,
    selectedRestaurant,
    setTakeawayDetails
  } = useCartStore();

  const [details, setDetails] = useState<TakeawayDetails>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    specialInstructions: "",
    preferredTime: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!details.customerName.trim()) {
      newErrors.customerName = "Name is required";
    }

    if (!details.customerEmail.trim()) {
      newErrors.customerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.customerEmail)) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    if (!details.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required";
    } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(details.customerPhone)) {
      newErrors.customerPhone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateForm()) {
      setTakeawayDetails(details);
      setTakeawayDetailsModalOpen(false);
      setPaymentModalOpen(true);
    }
  };

  const handleBack = () => {
    setTakeawayDetailsModalOpen(false);
  };

  return (
    <Dialog open={isTakeawayDetailsModalOpen} onOpenChange={setTakeawayDetailsModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-xl font-bold text-black flex items-center">
            <ShoppingBag className="w-5 h-5 mr-2 configurable-primary-text" />
            Pickup Details
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter your details for order pickup
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Restaurant Info */}
          {selectedRestaurant && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-black mb-2">{selectedRestaurant.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Ready for pickup: {selectedRestaurant.deliveryTime.replace('delivery', 'preparation')}
                </div>
                <div className="flex items-start">
                  <ShoppingBag className="w-4 h-4 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium">Pickup Address:</div>
                    <div>{selectedRestaurant.address}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-black flex items-center">
              <User className="w-4 h-4 mr-2 configurable-primary-text" />
              Customer Information
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="customerName" className="mb-2.5 block">Full Name *</Label>
                <Input
                  id="customerName"
                  value={details.customerName}
                  onChange={(e) => setDetails({ ...details, customerName: e.target.value })}
                  placeholder="Enter your full name"
                  className={errors.customerName ? "border-red-500" : ""}
                  data-testid="input-customer-name-takeaway"
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail" className="mb-2.5 block">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={details.customerEmail}
                  onChange={(e) => setDetails({ ...details, customerEmail: e.target.value })}
                  placeholder="Enter your email address"
                  className={errors.customerEmail ? "border-red-500" : ""}
                  data-testid="input-customer-email-takeaway"
                />
                {errors.customerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerPhone" className="mb-2.5 block">Phone Number *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={details.customerPhone}
                  onChange={(e) => setDetails({ ...details, customerPhone: e.target.value })}
                  placeholder="Enter your phone number"
                  className={errors.customerPhone ? "border-red-500" : ""}
                  data-testid="input-customer-phone-takeaway"
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Preferences */}
          <div className="space-y-4">
            <h3 className="font-medium text-black flex items-center">
              <Clock className="w-4 h-4 mr-2 configurable-primary-text" />
              Pickup Preferences
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="preferredTime" className="mb-2.5 block">Preferred Pickup Time</Label>
                <Input
                  id="preferredTime"
                  type="time"
                  value={details.preferredTime}
                  onChange={(e) => setDetails({ ...details, preferredTime: e.target.value })}
                  data-testid="input-preferred-pickup-time"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for ASAP pickup
                </p>
              </div>

              <div>
                <Label htmlFor="specialInstructions" className="mb-2.5 block">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={details.specialInstructions}
                  onChange={(e) => setDetails({ ...details, specialInstructions: e.target.value })}
                  placeholder="Any special requests for your order (optional)"
                  rows={3}
                  data-testid="textarea-special-instructions"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex-1"
              data-testid="button-back-to-cart-takeaway"
            >
              Back to Cart
            </Button>
            <Button 
              onClick={handleProceedToPayment}
              className="flex-1 configurable-primary hover:configurable-primary-hover text-white"
              data-testid="button-proceed-to-payment-takeaway"
            >
              Proceed to Payment
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            * Required fields. Your information will be used only for this order.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}