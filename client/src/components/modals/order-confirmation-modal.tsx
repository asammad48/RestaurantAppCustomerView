import { Check, Clock, MapPin, User, DollarSign, Calendar, Timer, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import { formatToLocalTime, formatBranchCurrency } from "@/lib/utils";
import { OrderStatus, OrderType } from "@/types/order-history";
import { useLocation } from "wouter";

export default function OrderConfirmationModal() {
  const { 
    isOrderConfirmationOpen, 
    setOrderConfirmationOpen, 
    orderResponse,
    setDeliveryDetails,
    setTakeawayDetails,
    setSpecialInstructions,
    setSplitBillModalOpen,
    setSelectedAllergens,
    selectedBranch,
    deliveryDetails,
    takeawayDetails,
    serviceType
  } = useCartStore();
  const { user } = useAuthStore();
  const { clearCart } = useCart();
  
  // Capture order timestamp and customer/order type snapshot when modal opens
  const [orderTimestamp, setOrderTimestamp] = useState<Date | null>(null);
  const [customerSnapshot, setCustomerSnapshot] = useState<string | null>(null);
  const [orderTypeSnapshot, setOrderTypeSnapshot] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOrderConfirmationOpen && orderResponse) {
      // Capture snapshots before any potential clearing
      setOrderTimestamp(new Date());
      
      // Capture customer info
      if (user) {
        setCustomerSnapshot(user.fullName || user.name || user.email);
      } else if (deliveryDetails?.customerName) {
        setCustomerSnapshot(deliveryDetails.customerName);
      } else if (takeawayDetails?.customerName) {
        setCustomerSnapshot(takeawayDetails.customerName);
      } else {
        setCustomerSnapshot("Guest Customer");
      }
      
      // Capture order type
      if (deliveryDetails) {
        setOrderTypeSnapshot("Delivery");
      } else if (takeawayDetails) {
        setOrderTypeSnapshot("Takeaway");
      } else {
        setOrderTypeSnapshot("Dine In");
      }
    }
  }, [isOrderConfirmationOpen, orderResponse, user, deliveryDetails, takeawayDetails]);
  
  // Reset snapshots when modal closes
  useEffect(() => {
    if (!isOrderConfirmationOpen) {
      setOrderTimestamp(null);
      setCustomerSnapshot(null);
      setOrderTypeSnapshot(null);
    }
  }, [isOrderConfirmationOpen]);

  const handleContinueShopping = () => {
    // Clear cart and order details when user continues shopping
    clearCart();
    setDeliveryDetails(null);
    setTakeawayDetails(null);
    setSpecialInstructions('');
    setSelectedAllergens([]);
    setSplitBillModalOpen(false);
    setOrderConfirmationOpen(false);
  };

  const [, setLocation] = useLocation();

  const handleTrackOrder = () => {
    // Clear cart and order details when user goes to track order
    clearCart();
    setDeliveryDetails(null);
    setTakeawayDetails(null);
    setSpecialInstructions('');
    setSelectedAllergens([]);
    setSplitBillModalOpen(false);
    setOrderConfirmationOpen(false);
    setLocation('/order-history');
  };

  // Helper functions
  const getOrderStatusText = (status: number) => {
    switch (status) {
      case OrderStatus.Pending: return 'Pending';
      case OrderStatus.Confirmed: return 'Confirmed';
      case OrderStatus.Preparing: return 'Preparing';
      case OrderStatus.Ready: return 'Ready';
      case OrderStatus.Delivered: return 'Delivered';
      case OrderStatus.Cancelled: return 'Cancelled';
      default: return 'Pending';
    }
  };


  const formatCurrency = (amount: number) => {
    return formatBranchCurrency(amount, selectedBranch?.branchCurrency || 'PKR');
  };

  // Get captured snapshots instead of live data
  const getLocalCustomer = () => {
    return customerSnapshot || "Guest Customer";
  };

  const getLocalOrderType = () => {
    return orderTypeSnapshot || "Dine In";
  };

  const getCurrentDateTime = () => {
    return orderTimestamp || new Date();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Dialog open={isOrderConfirmationOpen} onOpenChange={setOrderConfirmationOpen}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-hidden flex flex-col" data-testid="order-confirmation-content">
        {/* Header with branch primary color */}
        <div className="configurable-primary text-white p-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-white" size={32} />
            </div>
            <DialogTitle className="text-2xl font-bold text-white mb-2">Order Confirmed!</DialogTitle>
            <DialogDescription className="text-white/90">
              Your order has been placed successfully. You will receive updates on your order status.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Order Overview */}
          <div className="configurable-surface rounded-xl p-4 border configurable-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold configurable-text-primary text-lg">
                  {orderResponse?.orderNumber || '#ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase()}
                </h3>
                <p className="text-sm configurable-text-secondary">Order Number</p>
              </div>
              <Badge 
                className="configurable-success text-white px-3 py-1"
                data-testid="order-status-badge"
              >
                {orderResponse ? getOrderStatusText(orderResponse.orderStatus ?? OrderStatus.Pending) : 'Pending'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 configurable-text-muted" />
                <div>
                  <p className="configurable-text-secondary">Customer</p>
                  <p className="font-medium configurable-text-primary">{getLocalCustomer()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 configurable-text-muted" />
                <div>
                  <p className="configurable-text-secondary">Order Type</p>
                  <p className="font-medium configurable-text-primary">{getLocalOrderType()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 configurable-text-muted" />
                <div>
                  <p className="configurable-text-secondary">Order Date</p>
                  <p className="font-medium configurable-text-primary">
                    {formatToLocalTime(getCurrentDateTime().toISOString(), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 configurable-text-muted" />
                <div>
                  <p className="configurable-text-secondary">Order Time</p>
                  <p className="font-medium configurable-text-primary">
                    {formatToLocalTime(getCurrentDateTime().toISOString(), 'hh:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated Times */}
          {orderResponse && (orderResponse.estimatedPreparationTimeMinutes || orderResponse.estimatedDeliveryTimeMinutes) && (
            <div className="configurable-surface rounded-xl p-4 border configurable-border">
              <h3 className="font-semibold configurable-text-primary mb-3 flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Estimated Times
              </h3>
              <div className="space-y-3">
                {orderResponse.estimatedPreparationTimeMinutes && (
                  <div className="flex justify-between items-center">
                    <span className="configurable-text-secondary">Preparation Time:</span>
                    <span className="font-medium configurable-text-primary">
                      {orderResponse.estimatedPreparationTimeMinutes} minutes
                    </span>
                  </div>
                )}
                {orderResponse.estimatedDeliveryTimeMinutes && (
                  <div className="flex justify-between items-center">
                    <span className="configurable-text-secondary">Delivery Time:</span>
                    <span className="font-medium configurable-text-primary">
                      {orderResponse.estimatedDeliveryTimeMinutes} minutes
                    </span>
                  </div>
                )}
                {orderResponse.completionTimeMinutes && (
                  <div className="flex justify-between items-center pt-2 border-t configurable-border">
                    <span className="configurable-text-secondary font-medium">Total Time:</span>
                    <span className="font-bold configurable-text-primary">
                      {orderResponse.completionTimeMinutes} minutes
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {orderResponse && (
            <div className="configurable-surface rounded-xl p-4 border configurable-border">
              <h3 className="font-semibold configurable-text-primary mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="configurable-text-secondary">Subtotal:</span>
                  <span className="font-medium configurable-text-primary">{formatCurrency(orderResponse.subTotal || 0)}</span>
                </div>
                {(orderResponse.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="configurable-text-secondary">Discount:</span>
                    <span 
                      className="font-medium bg-white px-2 py-1 rounded" 
                      style={{ color: selectedBranch?.primaryColor || '#000' }}
                    >
                      -{formatCurrency(orderResponse.discountAmount!)}
                    </span>
                  </div>
                )}
                {(orderResponse.serviceCharges ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="configurable-text-secondary">Service Charges:</span>
                    <span className="font-medium configurable-text-primary">{formatCurrency(orderResponse.serviceCharges!)}</span>
                  </div>
                )}
                {(orderResponse.deliveryCharges ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="configurable-text-secondary">Delivery Charges:</span>
                    <span className="font-medium configurable-text-primary">{formatCurrency(orderResponse.deliveryCharges!)}</span>
                  </div>
                )}
                {(orderResponse.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="configurable-text-secondary">Tax:</span>
                    <span className="font-medium configurable-text-primary">{formatCurrency(orderResponse.taxAmount!)}</span>
                  </div>
                )}
                {(orderResponse.tipAmount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="configurable-text-secondary">Tip:</span>
                    <span className="font-medium configurable-text-primary">{formatCurrency(orderResponse.tipAmount!)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t configurable-border">
                  <span className="font-semibold configurable-text-primary">Total Amount:</span>
                  <span className="font-bold text-lg configurable-text-primary">{formatCurrency(orderResponse.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Print Receipt Section */}
          <div className="configurable-surface rounded-xl p-4 border configurable-border">
            <h3 className="font-semibold configurable-text-primary mb-3 flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Receipt
            </h3>
            <p className="configurable-text-secondary text-sm mb-4">
              Print or save your order receipt for your records
            </p>
            <Button 
              onClick={handlePrintReceipt}
              variant="outline"
              className="w-full configurable-border configurable-text-primary hover:configurable-secondary"
              data-testid="button-print-receipt"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t configurable-border">
          <Button 
            onClick={handleTrackOrder}
            className="w-full configurable-primary text-white hover:configurable-primary-hover py-3"
            data-testid="button-track-order"
          >
            Track Order
          </Button>
          <Button 
            onClick={handleContinueShopping}
            variant="outline"
            className="w-full configurable-border configurable-text-secondary hover:configurable-secondary py-3"
            data-testid="button-continue-shopping"
          >
            Continue Shopping
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
