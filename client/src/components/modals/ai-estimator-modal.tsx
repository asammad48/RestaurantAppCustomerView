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
import { formatBranchCurrency } from "@/lib/utils";
import { Users, DollarSign, Pizza, Sandwich, Coffee, ChefHat, Cake, Plus, Bot, Sparkles, Clock, TrendingUp, Info, Lightbulb } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { BudgetOption, BudgetMenuItem, BudgetMenuPackage, BudgetEstimateResponse, BudgetEstimateRequest, apiClient } from "@/lib/api-client";

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
  const { isAiEstimatorModalOpen, setAiEstimatorModalOpen, selectedBranch, branchCurrency, addItem } = useCartStore();
  const [step, setStep] = useState<'input' | 'suggestions'>('input');
  
  // Form state
  const [groupSize, setGroupSize] = useState<number>(2);
  const [budget, setBudget] = useState<number>(5000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mealType, setMealType] = useState<string>('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [budgetEstimateData, setBudgetEstimateData] = useState<BudgetEstimateResponse | null>(null);
  
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


  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  // Budget estimation mutation
  const budgetEstimateMutation = useMutation({
    mutationFn: async (requestData: BudgetEstimateRequest) => {
      const response = await apiClient.getBudgetEstimate(requestData);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🤖 AI Estimator: Budget estimate received', data);
      setBudgetEstimateData(data);
      setStep('suggestions');
    },
    onError: (error) => {
      console.error('🤖 AI Estimator: Budget estimate failed', error);
    }
  });

  const handleGenerateSuggestions = () => {
    console.log('🤖 AI Estimator: Generate suggestions clicked', {
      groupSize,
      budget,
      selectedCategories,
      mealType,
      dietaryPrefs
    });
    
    if (groupSize > 0 && budget > 0) {
      console.log('🤖 AI Estimator: Validation passed, calling API');
      const requestData: BudgetEstimateRequest = {
        branchId,
        groupSize,
        maxPrice: budget,
        categories: selectedCategories
      };
      budgetEstimateMutation.mutate(requestData);
    } else {
      console.log('🤖 AI Estimator: Validation failed', { groupSize, budget });
    }
  };

  // Use API data instead of generated data
  const budgetOptions = budgetEstimateData?.budgetOptions || [];
  const maxAllowedDiscount = budgetEstimateData?.maxAllowedDiscount || 0;
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
                Total Budget ({branchCurrency})
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
                About {formatBranchCurrency(Math.round(budget / groupSize), branchCurrency)} per person
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
                <p>Budget: {formatBranchCurrency(budget, branchCurrency)}</p>
                <p>Per person: {formatBranchCurrency(Math.round(budget / groupSize), branchCurrency)}</p>
                {selectedCategories.length > 0 && (
                  <p>Categories: {selectedCategories.join(', ')}</p>
                )}
              </div>
              {maxAllowedDiscount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      Max Discount Available
                    </p>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Maximum allowed discount for each order: {formatBranchCurrency(maxAllowedDiscount, branchCurrency)}
                  </p>
                </div>
              )}
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
                <p>Budget: {formatBranchCurrency(budget, branchCurrency)}, Group: {groupSize}</p>
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
                    <Card key={index} className="border-2 hover:border-gray-300 transition-colors relative">
                      {/* Option Number Badge in Top Left Corner */}
                      <div className="absolute top-3 left-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
                        {index + 1}
                      </div>
                      <CardHeader className="pb-3 pt-6 pl-16">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Badge variant="outline" className={option.isWithinBudget ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                            {option.isWithinBudget ? 'Within Budget' : 'Over Budget'}
                          </Badge>
                        </CardTitle>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatBranchCurrency(option.totalCost, branchCurrency)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Serves {option.totalPeopleServed} people • {formatBranchCurrency(Math.round(option.totalCost / option.totalPeopleServed), branchCurrency)} per person
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Menu Items */}
                        {option.menuItems.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="text-sm font-medium text-gray-700">Menu Items:</h4>
                            {option.menuItems.map((item, itemIndex) => (
                              <div key={itemIndex} className="bg-gray-50 p-2 rounded space-y-1">
                                <div className="flex justify-between text-sm">
                                  <div>
                                    <span className="font-medium">{item.variations[0]?.quantity}x {item.name}</span>
                                    <div className="text-xs text-gray-500">
                                      {item.variations[0]?.name} • {item.categoryName}
                                    </div>
                                  </div>
                                  <span className="font-medium">{formatBranchCurrency(item.variations[0]?.price * item.variations[0]?.quantity, branchCurrency)}</span>
                                </div>
                                {/* Allergen Information */}
                                {item.allergenItemContains && (
                                  <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-1 rounded">
                                    <span className="font-medium">⚠️ Contains:</span> {item.allergenItemContains}
                                  </div>
                                )}
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
                                  <span className="font-medium">1x {packageItem.name}</span>
                                  <div className="text-xs text-gray-500">
                                    {packageItem.description}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    Deal includes multiple items
                                  </div>
                                </div>
                                <span className="font-medium">{formatBranchCurrency(packageItem.price, branchCurrency)}</span>
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
                          {/* Add to Cart functionality removed as requested */}
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
                        <p className="text-blue-600">{formatBranchCurrency(budget, branchCurrency)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">Best Option</p>
                        <p className="text-blue-600">{formatBranchCurrency(Math.min(...budgetOptions.map(o => o.totalCost)), branchCurrency)}</p>
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