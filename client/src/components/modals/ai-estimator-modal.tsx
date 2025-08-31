import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/store";
import { Users, DollarSign, Pizza, Sandwich, Coffee, ChefHat, Cake, Plus, Bot, Sparkles, Clock, TrendingUp, Info, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";

interface AiEstimatorModalProps {}

interface CategoryCombo {
  categoryName: string;
  icon: React.ReactNode;
  items: {
    name: string;
    quantity: number;
    price: number;
    menuItemId: number;
  }[];
  totalPrice: number;
}

export default function AiEstimatorModal() {
  const { isAiEstimatorModalOpen, setAiEstimatorModalOpen, selectedBranch, addItem } = useCartStore();
  const [step, setStep] = useState<'input' | 'suggestions'>('input');
  
  // Form state
  const [groupSize, setGroupSize] = useState<number>(2);
  const [budget, setBudget] = useState<number>(5000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mealType, setMealType] = useState<string>('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  
  // Get branch ID
  const getBranchId = () => {
    if (selectedBranch?.branchId) return selectedBranch.branchId;
    const urlParams = new URLSearchParams(window.location.search);
    const urlBranchId = urlParams.get('branchId');
    return urlBranchId ? parseInt(urlBranchId, 10) : 1;
  };

  const branchId = getBranchId();

  const { data: menuData } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  // Get unique categories
  const categoryList = apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [];
  const uniqueCategories = categoryList.filter((value, index, self) => self.indexOf(value) === index);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('pizza')) return <Pizza className="w-5 h-5" />;
    if (name.includes('burger')) return <Sandwich className="w-5 h-5" />;
    if (name.includes('drink') || name.includes('beverage')) return <Coffee className="w-5 h-5" />;
    if (name.includes('dessert') || name.includes('sweet')) return <Cake className="w-5 h-5" />;
    return <ChefHat className="w-5 h-5" />;
  };

  // AI Logic to generate category-wise suggestions
  const generateAiSuggestions = (): CategoryCombo[] => {
    if (!apiMenuData?.menuItems) return [];

    const categoriesData = selectedCategories.length > 0 ? selectedCategories : uniqueCategories;
    const budgetPerCategory = Math.floor(budget / categoriesData.length);
    const budgetPerPerson = budget / groupSize;

    const suggestions: CategoryCombo[] = [];

    categoriesData.forEach(categoryName => {
      const categoryItems = apiMenuData.menuItems.filter(item => 
        item.categoryName === categoryName
      );

      if (categoryItems.length === 0) return;

      // Sort by price to optimize budget distribution
      const sortedItems = categoryItems.sort((a, b) => {
        const priceA = a.variations?.[0]?.price || 0;
        const priceB = b.variations?.[0]?.price || 0;
        return priceA - priceB;
      });

      const combo: CategoryCombo = {
        categoryName,
        icon: getCategoryIcon(categoryName),
        items: [],
        totalPrice: 0
      };

      let remainingBudget = budgetPerCategory;
      let currentIndex = 0;

      // Try to get at least one item per person for main categories
      const isMainCategory = !categoryName.toLowerCase().includes('drink') && 
                           !categoryName.toLowerCase().includes('dessert') &&
                           !categoryName.toLowerCase().includes('side');

      if (isMainCategory) {
        // Prioritize getting one item per person
        for (let person = 0; person < groupSize && currentIndex < sortedItems.length; person++) {
          const item = sortedItems[currentIndex];
          const itemPrice = item.variations?.[0]?.price || 0;
          
          if (itemPrice <= remainingBudget) {
            const existingItem = combo.items.find(i => i.menuItemId === item.menuItemId);
            if (existingItem) {
              existingItem.quantity++;
            } else {
              combo.items.push({
                name: item.name,
                quantity: 1,
                price: itemPrice,
                menuItemId: item.menuItemId
              });
            }
            combo.totalPrice += itemPrice;
            remainingBudget -= itemPrice;
          }
        }
      }

      // Fill remaining budget with additional items
      while (remainingBudget > 0 && currentIndex < sortedItems.length) {
        const item = sortedItems[currentIndex];
        const itemPrice = item.variations?.[0]?.price || 0;
        
        if (itemPrice <= remainingBudget) {
          const existingItem = combo.items.find(i => i.menuItemId === item.menuItemId);
          if (existingItem) {
            existingItem.quantity++;
          } else {
            combo.items.push({
              name: item.name,
              quantity: 1,
              price: itemPrice,
              menuItemId: item.menuItemId
            });
          }
          combo.totalPrice += itemPrice;
          remainingBudget -= itemPrice;
        } else {
          currentIndex++;
        }
      }

      if (combo.items.length > 0) {
        suggestions.push(combo);
      }
    });

    return suggestions;
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  const handleGenerateSuggestions = () => {
    if (groupSize > 0 && budget > 0) {
      setStep('suggestions');
    }
  };

  const handleAddComboToCart = (combo: CategoryCombo) => {
    // Add each item in the combo to cart
    combo.items.forEach(item => {
      const menuItem = apiMenuData?.menuItems.find(m => m.menuItemId === item.menuItemId);
      if (menuItem) {
        for (let i = 0; i < item.quantity; i++) {
          addItem(menuItem);
        }
      }
    });
    setAiEstimatorModalOpen(false);
    useCartStore.getState().setCartOpen(true);
  };

  const suggestions = step === 'suggestions' ? generateAiSuggestions() : [];
  const totalSuggestedCost = suggestions.reduce((sum, combo) => sum + combo.totalPrice, 0);

  return (
    <Dialog open={isAiEstimatorModalOpen} onOpenChange={setAiEstimatorModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-black flex items-center gap-2">
            <Bot className="w-6 h-6 configurable-primary-text" />
            AI Budget Estimator
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-6 pt-6">
            {/* Group Size */}
            <div className="space-y-2">
              <Label htmlFor="group-size" className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Group Size
              </Label>
              <Input
                id="group-size"
                type="number"
                min="1"
                max="20"
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                className="w-full"
                data-testid="input-group-size"
              />
            </div>

            {/* Budget */}
            <div className="space-y-3">
              <Label htmlFor="budget" className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Budget (PKR)
              </Label>
              <Input
                id="budget"
                type="number"
                min="500"
                step="100"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value) || 500)}
                className="w-full"
                data-testid="input-budget"
              />
              <p className="text-sm text-gray-600">
                About PKR {Math.round(budget / groupSize)} per person
              </p>
              
              {/* Popular Budget Suggestions */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Popular Budget Ranges</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Light', range: '1000-2000', perPerson: '500-1000' },
                    { label: 'Standard', range: '2000-5000', perPerson: '1000-2500' },
                    { label: 'Premium', range: '5000+', perPerson: '2500+' }
                  ].map((option) => (
                    <Button
                      key={option.label}
                      variant="outline"
                      size="sm"
                      className="h-auto p-2 flex flex-col items-center text-xs"
                      onClick={() => setBudget(parseInt(option.range.split('-')[0]))}
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-gray-600">{option.perPerson}/person</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>


            {/* Meal Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Meal Type (Optional)
              </Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">🌅 Breakfast (8 AM - 11 AM)</SelectItem>
                  <SelectItem value="lunch">☀️ Lunch (11 AM - 4 PM)</SelectItem>
                  <SelectItem value="dinner">🌙 Dinner (4 PM - 11 PM)</SelectItem>
                  <SelectItem value="snack">🍿 Snacks & Light Bites</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dietary Preferences (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Vegetarian', 'Spicy', 'Low Calorie', 'Family Friendly'].map(pref => (
                  <div key={pref} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pref-${pref}`}
                      checked={dietaryPrefs.includes(pref)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDietaryPrefs(prev => [...prev, pref]);
                        } else {
                          setDietaryPrefs(prev => prev.filter(p => p !== pref));
                        }
                      }}
                    />
                    <Label htmlFor={`pref-${pref}`} className="text-sm">
                      {pref}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Food Categories (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {uniqueCategories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Smart Ordering Tips</span>
              </div>
              <div className="space-y-2 text-xs text-green-700">
                <div className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Budget 20% extra for drinks and desserts</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Combo meals often provide better value than individual items</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Consider sharing family-sized portions for groups of 3+</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>AI suggestions prioritize variety and balanced nutrition</span>
                </div>
              </div>
            </div>

            {/* How AI Works */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">How Our AI Works</span>
              </div>
              <div className="text-xs text-purple-700 space-y-2">
                <p>Our smart algorithm analyzes your preferences and creates personalized food combinations that:</p>
                <div className="grid grid-cols-1 gap-1 ml-2">
                  <span>• Maximize variety within your budget</span>
                  <span>• Balance nutritional value and taste</span>
                  <span>• Consider group sharing opportunities</span>
                  <span>• Optimize price-per-person ratios</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <Button
                onClick={handleGenerateSuggestions}
                className="w-full configurable-primary hover:configurable-primary-hover text-white py-3"
                disabled={groupSize <= 0 || budget <= 0}
                data-testid="button-generate-ai-suggestions"
              >
                <Bot className="w-4 h-4 mr-2" />
                Generate AI Suggestions
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Get personalized meal combinations in seconds
              </p>
            </div>
          </div>
        )}

        {step === 'suggestions' && (
          <div className="space-y-6 pt-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Request</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Group size: {groupSize} people</p>
                <p>Budget: PKR {budget}</p>
                <p>Per person: PKR {Math.round(budget / groupSize)}</p>
                {selectedCategories.length > 0 && (
                  <p>Categories: {selectedCategories.join(', ')}</p>
                )}
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">AI Recommendations</h3>
                <Badge className="configurable-primary text-white">
                  Total: PKR {totalSuggestedCost}
                </Badge>
              </div>

              {suggestions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-600">No suitable combinations found within your budget. Try increasing your budget or adjusting preferences.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {suggestions.map((combo, index) => (
                    <Card key={index} className="border-2 hover:border-gray-300 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {combo.icon}
                          {combo.categoryName} Combo
                          <Badge variant="outline">PKR {combo.totalPrice}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 mb-4">
                          {combo.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">PKR {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            {Math.floor(combo.items.reduce((sum, item) => sum + item.quantity, 0) / groupSize)} items per person
                          </div>
                          <Button
                            onClick={() => handleAddComboToCart(combo)}
                            className="configurable-primary hover:configurable-primary-hover text-white"
                            data-testid={`button-add-combo-${index}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Combo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Budget remaining */}
              {totalSuggestedCost < budget && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">Budget Remaining</p>
                        <p className="text-sm text-green-600">You have PKR {budget - totalSuggestedCost} left for extras!</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        PKR {budget - totalSuggestedCost}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('input')}
                className="flex-1"
                data-testid="button-back-to-input"
              >
                Back to Input
              </Button>
              <Button
                onClick={() => setAiEstimatorModalOpen(false)}
                className="flex-1 configurable-primary hover:configurable-primary-hover text-white"
                data-testid="button-close-estimator"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}