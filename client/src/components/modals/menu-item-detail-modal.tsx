import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { MenuItem, ApiMenuItem } from "@/lib/mock-data";
import { useCartStore } from "@/lib/store";
import { getImageUrl } from "@/lib/config";
import { formatBranchCurrency } from "@/lib/utils";

interface MenuItemDetailModalProps {
  item: MenuItem | ApiMenuItem;
  isOpen: boolean;
  onClose: () => void;
  isRecommended?: boolean;
}

export default function MenuItemDetailModal({
  item,
  isOpen,
  onClose,
  isRecommended = false
}: MenuItemDetailModalProps) {
  const { addItem, setAddToCartModalOpen, setLastAddedItem, branchCurrency } = useCartStore();
  
  const isApiMenuItem = (item: any): item is ApiMenuItem => {
    return 'menuItemId' in item;
  };

  const getVariations = () => {
    if (isApiMenuItem(item) && item.variations) {
      return item.variations.map(v => ({
        name: v.id.toString(),
        label: v.name,
        price: v.price
      }));
    }
    const basePrice = isApiMenuItem(item) 
      ? (item.variations && item.variations.length > 0 ? item.variations[0].price : 0)
      : parseFloat(item.price as string);
    return [
      { name: "small", label: "Small", price: basePrice * 0.8 },
      { name: "medium", label: "Medium", price: basePrice },
      { name: "large", label: "Large", price: basePrice * 1.3 },
    ];
  };

  const sizes = getVariations();
  const defaultSize = sizes.length > 0 ? sizes[0].name : "medium";
  
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const getPrice = () => {
    if (isApiMenuItem(item)) {
      return item.variations && item.variations.length > 0 ? item.variations[0].price : 0;
    }
    return parseFloat(item.price as string);
  };

  const getImage = () => {
    if (isApiMenuItem(item)) {
      return getImageUrl(item.picture);
    }
    return (item as MenuItem).image;
  };

  const getDiscount = () => {
    if (isApiMenuItem(item)) {
      return item.discount?.value || 0;
    }
    return (item as MenuItem).discount || 0;
  };

  const currentPrice = sizes.find(size => size.name === selectedSize)?.price || getPrice();
  const totalPrice = currentPrice;
  const discountPercentage = getDiscount();
  const discountedPrice = discountPercentage > 0 ? totalPrice * (1 - discountPercentage / 100) : totalPrice;
  const originalPrice = totalPrice;

  const handleAddToCart = () => {
    const selectedVariant = sizes.find(size => size.name === selectedSize);
    const variation = selectedVariant?.label || 'Medium';
    
    let selectedVariantId: number | undefined = undefined;
    if (isApiMenuItem(item) && selectedVariant) {
      selectedVariantId = parseInt(selectedVariant.name);
    }
    
    const itemWithVariation = {
      ...item,
      price: totalPrice.toFixed(2),
      selectedVariantId,
      variantName: variation,
      variantPrice: selectedVariant?.price || totalPrice,
    };
    
    setLastAddedItem(itemWithVariation);
    setAddToCartModalOpen(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        <div className="relative">
          {/* Image Section */}
          <div className="relative w-full h-48">
            <img 
              src={getImage()} 
              alt={item.name} 
              className="w-full h-full object-cover" 
            />
            {isRecommended && (
              <Badge className="absolute top-2 right-2 configurable-recommended text-white text-xs">
                Recommended
              </Badge>
            )}
            {discountPercentage > 0 && (
              <Badge className="absolute top-2 left-2 configurable-deal text-white text-xs">
                {discountPercentage}% OFF
              </Badge>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-bold configurable-text-primary mb-1">
                {item.name}
              </h3>
              <p className="text-sm configurable-text-secondary">
                {item.description}
              </p>
            </div>

            {/* Size Selection */}
            <div>
              <h4 className="text-sm font-semibold configurable-text-primary mb-2">Variation</h4>
              <div className="grid grid-cols-3 gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.name}
                    onClick={() => setSelectedSize(size.name)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      selectedSize === size.name
                        ? 'configurable-primary text-white border-transparent'
                        : 'bg-white configurable-text-secondary border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`button-variation-${size.name}`}
                  >
                    <div className="font-semibold">{size.label}</div>
                    <div className="text-xs mt-0.5">{formatBranchCurrency(size.price, branchCurrency)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price and Add to Cart */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div>
                {discountPercentage > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-xl font-bold" style={{ color: 'var(--configurable-primary)' }}>
                      {formatBranchCurrency(discountedPrice, branchCurrency)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {formatBranchCurrency(originalPrice, branchCurrency)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xl font-bold" style={{ color: 'var(--configurable-primary)' }}>
                    {formatBranchCurrency(totalPrice, branchCurrency)}
                  </span>
                )}
              </div>
              <Button 
                onClick={handleAddToCart} 
                className="configurable-primary text-white hover:configurable-primary-hover px-6 py-5 font-semibold"
                data-testid="button-add-to-cart-detail"
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
