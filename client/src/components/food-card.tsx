import { useState } from "react";
import { MenuItem, ApiMenuItem } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";
import { getImageUrl } from "@/lib/config";

interface FoodCardProps {
  item: MenuItem | ApiMenuItem;
  variant?: "grid" | "list";
  isRecommended?: boolean;
}

export default function FoodCard({ item, variant = "grid", isRecommended = false }: FoodCardProps) {
  const { addItem, setAddToCartModalOpen, setLastAddedItem } = useCartStore();
  const [selectedSize, setSelectedSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  // Helper functions to work with both old and new API data
  const isApiMenuItem = (item: any): item is ApiMenuItem => {
    return 'menuItemId' in item;
  };

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

  const getCategory = () => {
    if (isApiMenuItem(item)) {
      return item.categoryName;
    }
    return (item as MenuItem).category;
  };

  const getDiscount = () => {
    if (isApiMenuItem(item)) {
      return item.discount?.value || 0;
    }
    return (item as MenuItem).discount || 0;
  };

  const getVariations = () => {
    if (isApiMenuItem(item) && item.variations) {
      return item.variations.map(v => ({
        name: v.id.toString(),
        label: v.name,
        price: v.price
      }));
    }
    // Default variations for old items
    const basePrice = getPrice();
    return [
      { name: "small", label: "Small", price: basePrice * 0.8 },
      { name: "medium", label: "Medium", price: basePrice },
      { name: "large", label: "Large", price: basePrice * 1.3 },
    ];
  };

  const sizes = getVariations();

  const toppings = [
    { name: "cheese", label: "Extra Cheese", price: 50 },
    { name: "pepperoni", label: "Pepperoni", price: 75 },
    { name: "mushrooms", label: "Mushrooms", price: 40 },
  ];

  const currentPrice = sizes.find(size => size.name === selectedSize)?.price || getPrice();
  const totalPrice = currentPrice;
  const discountPercentage = getDiscount();
  const discountedPrice = discountPercentage > 0 ? totalPrice * (1 - discountPercentage / 100) : totalPrice;
  const originalPrice = totalPrice;

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings(prev => 
      prev.includes(toppingName) 
        ? prev.filter(t => t !== toppingName)
        : [...prev, toppingName]
    );
  };

  const handleAddToCart = () => {
    const itemWithVariation = {
      ...item,
      price: totalPrice.toFixed(2),
    };
    const variation = sizes.find(size => size.name === selectedSize)?.label || 'Medium';
    setLastAddedItem(itemWithVariation);
    setAddToCartModalOpen(true);
    // Clear selections after opening modal
    setSelectedSize("medium");
    setSelectedToppings([]);
  };

  if (variant === "list") {
    return (
      <div className="food-card bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-32 h-32 flex-shrink-0">
          <img src={getImage()} alt={item.name} className="w-full h-full object-cover rounded-lg" />
          {isRecommended && (
            <Badge className="absolute top-2 right-2 configurable-recommended text-white text-xs">
              Recommended
            </Badge>
          )}
          {discountPercentage > 0 && (
            <Badge className="absolute top-2 left-2 configurable-deal text-white">
              {discountPercentage}% OFF
            </Badge>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold configurable-text-primary text-lg mb-2">{item.name}</h3>
          <p className="configurable-text-secondary text-sm mb-3">{item.description}</p>
          
          {/* Size Selection */}
          <div className="mb-3">
            <p className="text-sm font-medium configurable-text-primary mb-2">Variation</p>
            <div className="flex space-x-2">
              {sizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setSelectedSize(size.name as "small" | "medium" | "large")}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    selectedSize === size.name
                      ? 'configurable-primary text-white configurable-border'
                      : 'configurable-secondary configurable-text-secondary configurable-border hover:configurable-border'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {discountPercentage > 0 ? (
                <>
                  <span className="text-xl font-bold configurable-recommended-text">Rs. {discountedPrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through">Rs. {originalPrice.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-xl font-bold configurable-text-primary">Rs. {totalPrice.toFixed(2)}</span>
              )}
            </div>
            <Button onClick={handleAddToCart} className="configurable-primary text-white hover:configurable-primary-hover">
              Add to cart
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="food-card bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="relative">
        <img src={getImage()} alt={item.name} className="w-full h-48 object-cover" />
        {isRecommended && (
          <Badge className="absolute top-3 right-3 configurable-recommended text-white text-xs">
            Recommended
          </Badge>
        )}
        {discountPercentage > 0 && (
          <Badge className="absolute top-3 left-3 configurable-deal text-white">
            {discountPercentage}% OFF
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold configurable-text-primary mb-2">{item.name}</h3>
        <p className="text-sm configurable-text-secondary mb-3 line-clamp-2">{item.description}</p>
        
        {/* Size Selection */}
        <div className="mb-3">
          <p className="text-sm font-medium configurable-text-primary mb-2">Variation</p>
          <div className="flex space-x-2">
            {sizes.map((size) => (
              <button
                key={size.name}
                onClick={() => setSelectedSize(size.name as "small" | "medium" | "large")}
                className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedSize === size.name
                    ? 'configurable-primary text-white configurable-border'
                    : 'configurable-secondary configurable-text-secondary configurable-border hover:configurable-border'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {discountPercentage > 0 ? (
              <>
                <span className="text-lg font-bold configurable-recommended-text">Rs. {discountedPrice.toFixed(2)}</span>
                <span className="text-xs text-gray-400 line-through">Rs. {originalPrice.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-lg font-bold configurable-text-primary">Rs. {totalPrice.toFixed(2)}</span>
            )}
          </div>
          <Button 
            onClick={handleAddToCart} 
            size="sm"
            className="configurable-primary text-white hover:configurable-primary-hover"
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
