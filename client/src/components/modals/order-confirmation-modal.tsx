import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";
import { useEffect } from "react";

export default function OrderConfirmationModal() {
  const { 
    isOrderConfirmationOpen, 
    setOrderConfirmationOpen, 
    orderResponse,
    setDeliveryDetails,
    setTakeawayDetails
  } = useCartStore();
  const { clearCart } = useCart();

  // Automatically clear cart and order details when order is confirmed
  useEffect(() => {
    if (isOrderConfirmationOpen && orderResponse) {
      clearCart();
      // Clear delivery and takeaway details after successful order
      setDeliveryDetails(null);
      setTakeawayDetails(null);
    }
  }, [isOrderConfirmationOpen, orderResponse, clearCart, setDeliveryDetails, setTakeawayDetails]);

  const handleContinueShopping = () => {
    setOrderConfirmationOpen(false);
  };

  const handleTrackOrder = () => {
    setOrderConfirmationOpen(false);
    // Navigate to orders page
  };

  return (
    <Dialog open={isOrderConfirmationOpen} onOpenChange={setOrderConfirmationOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold configurable-text-primary">Order Confirmed!</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Your order has been placed successfully. You will receive updates on your order status.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center space-y-6">
          <div className="w-20 h-20 configurable-primary rounded-full flex items-center justify-center mx-auto">
            <Check className="text-white" size={40} />
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm configurable-text-secondary mb-1">Order Number</p>
              <p className="font-bold configurable-text-primary text-lg">
                {orderResponse?.orderNumber || '#ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </div>
            
            {orderResponse && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="configurable-text-secondary">Order ID:</span>
                  <span className="font-medium configurable-text-primary">#{orderResponse.orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="configurable-text-secondary">Total Amount:</span>
                  <span className="font-medium configurable-text-primary">
                    ${(orderResponse.totalAmount / 100).toFixed(2)}
                  </span>
                </div>
                {orderResponse.deliveryCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="configurable-text-secondary">Delivery Charges:</span>
                    <span className="font-medium configurable-text-primary">
                      ${(orderResponse.deliveryCharges / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {orderResponse.serviceCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="configurable-text-secondary">Service Charges:</span>
                    <span className="font-medium configurable-text-primary">
                      ${(orderResponse.serviceCharges / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {orderResponse.tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="configurable-text-secondary">Tip:</span>
                    <span className="font-medium configurable-text-primary">
                      ${(orderResponse.tipAmount / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleTrackOrder}
              className="w-full configurable-primary text-white hover:configurable-primary-hover"
            >
              Track Order
            </Button>
            <Button 
              onClick={handleContinueShopping}
              variant="outline"
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
