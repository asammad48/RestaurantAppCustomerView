import { Minus, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";

export default function CartModal() {
  const { isCartOpen, setCartOpen, setPaymentModalOpen, setDeliveryDetailsModalOpen, setTakeawayDetailsModalOpen, serviceType, removeItem } = useCartStore();
  const { items, updateQuantity, clearCart, total } = useCart();

  const serviceCharge = 500;
  const discount = 500;
  const grandTotal = total + serviceCharge - discount;

  const handleProceedToPayment = () => {
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
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  </div>
                  
                  {/* Item Details */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-black text-base">{item.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    
                    {/* Variation */}
                    {item.variation && (
                      <div className="mt-2">
                        <h5 className="text-sm font-medium text-black">Variation</h5>
                        <p className="text-sm text-gray-600">{item.variation}</p>
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
                    <div className="text-lg font-bold text-black">Rs. {(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
                
                {/* Quantity Controls and Delete */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center font-medium text-black">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeItem(item.id)}
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
                <span className="text-black font-medium">RS. {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Service Charges</span>
                <span className="text-black font-medium">RS. {serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Discount</span>
                <span className="text-black font-medium">RS. {discount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-black font-bold text-base">Grand Total</span>
                  <span className="text-black font-bold text-base">RS. {total.toFixed(2)}</span>
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
