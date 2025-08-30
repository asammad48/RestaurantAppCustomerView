import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiDeal } from "@/lib/mock-data";

export default function AddToCartModal() {
  const { isAddToCartModalOpen, setAddToCartModalOpen, addItem, lastAddedItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
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
      setSpecialInstructions("");
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

  const getTotalPrice = () => {
    if (!lastAddedItem) return 0;
    
    let basePrice = 0;
    
    if ('variations' in lastAddedItem) {
      // For menu items
      const menuItem = lastAddedItem as ApiMenuItem;
      if (selectedVariation && menuItem.variations) {
        const variation = menuItem.variations.find(v => v.id === selectedVariation);
        basePrice = variation?.price || 0;
      } else if (menuItem.variations && menuItem.variations.length > 0) {
        basePrice = menuItem.variations[0].price;
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
      
      // Apply discount if available
      if (menuItem.discount && menuItem.discount.value > 0) {
        basePrice = basePrice - (basePrice * menuItem.discount.value / 100);
      }
    } else if ('dealId' in lastAddedItem) {
      // For deals
      const deal = lastAddedItem as ApiDeal;
      basePrice = deal.price;
      
      // Apply discount if available
      if (deal.discount && deal.discount.value > 0) {
        basePrice = basePrice - (basePrice * deal.discount.value / 100);
      }
    }
    
    return basePrice * quantity;
  };

  const handleAddToCart = () => {
    if (!lastAddedItem) return;
    
    let customization: any = {
      instructions: specialInstructions,
    };

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
    const itemWithCustomization = {
      ...lastAddedItem,
      price: finalPrice.toString(),
      customization,
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
    setSpecialInstructions("");
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
        <div className="configurable-secondary p-4 rounded-lg border configurable-border">
          <h3 className="font-semibold text-lg configurable-text-primary mb-3">Deal Includes:</h3>
          
          {/* Menu Items */}
          {deal.menuItems && deal.menuItems.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium configurable-text-primary mb-2">Main Items:</h4>
              <ul className="space-y-2">
                {deal.menuItems.map((item) => (
                  <li key={item.menuItemId} className="configurable-surface p-3 rounded-lg border configurable-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="w-2 h-2 configurable-primary rounded-full mr-2"></span>
                          <span className="font-medium configurable-text-primary">{item.name}</span>
                        </div>
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
          <div className="mt-3 pt-3 border-t configurable-border">
            <div className="bg-gray-100 p-2 rounded">
              <p className="text-xs configurable-text-primary font-medium">
                Valid until: {new Date(deal.dealEndDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Deal Variants/Customizations */}
        <div>
          <h3 className="font-bold text-lg mb-3">Deal Options</h3>
          <div className="configurable-secondary p-3 rounded-lg border configurable-border">
            <div className="flex justify-between items-center">
              <span className="font-medium configurable-text-primary">Standard Deal</span>
              <span className="text-sm font-bold">PKR {deal.price.toFixed(2)}</span>
            </div>
            {deal.discount && deal.discount.value > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded">
                <p className="text-xs text-green-700 font-medium">
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
                      ? 'configurable-secondary border-2 configurable-border configurable-primary-text' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{variation.name}</span>
                    <span className="text-sm font-bold">PKR {variation.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers Section */}
        {menuItem.modifiers && menuItem.modifiers.length > 0 && (
          <Collapsible open={modifiersOpen} onOpenChange={setModifiersOpen}>
            <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
              Modifiers
              {modifiersOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {menuItem.modifiers.map((modifier) => (
                <div key={modifier.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{modifier.name}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">PKR {modifier.price.toFixed(2)}</span>
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
                <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
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
                          ? 'configurable-secondary border configurable-border' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{option.name}</span>
                        {option.price > 0 && (
                          <span className="text-xs font-medium">+PKR {option.price.toFixed(2)}</span>
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

          {/* Special Instructions */}
          <div>
            <h3 className="font-bold text-lg mb-3">Special Instructions</h3>
            <Textarea
              placeholder="Write your instruction"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

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
              PKR {getTotalPrice().toFixed(2)} Add to cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}