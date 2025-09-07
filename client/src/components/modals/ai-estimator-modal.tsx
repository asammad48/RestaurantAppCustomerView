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
import { BudgetOption, BudgetMenuItem, BudgetMenuPackage, BudgetEstimateResponse } from "@/lib/api-client";

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

  const { data: menuData, isLoading: isMenuLoading, error: menuError } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
  });

  const apiMenuData = menuData as ApiMenuResponse;
  
  // Debug logging for menu data
  console.log('🤖 AI Estimator: Menu data state', {
    branchId,
    isMenuLoading,
    menuError,
    hasMenuData: !!menuData,
    menuItemsCount: apiMenuData?.menuItems?.length || 0,
    dealsCount: apiMenuData?.deals?.length || 0,
    menuData: apiMenuData
  });

  // Get unique categories
  const categoryList = apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [];
  const uniqueCategories = categoryList.filter((value, index, self) => self.indexOf(value) === index);

  // Debug logging for categories
  console.log('🤖 AI Estimator: Categories processed', {
    categoryList,
    uniqueCategories,
    totalMenuItems: apiMenuData?.menuItems?.length
  });

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('pizza')) return <Pizza className="w-5 h-5" />;
    if (name.includes('burger')) return <Sandwich className="w-5 h-5" />;
    if (name.includes('drink') || name.includes('beverage')) return <Coffee className="w-5 h-5" />;
    if (name.includes('dessert') || name.includes('sweet')) return <Cake className="w-5 h-5" />;
    return <ChefHat className="w-5 h-5" />;
  };

  // AI Logic to generate budget options in the new format
  const generateBudgetOptions = (): BudgetOption[] => {
    if (!apiMenuData?.menuItems) return [];

    const budgetOptions: BudgetOption[] = [];
    console.log('🤖 AI Estimator: Generating budget options for', { groupSize, budget, selectedCategories });
    console.log('🤖 AI ESTIMATOR: Full API Menu Data Structure', {
      hasMenuData: !!apiMenuData,
      menuItemsCount: apiMenuData?.menuItems?.length || 0,
      dealsCount: apiMenuData?.deals?.length || 0,
      menuItems: apiMenuData?.menuItems?.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        variationsCount: item.variations?.length || 0,
        variations: item.variations?.map(v => ({ id: v.id, name: v.name, price: v.price }))
      })) || []
    });

    // Get available items with their variations
    const availableItems = apiMenuData.menuItems
      .filter(item => item.variations && item.variations.length > 0)
      .filter(item => selectedCategories.length === 0 || selectedCategories.includes(item.categoryName));

    if (availableItems.length === 0) return budgetOptions;

    // Option 1: Single item suggestion (like the Pizza Pepperoni example)
    const pizzaItems = availableItems.filter(item => 
      item.name.toLowerCase().includes('pizza') || 
      item.categoryName.toLowerCase().includes('pizza')
    );
    
    if (pizzaItems.length > 0) {
      const pizzaItem = pizzaItems[0];
      console.log('🤖 AI ESTIMATOR: Selected pizza item for budget options', {
        menuItemId: pizzaItem.menuItemId,
        name: pizzaItem.name,
        availableVariations: pizzaItem.variations?.map(v => ({ id: v.id, name: v.name, price: v.price }))
      });
      
      const smallVariation = pizzaItem.variations?.find(v => 
        v.name.toLowerCase().includes('small') || v.name.toLowerCase().includes('regular')
      ) || pizzaItem.variations[0];
      
      console.log('🤖 AI ESTIMATOR: Selected variation for budget option', {
        variationFound: !!smallVariation,
        variation: smallVariation ? { id: smallVariation.id, name: smallVariation.name, price: smallVariation.price } : null
      });

      // Single pizza for 3 people
      const singlePizzaOption: BudgetOption = {
        totalCost: smallVariation.price,
        totalPeopleServed: 3,
        isWithinBudget: smallVariation.price <= budget,
        menuPackages: [],
        menuItems: [{
          menuItemId: pizzaItem.menuItemId,
          name: pizzaItem.name,
          selectedVariantId: smallVariation.id,
          variantName: smallVariation.name,
          variantPrice: smallVariation.price,
          personServing: 3,
          quantity: 1,
          menuPicture: pizzaItem.picture
        }]
      };
      
      console.log('🤖 AI ESTIMATOR: Created single pizza budget option', {
        menuItem: singlePizzaOption.menuItems[0],
        hasSelectedVariantId: !!singlePizzaOption.menuItems[0].selectedVariantId,
        hasVariantName: !!singlePizzaOption.menuItems[0].variantName,
        hasVariantPrice: !!singlePizzaOption.menuItems[0].variantPrice
      });

      // Double pizza for 6 people
      const doublePizzaOption: BudgetOption = {
        totalCost: smallVariation.price * 2,
        totalPeopleServed: 6,
        isWithinBudget: (smallVariation.price * 2) <= budget,
        menuPackages: [],
        menuItems: [{
          menuItemId: pizzaItem.menuItemId,
          name: pizzaItem.name,
          selectedVariantId: smallVariation.id,
          variantName: smallVariation.name,
          variantPrice: smallVariation.price,
          personServing: 3,
          quantity: 2,
          menuPicture: pizzaItem.picture
        }]
      };

      budgetOptions.push(singlePizzaOption, doublePizzaOption);
    }

    // Option 2: Create a package deal from available deals
    if (apiMenuData.deals && apiMenuData.deals.length > 0) {
      const pizzaDeal = apiMenuData.deals.find(deal => 
        deal.name.toLowerCase().includes('pizza') ||
        deal.description.toLowerCase().includes('pizza')
      );

      if (pizzaDeal) {
        const packageOption: BudgetOption = {
          totalCost: pizzaDeal.price,
          totalPeopleServed: 9,
          isWithinBudget: pizzaDeal.price <= budget,
          menuPackages: [{
            id: pizzaDeal.dealId,
            name: pizzaDeal.name,
            description: pizzaDeal.description,
            price: pizzaDeal.price,
            personServing: 9,
            itemNames: [pizzaItems[0]?.name || "Pizza Pepperoni"],
            quantity: 1,
            packagePicture: pizzaDeal.picture
          }],
          menuItems: []
        };
        budgetOptions.push(packageOption);
      }
    }

    // Add more variety if we have budget left
    if (budgetOptions.length > 0) {
      const remainingBudget = budget - Math.min(...budgetOptions.map(opt => opt.totalCost));
      if (remainingBudget > 0) {
        // Try to add complementary items
        const drinkItems = availableItems.filter(item => 
          item.categoryName.toLowerCase().includes('drink') ||
          item.categoryName.toLowerCase().includes('beverage')
        );

        if (drinkItems.length > 0) {
          const drink = drinkItems[0];
          const drinkVariation = drink.variations[0];
          
          // Add drinks to the first option if budget allows
          if (budgetOptions[0] && (budgetOptions[0].totalCost + drinkVariation.price * groupSize) <= budget) {
            budgetOptions[0].menuItems.push({
              menuItemId: drink.menuItemId,
              name: drink.name,
              selectedVariantId: drinkVariation.id,
              variantName: drinkVariation.name,
              variantPrice: drinkVariation.price,
              personServing: 1,
              quantity: groupSize,
              menuPicture: drink.picture
            });
            budgetOptions[0].totalCost += drinkVariation.price * groupSize;
            budgetOptions[0].totalPeopleServed = groupSize;
          }
        }
      }
    }

    console.log('🤖 AI Estimator: Generated budget options:', budgetOptions);
    return budgetOptions.filter(option => option.isWithinBudget);
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  const handleGenerateSuggestions = () => {
    console.log('🤖 AI Estimator: Generate suggestions clicked', {
      groupSize,
      budget,
      selectedCategories,
      mealType,
      dietaryPrefs
    });
    
    if (groupSize > 0 && budget > 0) {
      console.log('🤖 AI Estimator: Validation passed, switching to suggestions step');
      setStep('suggestions');
    } else {
      console.log('🤖 AI Estimator: Validation failed', { groupSize, budget });
    }
  };

  const handleAddBudgetOptionToCart = (budgetOption: BudgetOption) => {
    console.log('🛒 AI ESTIMATOR: Starting to add budget option to cart', {
      totalCost: budgetOption.totalCost,
      menuItemsCount: budgetOption.menuItems.length,
      packagesCount: budgetOption.menuPackages.length,
      budgetOption
    });
    alert('DEBUG: Adding budget option to cart - Check console for details!');
    
    // Add menu items to cart
    budgetOption.menuItems.forEach((budgetItem, index) => {
      console.log(`🛒 AI ESTIMATOR: Processing menu item ${index + 1}/${budgetOption.menuItems.length}`, {
        itemName: budgetItem.name,
        menuItemId: budgetItem.menuItemId,
        quantity: budgetItem.quantity,
        selectedVariantId: budgetItem.selectedVariantId,
        variantName: budgetItem.variantName,
        variantPrice: budgetItem.variantPrice
      });
      
      const menuItem = apiMenuData?.menuItems.find(m => m.menuItemId === budgetItem.menuItemId);
      if (menuItem) {
        console.log('🛒 AI ESTIMATOR: Found matching menu item in API data', {
          foundItem: menuItem.name,
          hasVariations: !!menuItem.variations,
          variationsCount: menuItem.variations?.length || 0
        });
        
        // Find the specific variation
        const selectedVariation = menuItem.variations?.find(v => v.id === budgetItem.selectedVariantId);
        if (selectedVariation) {
          console.log('🛒 AI ESTIMATOR: Found matching variation', {
            variationId: selectedVariation.id,
            variationName: selectedVariation.name,
            price: selectedVariation.price
          });
          
          // Create enhanced menu item with variant details
          const enhancedMenuItem = {
            ...menuItem,
            selectedVariantId: budgetItem.selectedVariantId,
            variantName: budgetItem.variantName,
            variantPrice: budgetItem.variantPrice,
            menuPicture: budgetItem.menuPicture
          };
          
          console.log('🛒 AI ESTIMATOR: Created enhanced menu item', enhancedMenuItem);
          console.log('🛒 AI ESTIMATOR: Variant Details Comparison', {
            budgetItemVariant: {
              selectedVariantId: budgetItem.selectedVariantId,
              variantName: budgetItem.variantName,
              variantPrice: budgetItem.variantPrice
            },
            foundVariation: {
              id: selectedVariation.id,
              name: selectedVariation.name,
              price: selectedVariation.price
            },
            enhancedItemVariant: {
              selectedVariantId: enhancedMenuItem.selectedVariantId,
              variantName: enhancedMenuItem.variantName,
              variantPrice: enhancedMenuItem.variantPrice
            }
          });
          
          for (let i = 0; i < budgetItem.quantity; i++) {
            console.log(`🛒 AI ESTIMATOR: Adding menu item ${i + 1}/${budgetItem.quantity} to cart`, {
              itemName: enhancedMenuItem.name,
              variantName: budgetItem.variantName,
              price: budgetItem.variantPrice
            });
            console.log('🛒 AI ESTIMATOR: About to call addItem with:', {
              item: {
                name: enhancedMenuItem.name,
                id: enhancedMenuItem.menuItemId,
                selectedVariantId: enhancedMenuItem.selectedVariantId,
                variantPrice: enhancedMenuItem.variantPrice
              },
              variation: budgetItem.variantName
            });
            addItem(enhancedMenuItem, budgetItem.variantName);
          }
        } else {
          console.log('🛒 AI ESTIMATOR: Variation not found!', {
            lookingFor: budgetItem.selectedVariantId,
            availableVariations: menuItem.variations?.map(v => ({ id: v.id, name: v.name }))
          });
        }
      } else {
        console.log('🛒 AI ESTIMATOR: Menu item not found!', {
          lookingFor: budgetItem.menuItemId,
          budgetItem
        });
      }
    });
    
    // Add packages to cart
    budgetOption.menuPackages.forEach((packageItem, index) => {
      console.log(`🛒 AI ESTIMATOR: Processing package ${index + 1}/${budgetOption.menuPackages.length}`, {
        packageName: packageItem.name,
        packageId: packageItem.id,
        quantity: packageItem.quantity,
        price: packageItem.price
      });
      
      const dealItem = apiMenuData?.deals?.find(d => d.dealId === packageItem.id);
      if (dealItem) {
        console.log('🛒 AI ESTIMATOR: Found matching deal in API data', {
          foundDeal: dealItem.name,
          dealId: dealItem.dealId
        });
        
        const enhancedPackage = {
          ...dealItem,
          packagePicture: packageItem.packagePicture
        };
        
        console.log('🛒 AI ESTIMATOR: Created enhanced package', enhancedPackage);
        
        for (let i = 0; i < packageItem.quantity; i++) {
          console.log(`🛒 AI ESTIMATOR: Adding package ${i + 1}/${packageItem.quantity} to cart`, {
            packageName: enhancedPackage.name
          });
          addItem(enhancedPackage);
        }
      } else {
        console.log('🛒 AI ESTIMATOR: Package not found!', {
          lookingFor: packageItem.id,
          packageItem
        });
      }
    });
    
    console.log('🛒 AI ESTIMATOR: Finished adding all items, closing modal and opening cart');
    setAiEstimatorModalOpen(false);
    useCartStore.getState().setCartOpen(true);
  };

  const budgetOptions = step === 'suggestions' ? generateBudgetOptions() : [];
  const totalSuggestedCost = budgetOptions.reduce((sum, option) => sum + option.totalCost, 0);

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

            {/* Budget Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Budget Options</h3>
                <div className="flex gap-2">
                  <Badge className="configurable-primary text-white">
                    {budgetOptions.length} Options Found
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Step: {step}
                  </Badge>
                </div>
              </div>

              {/* Debug Info Panel */}
              <div className="bg-gray-50 p-3 rounded text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>Branch ID: {branchId}</p>
                <p>Menu Items: {apiMenuData?.menuItems?.length || 0}</p>
                <p>Deals: {apiMenuData?.deals?.length || 0}</p>
                <p>Budget: PKR {budget}, Group: {groupSize}</p>
                <p>Categories: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'All'}</p>
              </div>

              {budgetOptions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-600">No suitable combinations found within your budget. Try increasing your budget or adjusting preferences.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {budgetOptions.map((option, index) => (
                    <Card key={index} className="border-2 hover:border-gray-300 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <ChefHat className="w-5 h-5" />
                          Option {index + 1}
                          <Badge variant="outline" className={option.isWithinBudget ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                            PKR {option.totalCost}
                          </Badge>
                        </CardTitle>
                        <div className="text-sm text-gray-600">
                          Serves {option.totalPeopleServed} people • PKR {Math.round(option.totalCost / option.totalPeopleServed)} per person
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Menu Items */}
                        {option.menuItems.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Menu Items:</h4>
                            {option.menuItems.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                <div>
                                  <span className="font-medium">{item.quantity}x {item.name}</span>
                                  <div className="text-xs text-gray-500">
                                    {item.variantName} • Serves {item.personServing}
                                  </div>
                                </div>
                                <span className="font-medium">PKR {item.variantPrice * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Menu Packages */}
                        {option.menuPackages.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Package Deals:</h4>
                            {option.menuPackages.map((packageItem, packageIndex) => (
                              <div key={packageIndex} className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                                <div>
                                  <span className="font-medium">{packageItem.quantity}x {packageItem.name}</span>
                                  <div className="text-xs text-gray-500">
                                    {packageItem.description} • Serves {packageItem.personServing}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    Includes: {packageItem.itemNames.join(', ')}
                                  </div>
                                </div>
                                <span className="font-medium">PKR {packageItem.price * packageItem.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm">
                            <span className={`font-medium ${option.isWithinBudget ? 'text-green-600' : 'text-red-600'}`}>
                              {option.isWithinBudget ? '✓ Within Budget' : '✗ Over Budget'}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleAddBudgetOptionToCart(option)}
                            className="configurable-primary hover:configurable-primary-hover text-white"
                            disabled={!option.isWithinBudget}
                            data-testid={`button-add-option-${index}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Cart
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Budget Summary */}
              {budgetOptions.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-800">Your Budget</p>
                        <p className="text-blue-600">PKR {budget}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">Best Option</p>
                        <p className="text-blue-600">PKR {Math.min(...budgetOptions.map(o => o.totalCost))}</p>
                      </div>
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