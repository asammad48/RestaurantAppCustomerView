import { useState } from "react";
import { CreditCard, Banknote, Building2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/lib/store";
import { orderService } from "@/services/order-service";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/lib/auth-store";
import { SplitBill } from "@/lib/api-client";
import { CartItem } from "@/lib/store";

export default function PaymentModal() {
  const { 
    isPaymentModalOpen, 
    setPaymentModalOpen, 
    setSplitBillModalOpen, 
    setReviewModalOpen, 
    setOrderConfirmationOpen,
    setOrderResponse,
    serviceType,
    selectedBranch,
    deliveryDetails,
    takeawayDetails,
    specialInstructions,
    splitBillMode,
    selectedAllergens
  } = useCartStore();
  const { items } = useCart();
  const { toast } = useToast();
  const { user, token } = useAuthStore();
  
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [splitBill, setSplitBill] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get locationId from URL parameters for dine-in orders
  const getLocationId = () => {
    if (serviceType === 'dine-in') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLocationId = urlParams.get('locationId');
      if (urlLocationId) {
        return parseInt(urlLocationId, 10);
      }
    }
    return undefined;
  };

  // Generate split bills based on mode
  const generateSplitBills = (cartItems: CartItem[], mode: 'equality' | 'items'): SplitBill[] => {
    if (mode === 'equality') {
      const totalAmount = cartItems.reduce((total, item) => {
        const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
        
        // Calculate modifier price for this item
        let modifierPrice = 0;
        if (item.customization?.selectedModifiers && item.modifiers) {
          modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
            const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
            return modTotal + (modifier ? modifier.price * qty : 0);
          }, 0);
        }
        
        return total + ((basePrice + modifierPrice) * item.quantity);
      }, 0);
      
      return [{
        splitType: 1, // Equality
        price: totalAmount * 100, // Convert to cents
        mobileNumber: "guest_mobile", // This should be collected from user
        itemName: "Total Bill"
      }];
    } else {
      // Split by items
      return cartItems.map(item => {
        const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
        
        // Calculate modifier price for this item
        let modifierPrice = 0;
        if (item.customization?.selectedModifiers && item.modifiers) {
          modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
            const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
            return modTotal + (modifier ? modifier.price * qty : 0);
          }, 0);
        }
        
        return {
          splitType: 2, // By Item
          price: ((basePrice + modifierPrice) * item.quantity) * 100, // Convert to cents
          mobileNumber: "guest_mobile", // This should be collected from user
          itemName: item.name
        };
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedBranch) {
      toast({
        title: "Branch Required",
        description: "Please select a restaurant branch before placing your order.",
        variant: "destructive",
      });
      return;
    }

    // Check authentication before placing order
    if (!user || !token) {
      toast({
        title: "Login Required",
        description: "Please login to place your order.",
        variant: "destructive",
      });
      // Close payment modal and open login modal
      setPaymentModalOpen(false);
      useAuthStore.getState().setLoginModalOpen(true);
      return;
    }

    // Check if locationId is required and provided for dine-in orders
    if (serviceType === 'dine-in' && !getLocationId()) {
      toast({
        title: "Location Required",
        description: "Please select a table/location for your dine-in order.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Generate split bills if split bill is enabled
      const splitBillsData = splitBill && splitBillMode ? generateSplitBills(items, splitBillMode) : null;

      const response = await orderService.createOrder({
        cartItems: items,
        serviceType,
        branchId: selectedBranch.branchId,
        locationId: getLocationId(),
        username: user?.name || user?.email || 'guest',
        tipAmount: 0, // This can be extended to include tip selection
        deliveryDetails: serviceType === 'delivery' ? deliveryDetails : null,
        takeawayDetails: serviceType === 'takeaway' ? takeawayDetails : null,
        splitBills: splitBillsData,
        specialInstruction: specialInstructions || '',
        allergenIds: selectedAllergens && selectedAllergens.length > 0 ? selectedAllergens : null,
        token: token
      });

      if (response.success && response.data) {
        setOrderResponse(response.data);
        setPaymentModalOpen(false);
        setOrderConfirmationOpen(true);
        
        // Clear the cart for this branch after successful order
        useCartStore.getState().clearCartForBranch(selectedBranch.branchId);
        
        toast({
          title: "Order Placed Successfully!",
          description: `Order #${response.data.orderNumber} has been created.`,
        });
      }
    } catch (error: any) {
      console.error('Order creation failed:', error);
      
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitBill = () => {
    setPaymentModalOpen(false);
    setSplitBillModalOpen(true);
  };

  return (
    <Dialog open={isPaymentModalOpen} onOpenChange={setPaymentModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold configurable-text-primary">Select Payment Method</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Choose how you would like to pay for your order
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Methods */}
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="configurable-primary-text" size={24} />
                <Label htmlFor="cash" className="font-medium configurable-text-primary cursor-pointer">Cash</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="configurable-primary-text" size={24} />
                <Label htmlFor="card" className="font-medium configurable-text-primary cursor-pointer">Credit/Debit Card</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="bank" id="bank" />
                <Building2 className="configurable-primary-text" size={24} />
                <Label htmlFor="bank" className="font-medium configurable-text-primary cursor-pointer">Bank Transfer</Label>
              </div>
            </div>
          </RadioGroup>
          
          {/* Split Bill Option */}
          <div className="flex items-center space-x-3">
            <Checkbox id="split" checked={splitBill} onCheckedChange={(checked) => setSplitBill(checked === true)} />
            <Label htmlFor="split" className="font-medium configurable-text-primary">Do you want to split?</Label>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handlePlaceOrder} 
              className="w-full configurable-primary text-white font-bold hover:configurable-primary-hover"
              disabled={!paymentMethod || isLoading}
              data-testid="button-place-order"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
            {splitBill && (
              <Button 
                onClick={handleSplitBill} 
                variant="outline" 
                className="w-full"
              >
                Split Bill
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
