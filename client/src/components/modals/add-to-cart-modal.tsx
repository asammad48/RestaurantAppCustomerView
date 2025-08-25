import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCartStore } from "@/lib/store";

export default function AddToCartModal() {
  const { isAddToCartModalOpen, setAddToCartModalOpen, addItem, lastAddedItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedToppings, setSelectedToppings] = useState<{[key: string]: number}>({});
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedSauce, setSelectedSauce] = useState("");
  const [selectedCrust, setSelectedCrust] = useState("");
  const [allergens, setAllergens] = useState("");
  
  // Reset selections when modal opens or closes
  useEffect(() => {
    if (!isAddToCartModalOpen) {
      // Clear all selections when modal is closed
      setQuantity(1);
      setSelectedToppings({});
      setSelectedFlavour("");
      setSelectedSauce("");
      setSelectedCrust("");
      setSpecialInstructions("");
      setAllergens("");
    }
  }, [isAddToCartModalOpen]);
  
  // Collapsible states
  const [toppingsOpen, setToppingsOpen] = useState(true);
  const [flavourOpen, setFlavourOpen] = useState(false);
  const [sauceOpen, setSauceOpen] = useState(false);
  const [crustOpen, setCrustOpen] = useState(false);

  const extraToppings = [
    { name: "extraCheese", label: "Extra Cheese", price: 50 },
    { name: "pepperoni", label: "Pepperoni", price: 75 },
    { name: "mushrooms", label: "Mushrooms", price: 40 },
  ];

  const pizzaFlavours = ["Margherita", "Pepperoni", "Hawaiian", "Veggie Supreme"];
  const sauceLevels = ["Light", "Normal", "Extra"];
  const crustTypes = ["Thin", "Regular", "Thick"];

  const updateToppingQuantity = (toppingName: string, change: number) => {
    setSelectedToppings(prev => {
      const currentQty = prev[toppingName] || 0;
      const newQty = Math.max(0, currentQty + change);
      if (newQty === 0) {
        const { [toppingName]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [toppingName]: newQty };
    });
  };

  const getTotalPrice = () => {
    if (!lastAddedItem) return 0;
    const basePrice = parseFloat(lastAddedItem.price);
    const toppingsPrice = Object.entries(selectedToppings).reduce((total, [toppingName, qty]) => {
      const topping = extraToppings.find(t => t.name === toppingName);
      return total + (topping?.price || 0) * qty;
    }, 0);
    return (basePrice + toppingsPrice) * quantity;
  };

  const handleAddToCart = () => {
    if (!lastAddedItem) return;
    
    const customization = {
      toppings: selectedToppings,
      flavour: selectedFlavour,
      sauce: selectedSauce,
      crust: selectedCrust,
      instructions: specialInstructions,
    };
    
    const finalPrice = getTotalPrice().toFixed(2);
    const itemWithCustomization = {
      ...lastAddedItem,
      price: finalPrice,
      customization,
    };
    
    // Add to cart with quantity
    for (let i = 0; i < quantity; i++) {
      addItem(itemWithCustomization, "custom");
    }
    
    setAddToCartModalOpen(false);
    // Reset form
    setQuantity(1);
    setSelectedToppings({});
    setSpecialInstructions("");
    setAllergens("");
  };

  return (
    <Dialog open={isAddToCartModalOpen} onOpenChange={setAddToCartModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-center text-xl font-bold">Customization</DialogTitle>
        


        <div className="space-y-4">
          {/* Extra Toppings Section */}
          <Collapsible open={toppingsOpen} onOpenChange={setToppingsOpen}>
            <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
              Extra Toppings
              {toppingsOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {extraToppings.map((topping) => (
                <div key={topping.name} className="flex items-center justify-between py-2">
                  <span className="text-sm">{topping.label}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">Rs. {topping.price}.00</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateToppingQuantity(topping.name, -1)}
                        className="w-6 h-6 rounded configurable-primary text-white flex items-center justify-center hover:configurable-primary-hover"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-medium">
                        {selectedToppings[topping.name] || 0}
                      </span>
                      <button
                        onClick={() => updateToppingQuantity(topping.name, 1)}
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

          {/* Pizza Flavour Section */}
          <Collapsible open={flavourOpen} onOpenChange={setFlavourOpen}>
            <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
              Pizza Flavour
              {flavourOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {pizzaFlavours.map((flavour) => (
                <button
                  key={flavour}
                  onClick={() => setSelectedFlavour(flavour)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    selectedFlavour === flavour 
                      ? 'configurable-secondary border configurable-border' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {flavour}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Sauce Level Section */}
          <Collapsible open={sauceOpen} onOpenChange={setSauceOpen}>
            <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
              Sauce Level
              {sauceOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {sauceLevels.map((sauce) => (
                <button
                  key={sauce}
                  onClick={() => setSelectedSauce(sauce)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    selectedSauce === sauce 
                      ? 'configurable-secondary border configurable-border' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {sauce}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Crust Type Section */}
          <Collapsible open={crustOpen} onOpenChange={setCrustOpen}>
            <CollapsibleTrigger className="w-full bg-gray-200 p-3 rounded-lg flex items-center justify-between font-medium">
              Crust Type
              {crustOpen ? <ChevronUp className="configurable-primary-text" size={20} /> : <ChevronDown className="configurable-primary-text" size={20} />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {crustTypes.map((crust) => (
                <button
                  key={crust}
                  onClick={() => setSelectedCrust(crust)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    selectedCrust === crust 
                      ? 'configurable-secondary border configurable-border' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {crust}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Special Instructions */}
          <div>
            <h3 className="font-bold text-lg mb-3">Special Instruction</h3>
            <Textarea
              placeholder="Write your instruction"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Allergens Description */}
          <div>
            <h3 className="font-bold text-lg mb-3">Allergens Description</h3>
            <Textarea
              placeholder="Please list any allergies or dietary restrictions"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              className="min-h-[80px] resize-none"
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
              Rs. {getTotalPrice().toFixed(2)} Add to cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
