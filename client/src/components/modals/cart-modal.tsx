import { Minus, Plus, Trash2, ChevronDown, Check, Store, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/config";
import { useQuery } from "@tanstack/react-query";
import { apiClient, Allergen } from "@/lib/api-client";
import { formatBranchCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import { useState } from "react";

export default function CartModal() {
  const { 
    isCartOpen, setCartOpen, setPaymentModalOpen, setDeliveryDetailsModalOpen, setTakeawayDetailsModalOpen, 
    serviceType, removeItem, selectedBranch, branchCurrency, specialInstructions, setSpecialInstructions, 
    selectedAllergens, setSelectedAllergens, clearCart: clearAllCart, clearCartForBranch,
    getUniqueBranchCount, getBranchSummary, getItemsForBranch 
  } = useCartStore();
  const { items, updateQuantity, total } = useCart();
  const { user, setLoginModalOpen } = useAuthStore();
  const { toast } = useToast();
  const [location] = useLocation();
  const [selectedBranchView, setSelectedBranchView] = useState<number | null>(null);

  // Determine display mode
  const isRestaurantMenuPage = location === '/restaurant-menu';
  const uniqueBranchCount = getUniqueBranchCount();
  const branchSummary = getBranchSummary();
  
  // Get items to display based on mode
  const getDisplayItems = () => {
    if (isRestaurantMenuPage) {
      // Restaurant menu: show only current branch items
      return selectedBranch ? getItemsForBranch(selectedBranch.branchId) : [];
    } else if (uniqueBranchCount <= 1 || selectedBranchView !== null) {
      // Other pages: show all items if single branch, or specific branch if selected
      return selectedBranchView !== null ? getItemsForBranch(selectedBranchView) : items;
    } else {
      // Multiple branches: show summary (no items, handled separately)
      return [];
    }
  };

  const displayItems = getDisplayItems();
  const showBranchSummary = !isRestaurantMenuPage && uniqueBranchCount > 1 && selectedBranchView === null;

  // Clear cart function
  const clearCart = () => {
    if (isRestaurantMenuPage && selectedBranch) {
      // Restaurant menu page: clear current branch
      clearCartForBranch(selectedBranch.branchId);
    } else if (selectedBranchView !== null) {
      // Non-restaurant page with specific branch selected: clear that branch
      clearCartForBranch(selectedBranchView);
    } else {
      // Multi-branch summary: clear all branches
      clearAllCart();
    }
  };

  // Fetch allergens data using mock API
  const { data: allergens = [], isLoading: allergensLoading, error: allergensError } = useQuery<Allergen[]>({
    queryKey: ['/api/Generic/allergens'],
  });


  // Handle allergen selection
  const handleAllergenToggle = (allergenId: number) => {
    const updatedAllergens = selectedAllergens.includes(allergenId)
      ? selectedAllergens.filter(id => id !== allergenId)
      : [...selectedAllergens, allergenId];
    
    setSelectedAllergens(updatedAllergens);
  };

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

  // Calculate detailed order summary based on displayed items
  const subtotal = displayItems.reduce((sum, item) => {
    const basePrice = parseFloat(item.price.toString()) || 0;
    const modifiersPrice = (item.modifiers || []).reduce((modSum, mod) => modSum + (mod.price || 0), 0);
    return sum + ((basePrice + modifiersPrice) * item.quantity);
  }, 0);
  // Only show branch fees when viewing current branch on restaurant menu page
  const showBranchFees = isRestaurantMenuPage && selectedBranch && 
                         (!selectedBranchView || selectedBranchView === selectedBranch.branchId);
  const deliveryCharge = showBranchFees && serviceType === 'delivery' ? (selectedBranch?.deliveryCharges || 0) : 0;
  
  // Calculate maximum discount based on maxAllowedAmount from items
  const calculateMaxDiscount = (itemsList = displayItems) => {
    let totalMaxAllowed = 0;
    let totalDiscountAmount = 0;
    
    itemsList.forEach(item => {
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

  // Calculate service charge as percentage applied to (subtotal - discountAmount)
  const serviceChargePercentage = showBranchFees && serviceType === 'dine-in' ? (selectedBranch?.serviceCharges || 0) : 0;
  const serviceCharge = (subtotal - discountAmount) * (serviceChargePercentage / 100);
  
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
    // Prevent checkout for multi-branch summary view
    if (showBranchSummary) {
      toast({
        title: "Select a Branch",
        description: "Please select a specific branch to proceed with checkout.",
        variant: "destructive"
      });
      return;
    }

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
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedBranchView !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBranchView(null)}
                  className="p-1 flex-shrink-0"
                  data-testid="button-back-to-summary"
                >
                  <ArrowLeft size={16} />
                </Button>
              )}
              <DialogTitle className="text-base sm:text-xl font-bold text-black truncate">
                {selectedBranchView !== null
                  ? branchSummary.find(b => b.branchId === selectedBranchView)?.branchName || 'Branch Cart'
                  : 'Your cart'
                }
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              onClick={clearCart} 
              className="configurable-primary-text font-medium hover:configurable-primary-hover hover:text-white text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              data-testid="button-clear-cart"
            >
              {showBranchSummary ? 'Clear All' : 
               selectedBranchView !== null ? 'Clear' : 'Clear'}
            </Button>
          </div>
          {isRestaurantMenuPage && selectedBranch && (
            <p className="text-sm text-gray-600 mt-2" data-testid="text-restaurant-cart-info">
              <Store size={14} className="inline mr-1" />
              You are seeing only the cart of this restaurant
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Branch Summary View */}
          {showBranchSummary && (
            <div className="space-y-4">
              <h4 className="font-bold text-black text-base mb-3">Cart Summary by Restaurant</h4>
              {branchSummary.map((branch) => (
                <div 
                  key={branch.branchId} 
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedBranchView(branch.branchId)}
                  data-testid={`card-branch-summary-${branch.branchId}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-black text-base">{branch.branchName}</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {branch.count} item{branch.count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black text-lg">{formatBranchCurrency(branch.total, branchCurrency)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        data-testid={`button-view-branch-${branch.branchId}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cart Items */}
          {!showBranchSummary && (
            <div className="space-y-4">
              {displayItems.map((item) => (
              <div key={`${item.id}-${item.variation || 'default'}-${item.branchId}`} className="border-b border-gray-100 pb-4 last:border-b-0">
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
                          <p className="text-xs text-gray-500">{formatBranchCurrency(item.variantPrice, branchCurrency)} each</p>
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
                                <span className="text-xs text-gray-500 ml-1">(+{formatBranchCurrency(modifier.price * qty, branchCurrency)})</span>
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
                            <div className="text-sm text-gray-500 line-through">{formatBranchCurrency(originalTotalPrice, branchCurrency)}</div>
                            <div className="text-lg font-bold text-black">{formatBranchCurrency(discountedTotalPrice, branchCurrency)}</div>
                            <div className="text-xs text-green-600">{discountPercentage}% OFF</div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-lg font-bold text-black">{formatBranchCurrency(originalTotalPrice, branchCurrency)}</div>
                        );
                      }
                    })()}
                  </div>
                </div>
                
                {/* Quantity Controls and Delete */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const compositeKey = `${item.id}-${item.variation || 'default'}-${item.branchId}`;
                        updateQuantity(compositeKey, item.quantity - 1);
                      }}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center font-medium text-black">{item.quantity}</span>
                    <button
                      onClick={() => {
                        const compositeKey = `${item.id}-${item.variation || 'default'}-${item.branchId}`;
                        updateQuantity(compositeKey, item.quantity + 1);
                      }}
                      className="w-8 h-8 configurable-primary text-white rounded flex items-center justify-center hover:configurable-primary-hover"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      const compositeKey = `${item.id}-${item.variation || 'default'}-${item.branchId}`;
                      removeItem(compositeKey);
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              ))}
            </div>
          )}
          
          {/* Promo Code */}
          {!showBranchSummary && (
            <>
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
                <span className="text-black font-medium">{formatBranchCurrency(subtotal, branchCurrency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Service Charges</span>
                <span className="text-black font-medium">{formatBranchCurrency(serviceCharge, branchCurrency)}</span>
              </div>
              {deliveryCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-black">Delivery Charges</span>
                  <span className="text-black font-medium">{formatBranchCurrency(deliveryCharge, branchCurrency)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-black configurable-primary-text">Discount</span>
                    <span className="text-black font-medium configurable-primary-text">-{formatBranchCurrency(discountAmount, branchCurrency)}</span>
                  </div>
                  {branchMaxDiscount > 0 && calculatedDiscount > branchMaxDiscount && (
                    <div className="text-xs text-gray-500 pl-2">
                      Original discount was {formatBranchCurrency(calculatedDiscount, branchCurrency)}, but restaurant has added a limit on discount
                    </div>
                  )}
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-black">Tax ({taxPercentage}%)</span>
                  <span className="text-black font-medium">{formatBranchCurrency(taxAmount, branchCurrency)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-black font-bold text-base">Grand Total</span>
                  <span className="text-black font-bold text-base">{formatBranchCurrency(grandTotal, branchCurrency)}</span>
                </div>
              </div>
            </div>
          </div>


          {/* Allergens Selection */}
          <div className="mt-6">
            <h3 className="font-semibold text-black text-base mb-3">Allergens</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  data-testid="button-allergens-select"
                >
                  {selectedAllergens.length > 0 
                    ? `${selectedAllergens.length} allergen${selectedAllergens.length > 1 ? 's' : ''} selected`
                    : "Select allergens to avoid"
                  }
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                {allergensLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading allergens...</div>
                ) : allergensError ? (
                  <div className="p-4 text-center text-sm text-red-500">Failed to load allergens</div>
                ) : allergens.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No allergens available</div>
                ) : (
                  <ScrollArea className="h-60">
                    <div className="p-2">
                      {allergens.map((allergen: Allergen) => (
                        <div
                          key={allergen.id}
                          className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={() => handleAllergenToggle(allergen.id)}
                          data-testid={`checkbox-allergen-${allergen.id}`}
                        >
                          <Checkbox
                            id={`allergen-${allergen.id}`}
                            checked={selectedAllergens.includes(allergen.id)}
                            onChange={() => handleAllergenToggle(allergen.id)}
                          />
                          <label 
                            htmlFor={`allergen-${allergen.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {allergen.name}
                          </label>
                          {selectedAllergens.includes(allergen.id) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Special Instructions */}
          <div className="mt-6">
            <h3 className="font-semibold text-black text-base mb-3">Special Instructions</h3>
            <Textarea
              placeholder="Any special requests for your order (optional)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="textarea-cart-special-instructions"
            />
              </div>
              
              <Button 
                onClick={handleProceedToPayment}
                className="w-full configurable-primary text-white py-4 text-base font-medium hover:configurable-primary-hover rounded-lg mt-6"
                disabled={displayItems.length === 0 || showBranchSummary}
                data-testid="button-proceed-to-payment"
              >
                {showBranchSummary ? 'Select a branch to proceed' :
                 serviceType === 'delivery' ? 'Enter Delivery Details' : 
                 serviceType === 'takeaway' ? 'Enter Pickup Details' : 'Proceed to Payment'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
