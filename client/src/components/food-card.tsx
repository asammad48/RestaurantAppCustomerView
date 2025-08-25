import { useState } from "react";
import { MenuItem } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";

interface FoodCardProps {
  item: MenuItem;
  variant?: "grid" | "list";
}

export default function FoodCard({ item, variant = "grid" }: FoodCardProps) {
  const { addItem, setAddToCartModalOpen, setLastAddedItem } = useCartStore();
  const [selectedSize, setSelectedSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  const sizes = [
    { name: "small", label: "Small", price: parseFloat(item.price) * 0.8 },
    { name: "medium", label: "Medium", price: parseFloat(item.price) },
    { name: "large", label: "Large", price: parseFloat(item.price) * 1.3 },
    { name: "half", label: "Half", price: parseFloat(item.price) * 0.6 },
    { name: "full", label: "Full", price: parseFloat(item.price) * 1.2 },
  ];

  const toppings = [
    { name: "cheese", label: "Extra Cheese", price: 50 },
    { name: "pepperoni", label: "Pepperoni", price: 75 },
    { name: "mushrooms", label: "Mushrooms", price: 40 },
  ];

  const currentPrice = sizes.find(size => size.name === selectedSize)?.price || parseFloat(item.price);
  const totalPrice = currentPrice;
  const discountPercentage = item.discount || 0;
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
          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
          {discountPercentage > 0 && (
            <Badge className="absolute top-2 left-2 configurable-deal text-white">
              {discountPercentage}% off
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
        <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
        {discountPercentage > 0 && (
          <Badge className="absolute top-3 left-3 configurable-deal text-white">
            {discountPercentage}% off
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
