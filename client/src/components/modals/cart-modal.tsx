import { Minus, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/config";

export default function CartModal() {
  const { isCartOpen, setCartOpen, setPaymentModalOpen, setDeliveryDetailsModalOpen, setTakeawayDetailsModalOpen, serviceType, removeItem, selectedBranch } = useCartStore();
  const { items, updateQuantity, clearCart, total } = useCart();
  const { user, setLoginModalOpen } = useAuthStore();
  const { toast } = useToast();

  // Debug logging for cart modal
  console.debug('🛒 Cart Modal: Rendering', {
    isCartOpen,
    itemCount: items.length,
    total,
    serviceType,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      variantName: item.variantName,
      variantPrice: item.variantPrice,
      variation: item.variation
    }))
  });

  // Helper function to get the correct image URL for cart items
  const getItemImage = (item: any) => {
    // Priority order: menuPicture, packagePicture, picture, image
    if (item.menuPicture) {
      return getImageUrl(item.menuPicture);
    }
    if (item.packagePicture) {
      return getImageUrl(item.packagePicture);
    }
    if (item.picture) {
      return getImageUrl(item.picture);
    }
    // For mock items that have image property
    return item.image || getImageUrl(null);
  };

  // Calculate detailed order summary
  const subtotal = total; // This is the cart total before any additional charges
  const serviceCharge = serviceType === 'dine-in' ? (selectedBranch?.serviceCharges || 0) : 0; // Service charges only for dine-in
  const deliveryCharge = serviceType === 'delivery' ? (selectedBranch?.deliveryCharges || 0) : 0; // Delivery charges only for delivery
  
  // Calculate maximum discount based on maxAllowedAmount from items
  const calculateMaxDiscount = () => {
    let totalMaxAllowed = 0;
    let totalDiscountAmount = 0;
    
    items.forEach(item => {
      // Get base price for calculation
      const basePrice = parseFloat(item.price.toString());
      
      // Calculate modifier price for this item
      let modifierPrice = 0;
      if (item.customization?.selectedModifiers && item.modifiers) {
        modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
          const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
          return modTotal + (modifier ? modifier.price * qty : 0);
        }, 0);
      }
      
      const itemTotalPrice = (basePrice + modifierPrice) * item.quantity;
      
      // Check if item has discount
      const discount = item.discount;
      let discountPercentage = 0;
      
      if (discount) {
        if (typeof discount === 'number') {
          discountPercentage = discount;
        } else if (discount.value) {
          discountPercentage = discount.value;
        }
      }
      
      if (discountPercentage > 0) {
        const discountAmount = itemTotalPrice * (discountPercentage / 100);
        
        // Check maxAllowedAmount constraint
        const maxAllowed = (item as any).maxAllowedAmount || 0;
        if (maxAllowed > 0) {
          // Limit discount to maxAllowedAmount
          const limitedDiscount = Math.min(discountAmount, maxAllowed * item.quantity);
          totalDiscountAmount += limitedDiscount;
          totalMaxAllowed += maxAllowed * item.quantity;
        } else {
          // No limit, use full discount
          totalDiscountAmount += discountAmount;
        }
      }
    });
    
    return totalDiscountAmount;
  };
  
  const calculatedDiscount = calculateMaxDiscount();
  
  // Check if branch has maxDiscountAmount and limit the discount accordingly
  const branchMaxDiscount = selectedBranch?.maxDiscountAmount || 0;
  const discountAmount = branchMaxDiscount > 0 
    ? Math.min(calculatedDiscount, branchMaxDiscount)
    : calculatedDiscount;
  
  // Calculate tax based on branch settings
  const taxPercentage = selectedBranch?.taxPercentage || 0;
  const taxAppliedType = selectedBranch?.taxAppliedType || '';
  let taxAmount = 0;
  
  if (taxPercentage > 0) {
    if (taxAppliedType === 'TaxAppliedOnTotalAmount') {
      // Tax calculated on subtotal
      taxAmount = subtotal * (taxPercentage / 100);
    } else {
      // Tax calculated on (subtotal - discount)
      taxAmount = (subtotal - discountAmount) * (taxPercentage / 100);
    }
  }
  
  const grandTotal = subtotal + serviceCharge + deliveryCharge + taxAmount - discountAmount;

  const handleProceedToPayment = () => {
    // Check if user is logged in for delivery orders
    if (serviceType === 'delivery' && !user) {
      setCartOpen(false);
      setLoginModalOpen(true);
      toast({
        title: "Login Required",
        description: "Please log in to place a delivery order and enter your delivery details.",
        variant: "destructive"
      });
      return;
    }

    setCartOpen(false);
    
    // For delivery orders, go to delivery details first
    if (serviceType === 'delivery') {
      setDeliveryDetailsModalOpen(true);
    } else if (serviceType === 'takeaway') {
      setTakeawayDetailsModalOpen(true);
    } else {
      setPaymentModalOpen(true);
    }
  };

  return (
    <Dialog open={isCartOpen} onOpenChange={setCartOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-black">Your cart</DialogTitle>
            <Button variant="ghost" onClick={clearCart} className="configurable-primary-text font-medium hover:configurable-primary-hover hover:text-white">
              Clear Cart
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.id}-${item.variation}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex gap-4">
                  {/* Item Image */}
                  <div className="w-20 h-20 flex-shrink-0">
                    <img src={getItemImage(item)} alt={item.name} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  </div>
                  
                  {/* Item Details */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-black text-base">{item.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    
                    {/* Variation */}
                    {(item.variation || item.variantName) && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-black">Variation</h5>
                        <p className="text-sm text-gray-600">{item.variantName || item.variation}</p>
                        {item.variantPrice && (
                          <p className="text-xs text-gray-500">PKR {item.variantPrice} each</p>
                        )}
                      </div>
                    )}
                    
                    {/* Modifiers */}
                    {item.customization?.selectedModifiers && Object.keys(item.customization.selectedModifiers).length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-black">Modifiers</h5>
                        <div className="text-sm text-gray-600">
                          {Object.entries(item.customization.selectedModifiers).map(([modifierId, qty]) => {
                            // Find modifier details from the item's modifiers array
                            const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
                            return modifier && qty > 0 ? (
                              <p key={modifierId}>
                                {qty}x {modifier.name} 
                                <span className="text-xs text-gray-500 ml-1">(+PKR {modifier.price * qty})</span>
                              </p>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Extra Toppings */}
                    {item.customization?.toppings && Object.keys(item.customization.toppings).length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-black">Extra Toppings</h5>
                        <div className="text-sm text-gray-600">
                          {Object.entries(item.customization.toppings).map(([topping, qty]) => (
                            <p key={topping}>{qty}x {topping.charAt(0).toUpperCase() + topping.slice(1)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div className="text-right">
                    {(() => {
                      const basePrice = parseFloat(item.price.toString());
                      
                      // Calculate modifier price for this item
                      let modifierPrice = 0;
                      if (item.customization?.selectedModifiers && item.modifiers) {
                        modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
                          const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
                          return modTotal + (modifier ? modifier.price * qty : 0);
                        }, 0);
                      }
                      
                      // Calculate discount if available
                      const discount = item.discount;
                      let discountPercentage = 0;
                      
                      if (discount) {
                        if (typeof discount === 'number') {
                          discountPercentage = discount;
                        } else if (discount.value) {
                          discountPercentage = discount.value;
                        }
                      }
                      
                      const originalTotalPrice = (basePrice + modifierPrice) * item.quantity;
                      const discountedTotalPrice = discountPercentage > 0 ? originalTotalPrice * (1 - discountPercentage / 100) : originalTotalPrice;
                      
                      if (discountPercentage > 0) {
                        return (
                          <div>
                            <div className="text-sm text-gray-500 line-through">Rs. {originalTotalPrice.toFixed(2)}</div>
                            <div className="text-lg font-bold text-black">Rs. {discountedTotalPrice.toFixed(2)}</div>
                            <div className="text-xs text-green-600">{discountPercentage}% OFF</div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-lg font-bold text-black">Rs. {originalTotalPrice.toFixed(2)}</div>
                        );
                      }
                    })()}
                  </div>
                </div>
                
                {/* Quantity Controls and Delete */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id.toString(), item.quantity - 1)}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center font-medium text-black">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id.toString(), item.quantity + 1)}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeItem(item.id.toString())}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Promo Code */}
          <div className="pt-4">
            <h4 className="font-bold text-black text-base mb-3">Promo code</h4>
            <div className="flex gap-2">
              <Input 
                placeholder="" 
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2" 
              />
              <Button className="configurable-primary text-white px-6 py-2 rounded-lg hover:configurable-primary-hover font-medium">
                Apply
              </Button>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="pt-6">
            <h4 className="font-bold text-black text-base mb-4">Order Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-black">Sub Total</span>
                <span className="text-black font-medium">RS. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Service Charges</span>
                <span className="text-black font-medium">RS. {serviceCharge.toFixed(2)}</span>
              </div>
              {deliveryCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-black">Delivery Charges</span>
                  <span className="text-black font-medium">RS. {deliveryCharge.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-black text-green-600">Discount</span>
                    <span className="text-black font-medium text-green-600">-RS. {discountAmount.toFixed(2)}</span>
                  </div>
                  {branchMaxDiscount > 0 && calculatedDiscount > branchMaxDiscount && (
                    <div className="text-xs text-gray-500 pl-2">
                      Original discount was RS. {calculatedDiscount.toFixed(2)}, but restaurant has added a limit on discount
                    </div>
                  )}
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-black">Tax ({taxPercentage}%)</span>
                  <span className="text-black font-medium">RS. {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-black font-bold text-base">Grand Total</span>
                  <span className="text-black font-bold text-base">RS. {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleProceedToPayment}
            className="w-full configurable-primary text-white py-4 text-base font-medium hover:configurable-primary-hover rounded-lg mt-6"
            disabled={items.length === 0}
          >
            {serviceType === 'delivery' ? 'Enter Delivery Details' : 
             serviceType === 'takeaway' ? 'Enter Pickup Details' : 'Proceed to Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
