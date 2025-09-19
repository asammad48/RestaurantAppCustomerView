import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiDeal } from "@/lib/mock-data";
import { formatToLocalTime, formatBranchCurrency } from '@/lib/utils';

export default function AddToCartModal() {
  const { isAddToCartModalOpen, setAddToCartModalOpen, addItem, lastAddedItem, selectedBranch, branchCurrency } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<{[key: number]: number}>({});
  const [selectedCustomizations, setSelectedCustomizations] = useState<{[key: number]: number}>({});
  
  // Reset selections when modal opens or closes
  useEffect(() => {
    if (!isAddToCartModalOpen) {
      // Clear all selections when modal is closed
      setQuantity(1);
      setSelectedVariation(null);
      setSelectedModifiers({});
      setSelectedCustomizations({});
    } else if (lastAddedItem && 'variations' in lastAddedItem && lastAddedItem.variations && lastAddedItem.variations.length > 0) {
      // Set default variation when modal opens
      setSelectedVariation(lastAddedItem.variations[0].id);
    }
  }, [isAddToCartModalOpen, lastAddedItem]);
  
  // Collapsible states
  const [modifiersOpen, setModifiersOpen] = useState(true);
  const [customizationsOpen, setCustomizationsOpen] = useState(false);

  const updateModifierQuantity = (modifierId: number, change: number) => {
    setSelectedModifiers(prev => {
      const currentQty = prev[modifierId] || 0;
      const newQty = Math.max(0, currentQty + change);
      if (newQty === 0) {
        const { [modifierId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [modifierId]: newQty };
    });
  };

  const selectCustomizationOption = (customizationId: number, optionId: number) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [customizationId]: optionId
    }));
  };

  // Helper function to calculate discounted price from original price and discount percentage
  const calculateDiscountedPrice = (originalPrice: number, discountPercentage: number) => {
    return originalPrice - (originalPrice * discountPercentage / 100);
  };

  const getTotalPrice = () => {
    if (!lastAddedItem) return 0;
    
    let basePrice = 0;
    
    if ('variations' in lastAddedItem) {
      // For menu items
      const menuItem = lastAddedItem as ApiMenuItem;
      if (selectedVariation && menuItem.variations) {
        const variation = menuItem.variations.find(v => v.id === selectedVariation);
        if (variation) {
          // Use discounted price if available, otherwise calculate from discount percentage, or use regular price
          if (variation.discountedPrice && variation.discountedPrice < variation.price) {
            basePrice = variation.discountedPrice;
          } else if (menuItem.discount && menuItem.discount.value > 0) {
            basePrice = calculateDiscountedPrice(variation.price, menuItem.discount.value);
          } else {
            basePrice = variation.price;
          }
        }
      } else if (menuItem.variations && menuItem.variations.length > 0) {
        const firstVariation = menuItem.variations[0];
        if (firstVariation.discountedPrice && firstVariation.discountedPrice < firstVariation.price) {
          basePrice = firstVariation.discountedPrice;
        } else if (menuItem.discount && menuItem.discount.value > 0) {
          basePrice = calculateDiscountedPrice(firstVariation.price, menuItem.discount.value);
        } else {
          basePrice = firstVariation.price;
        }
      }
      
      // Add modifiers price
      const modifiersPrice = Object.entries(selectedModifiers).reduce((total, [modifierId, qty]) => {
        const modifier = menuItem.modifiers?.find(m => m.id === parseInt(modifierId));
        return total + (modifier?.price || 0) * qty;
      }, 0);
      
      // Add customizations price
      const customizationsPrice = Object.entries(selectedCustomizations).reduce((total, [customizationId, optionId]) => {
        const customization = menuItem.customizations?.find(c => c.id === parseInt(customizationId));
        const option = customization?.options.find(o => o.id === optionId);
        return total + (option?.price || 0);
      }, 0);
      
      basePrice += modifiersPrice + customizationsPrice;
    } else if ('dealId' in lastAddedItem) {
      // For deals
      const deal = lastAddedItem as ApiDeal;
      // Use discounted price if available, otherwise calculate from discount percentage, or use regular price
      if (deal.discountedPrice && deal.discountedPrice < deal.price) {
        basePrice = deal.discountedPrice;
      } else if (deal.discount && deal.discount.value > 0) {
        basePrice = calculateDiscountedPrice(deal.price, deal.discount.value);
      } else {
        basePrice = deal.price;
      }
    }
    
    return basePrice * quantity;
  };

  const handleAddToCart = () => {
    if (!lastAddedItem) return;
    
    let customization: any = {};

    if ('variations' in lastAddedItem) {
      // For menu items
      customization = {
        ...customization,
        selectedVariation,
        selectedModifiers,
        selectedCustomizations,
      };
    }
    
    const finalPrice = getTotalPrice();
    
    // Get selected variation details for menu items
    let selectedVariationDetails = null;
    if ('variations' in lastAddedItem && selectedVariation) {
      selectedVariationDetails = lastAddedItem.variations.find(v => v.id === selectedVariation);
    }
    
    const itemWithCustomization = {
      ...lastAddedItem,
      price: finalPrice.toString(),
      customization,
      // Include variant details if a variation was selected
      ...(selectedVariationDetails && {
        selectedVariantId: selectedVariationDetails.id,
        variantName: selectedVariationDetails.name,
        variantPrice: selectedVariationDetails.price,
      }),
    } as any;
    
    // Add to cart with quantity
    for (let i = 0; i < quantity; i++) {
      addItem(itemWithCustomization, selectedVariation?.toString());
    }
    
    setAddToCartModalOpen(false);
    // Reset form
    setQuantity(1);
    setSelectedVariation(null);
    setSelectedModifiers({});
    setSelectedCustomizations({});
  };

  const isMenuItem = (item: any): item is ApiMenuItem => {
    return item && 'menuItemId' in item;
  };

  const isDeal = (item: any): item is ApiDeal => {
    return item && 'dealId' in item;
  };

  const renderDealContent = (deal: ApiDeal) => {
    return (
      <div className="space-y-4">
        {/* Max Allowed Amount Note */}
        {(deal.maxAllowedAmount ?? 0) > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              Max Allowed discount for the Order is {formatBranchCurrency(deal.maxAllowedAmount || 0, branchCurrency)}
            </p>
          </div>
        )}

        {/* Allergen Information for Deal */}
        {deal.allergenItemContains && (
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <h4 className="text-sm font-medium text-orange-800 mb-1">⚠️ Deal Allergen Information:</h4>
            <p className="text-sm text-orange-700">
              Contains: {deal.allergenItemContains}
            </p>
          </div>
        )}

        <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
          <h3 className="font-semibold text-lg configurable-text-primary mb-3">Deal Includes:</h3>
          
          {/* Menu Items */}
          {deal.menuItems && deal.menuItems.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium configurable-text-primary mb-2">Main Items:</h4>
              <ul className="space-y-2">
                {deal.menuItems.map((item) => (
                  <li key={item.menuItemId} className="p-3 rounded-lg border bg-white border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="w-2 h-2 configurable-primary rounded-full mr-2"></span>
                          <span className="font-medium configurable-text-primary">{item.name}</span>
                        </div>
                        
                        {/* Allergen Information for Individual Menu Item */}
                        {item.allergenItemContains && (
                          <div className="ml-4 mb-2 p-2 rounded bg-orange-50 border border-orange-200">
                            <p className="text-xs text-orange-700">
                              <span className="font-medium">⚠️ Contains:</span> {item.allergenItemContains}
                            </p>
                          </div>
                        )}
                        
                        {item.variantsDetails && item.variantsDetails.length > 0 && (
                          <div className="ml-4 space-y-1">
                            <h5 className="text-xs font-medium configurable-text-secondary mb-1">Variants:</h5>
                            {item.variantsDetails.map((variant) => (
                              <div key={variant.menuItemVariantId} className="text-xs configurable-text-secondary flex items-center justify-between">
                                <span>• {variant.name}</span>
                                <span className="font-medium">Qty: {variant.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Sub Menu Items */}
          {deal.subMenuItems && deal.subMenuItems.length > 0 && (
            <div>
              <h4 className="font-medium configurable-text-primary mb-2">Included Items:</h4>
              <ul className="space-y-1">
                {deal.subMenuItems.map((item) => (
                  <li key={item.subMenuItemId} className="flex items-center text-sm configurable-text-secondary">
                    <span className="w-2 h-2 configurable-primary rounded-full mr-2"></span>
                    {item.name} (Qty: {item.quantity})
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Deal End Date with shading */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-primary)' }}>
            <div className="p-2 rounded bg-gray-100">
              <p className="text-xs configurable-text-primary font-medium">
                Valid until: {formatToLocalTime(deal.dealEndDate, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Deal Variants/Customizations */}
        <div>
          <h3 className="font-bold text-lg mb-3">Deal Options</h3>
          <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium configurable-text-primary">Standard Deal</span>
              <div className="text-sm">
                {(deal.discountedPrice && deal.discountedPrice < deal.price) || 
                 (deal.discount && deal.discount.value > 0) ? (
                  <div className="flex items-center space-x-2">
                    <span className="font-bold configurable-primary-text">
                      {formatBranchCurrency(deal.discountedPrice || 
                            calculateDiscountedPrice(deal.price, deal.discount?.value || 0), branchCurrency)}
                    </span>
                    <span className="text-gray-500 line-through text-xs">{formatBranchCurrency(deal.price, branchCurrency)}</span>
                  </div>
                ) : (
                  <span className="font-bold configurable-text-primary">{formatBranchCurrency(deal.price, branchCurrency)}</span>
                )}
              </div>
            </div>
            {deal.discount && deal.discount.value > 0 && (
              <div className="mt-2 p-2 rounded" style={{backgroundColor: 'var(--configurable-primary-alpha-20)'}}>
                <p className="text-xs font-medium configurable-primary-text">
                  You save {deal.discount.value}% on this deal!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMenuItemContent = (menuItem: ApiMenuItem) => {
    return (
      <div className="space-y-4">
        {/* Max Allowed Amount Note */}
        {(menuItem.maxAllowedAmount ?? 0) > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              Max Allowed discount for the Order is {formatBranchCurrency(menuItem.maxAllowedAmount || 0, branchCurrency)}
            </p>
          </div>
        )}

        {/* Allergen Information */}
        {menuItem.allergenItemContains && (
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <h4 className="text-sm font-medium text-orange-800 mb-1">⚠️ Allergen Information:</h4>
            <p className="text-sm text-orange-700">
              Contains: {menuItem.allergenItemContains}
            </p>
          </div>
        )}

        {/* Variations */}
        {menuItem.variations && menuItem.variations.length > 0 && (
          <div>
            <h3 className="font-bold text-lg mb-3">Size/Variation</h3>
            <div className="space-y-2">
              {menuItem.variations.map((variation) => (
                <button
                  key={variation.id}
                  onClick={() => setSelectedVariation(variation.id)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedVariation === variation.id 
                      ? 'border-2 configurable-border configurable-primary-text' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  style={selectedVariation === variation.id ? { backgroundColor: 'var(--configurable-primary-alpha-20)' } : {}}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{variation.name}</span>
                    <div className="text-sm">
                      {(variation.discountedPrice && variation.discountedPrice < variation.price) || 
                       (menuItem.discount && menuItem.discount.value > 0) ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-bold configurable-primary-text">
                            {formatBranchCurrency((variation.discountedPrice || 
                                  calculateDiscountedPrice(variation.price, menuItem.discount?.value || 0)), branchCurrency)}
                          </span>
                          <span className="text-gray-500 line-through text-xs">{formatBranchCurrency(variation.price, branchCurrency)}</span>
                        </div>
                      ) : (
                        <span className="font-bold">{formatBranchCurrency(variation.price, branchCurrency)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers Section */}
        {menuItem.modifiers && menuItem.modifiers.length > 0 && (
          <Collapsible open={modifiersOpen} onOpenChange={setModifiersOpen}>
            <CollapsibleTrigger className="w-full p-3 rounded-lg flex items-center justify-between font-medium bg-gray-100">
              Modifiers
              {modifiersOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {menuItem.modifiers.map((modifier) => (
                <div key={modifier.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{modifier.name}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">{formatBranchCurrency(modifier.price, branchCurrency)}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateModifierQuantity(modifier.id, -1)}
                        className="w-6 h-6 rounded configurable-primary text-white flex items-center justify-center hover:configurable-primary-hover"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-medium">
                        {selectedModifiers[modifier.id] || 0}
                      </span>
                      <button
                        onClick={() => updateModifierQuantity(modifier.id, 1)}
                        className="w-6 h-6 rounded configurable-primary text-white flex items-center justify-center hover:configurable-primary-hover"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Customizations Section */}
        {menuItem.customizations && menuItem.customizations.length > 0 && (
          <div className="space-y-4">
            {menuItem.customizations.map((customization) => (
              <Collapsible key={customization.id} open={customizationsOpen} onOpenChange={setCustomizationsOpen}>
                <CollapsibleTrigger className="w-full p-3 rounded-lg flex items-center justify-between font-medium bg-gray-100">
                  {customization.name}
                  {customizationsOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {customization.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => selectCustomizationOption(customization.id, option.id)}
                      className={`w-full text-left p-2 rounded text-sm ${
                        selectedCustomizations[customization.id] === option.id 
                          ? 'border configurable-border' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={selectedCustomizations[customization.id] === option.id ? { backgroundColor: 'var(--configurable-primary-alpha-20)' } : {}}
                    >
                      <div className="flex justify-between items-center">
                        <span>{option.name}</span>
                        {option.price > 0 && (
                          <span className="text-xs font-medium">+{formatBranchCurrency(option.price, branchCurrency)}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isAddToCartModalOpen} onOpenChange={setAddToCartModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-center text-xl font-bold">
          {lastAddedItem && isDeal(lastAddedItem) ? 'Deal Details' : 'Customization'}
        </DialogTitle>

        <div className="space-y-4">
          {lastAddedItem && isDeal(lastAddedItem) && renderDealContent(lastAddedItem)}
          {lastAddedItem && isMenuItem(lastAddedItem) && renderMenuItemContent(lastAddedItem)}

          {/* Max Discount Limit Note */}
          {(selectedBranch?.maxDiscountAmount ?? 0) > 0 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">
                Max Discount Allowed limit is {formatBranchCurrency(selectedBranch?.maxDiscountAmount || 0, branchCurrency)}
              </p>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded configurable-primary text-white flex items-center justify-center hover:configurable-primary-hover"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded configurable-primary text-white flex items-center justify-center hover:configurable-primary-hover"
              >
                <Plus size={14} />
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              className="configurable-primary hover:configurable-primary-hover text-white px-8 py-3 rounded-lg font-medium"
            >
              {formatBranchCurrency(getTotalPrice(), branchCurrency)} Add to cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}