import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-extrabold configurable-text-primary flex items-center gap-2.5">
            <span className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: 'var(--color-primary)' }}>
              <Bot className="w-5 h-5" />
            </span>
            AI Budget Estimator
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-5 pt-5">
            {/* Group Size */}
            <div className="space-y-2">
              <Label htmlFor="group-size" className="text-sm font-bold configurable-text-primary flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))', color: 'var(--color-primary)' }}>
                  <Users className="w-4 h-4" />
                </span>
                Group Size
              </Label>
              <Input
                id="group-size"
                type="number"
                min="1"
                max="20"
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                className="w-full h-12 rounded-2xl text-base"
                data-testid="input-group-size"
              />
            </div>

            {/* Budget */}
            <div className="space-y-2.5">
              <Label htmlFor="budget" className="text-sm font-bold configurable-text-primary flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))', color: 'var(--color-primary)' }}>
                  <DollarSign className="w-4 h-4" />
                </span>
                Total Budget ({branchCurrency})
              </Label>
              <Input
                id="budget"
                type="number"
                min="500"
                step="100"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value) || 500)}
                className="w-full h-12 rounded-2xl text-base"
                data-testid="input-budget"
              />
              <p className="text-sm font-semibold configurable-primary-text">
                ≈ {formatBranchCurrency(Math.round(budget / groupSize), branchCurrency)} per person
              </p>

              {/* Popular Budget Suggestions */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 configurable-primary-text" />
                  <span className="text-sm font-bold configurable-text-primary">Popular Budget Ranges</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Light', range: '1000-2000', perPerson: '500-1000' },
                    { label: 'Standard', range: '2000-5000', perPerson: '1000-2500' },
                    { label: 'Premium', range: '5000+', perPerson: '2500+' }
                  ].map((option) => {
                    const value = parseInt(option.range.split('-')[0]);
                    const active = budget === value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setBudget(value)}
                        className={`rounded-2xl p-2.5 flex flex-col items-center text-center border transition-all ${active ? 'border-2' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        style={active ? { backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))', borderColor: 'var(--color-primary)' } : {}}
                      >
                        <span className="text-xs font-bold configurable-text-primary">{option.label}</span>
                        <span className="text-[10px] configurable-text-muted">{option.perPerson}/person</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>


            {/* Meal Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold configurable-text-primary flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))', color: 'var(--color-primary)' }}>
                  <Clock className="w-4 h-4" />
                </span>
                Meal Type <span className="font-normal configurable-text-muted">(Optional)</span>
              </Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="h-12 rounded-2xl">
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
            <div className="space-y-2">
              <Label className="text-sm font-bold configurable-text-primary">Dietary Preferences <span className="font-normal configurable-text-muted">(Optional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {['Vegetarian', 'Spicy', 'Low Calorie', 'Family Friendly'].map(pref => {
                  const active = dietaryPrefs.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        if (!active) {
                          setDietaryPrefs(prev => [...prev, pref]);
                        } else {
                          setDietaryPrefs(prev => prev.filter(p => p !== pref));
                        }
                      }}
                      className={`vibe-chip h-9 px-3.5 ${active ? 'vibe-chip-active' : ''}`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold configurable-text-primary">Food Categories <span className="font-normal configurable-text-muted">(Optional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.map(category => {
                  const active = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category, !active)}
                      className={`vibe-chip h-9 px-3.5 gap-1.5 ${active ? 'vibe-chip-active' : ''}`}
                    >
                      {getCategoryIcon(category)}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tips Section */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))' }}>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 configurable-primary-text" />
                <span className="text-sm font-bold configurable-primary-text">Smart Ordering Tips</span>
              </div>
              <div className="space-y-2 text-xs configurable-text-secondary">
                {[
                  'Budget 20% extra for drinks and desserts',
                  'Combo meals often provide better value than individual items',
                  'Consider sharing family-sized portions for groups of 3+',
                  'AI suggestions prioritize variety and balanced nutrition',
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How AI Works */}
            <div className="rounded-2xl p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 configurable-text-secondary" />
                <span className="text-sm font-bold configurable-text-primary">How Our AI Works</span>
              </div>
              <div className="text-xs configurable-text-secondary space-y-2">
                <p>Our smart algorithm analyzes your preferences and creates personalized food combinations that:</p>
                <div className="space-y-1">
                  {[
                    'Maximize variety within your budget',
                    'Balance nutritional value and taste',
                    'Consider group sharing opportunities',
                    'Optimize price-per-person ratios',
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerateSuggestions}
                className="vibe-pill w-full h-14 text-base"
                disabled={groupSize <= 0 || budget <= 0 || budgetEstimateMutation.isPending}
                data-testid="button-generate-ai-suggestions"
              >
                <Bot className="w-5 h-5" />
                {budgetEstimateMutation.isPending ? 'Generating…' : 'Generate AI Suggestions'}
              </button>
              <p className="text-xs configurable-text-muted text-center mt-2">
                Get personalized meal combinations in seconds
              </p>
            </div>
          </div>
        )}

        {step === 'suggestions' && (
          <div className="space-y-5 pt-5">
            {/* Summary */}
            <div className="rounded-2xl p-4 bg-gray-50">
              <h3 className="font-bold configurable-text-primary mb-3">Your Request</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white p-2.5 text-center">
                  <p className="text-base font-extrabold configurable-text-primary">{groupSize}</p>
                  <p className="text-[10px] uppercase tracking-wide configurable-text-muted font-semibold">People</p>
                </div>
                <div className="rounded-xl bg-white p-2.5 text-center">
                  <p className="text-base font-extrabold configurable-text-primary">{formatBranchCurrency(budget, branchCurrency)}</p>
                  <p className="text-[10px] uppercase tracking-wide configurable-text-muted font-semibold">Budget</p>
                </div>
                <div className="rounded-xl bg-white p-2.5 text-center">
                  <p className="text-base font-extrabold configurable-primary-text">{formatBranchCurrency(Math.round(budget / groupSize), branchCurrency)}</p>
                  <p className="text-[10px] uppercase tracking-wide configurable-text-muted font-semibold">Per Person</p>
                </div>
              </div>
              {selectedCategories.length > 0 && (
                <p className="text-xs configurable-text-secondary mt-3">
                  <span className="font-semibold">Categories:</span> {selectedCategories.join(', ')}
                </p>
              )}
              {maxAllowedDiscount > 0 && (
                <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))' }}>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 configurable-primary-text" />
                    <p className="text-sm font-bold configurable-primary-text">
                      Max Discount Available
                    </p>
                  </div>
                  <p className="text-sm configurable-text-secondary mt-1">
                    Maximum allowed discount for each order: {formatBranchCurrency(maxAllowedDiscount, branchCurrency)}
                  </p>
                </div>
              )}
            </div>

            {/* Budget Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold configurable-text-primary">Budget Options</h3>
                <span className="text-xs font-bold text-white px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                  {budgetOptions.length} Options Found
                </span>
              </div>

              {budgetOptions.length === 0 ? (
                <div className="vibe-card p-6 text-center">
                  <p className="configurable-text-secondary">No suitable combinations found within your budget. Try increasing your budget or adjusting preferences.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {budgetOptions.map((option, index) => (
                    <div key={index} className="vibe-card relative p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 text-white rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-xl font-extrabold configurable-text-primary leading-tight">
                              {formatBranchCurrency(option.totalCost, branchCurrency)}
                            </div>
                            <div className="text-xs configurable-text-muted">
                              Serves {option.totalPeopleServed} • {formatBranchCurrency(Math.round(option.totalCost / option.totalPeopleServed), branchCurrency)}/person
                            </div>
                          </div>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${option.isWithinBudget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {option.isWithinBudget ? '✓ Within Budget' : '✗ Over Budget'}
                        </span>
                      </div>

                      {/* Menu Items */}
                      {option.menuItems.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wide configurable-text-muted">Menu Items</h4>
                          {option.menuItems.map((item, itemIndex) => (
                            <div key={itemIndex} className="bg-gray-50 p-2.5 rounded-xl space-y-1">
                              <div className="flex justify-between gap-2 text-sm">
                                <div>
                                  <span className="font-semibold configurable-text-primary">{item.variations[0]?.quantity}x {item.name}</span>
                                  <div className="text-xs configurable-text-muted">
                                    {item.variations[0]?.name} • {item.categoryName}
                                  </div>
                                </div>
                                <span className="font-bold configurable-text-primary whitespace-nowrap">{formatBranchCurrency(item.variations[0]?.price * item.variations[0]?.quantity, branchCurrency)}</span>
                              </div>
                              {/* Allergen Information */}
                              {item.allergenItemContains && (
                                <div
                                  className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-1.5 rounded-lg"
                                  data-testid={`text-allergen-budgetitem-${item.menuItemId}`}
                                >
                                  <span className="font-medium">⚠️ Contains:</span> {item.allergenItemContains}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Menu Packages */}
                      {option.menuPackages.length > 0 && (
                        <div className="space-y-2 mb-1">
                          <h4 className="text-xs font-bold uppercase tracking-wide configurable-text-muted">Package Deals</h4>
                          {option.menuPackages.map((packageItem, packageIndex) => (
                            <div key={packageIndex} className="p-2.5 rounded-xl space-y-1" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))' }}>
                              <div className="flex justify-between gap-2 text-sm">
                                <div>
                                  <span className="font-semibold configurable-text-primary">1x {packageItem.name}</span>
                                  <div className="text-xs configurable-text-muted">
                                    {packageItem.description}
                                  </div>
                                  <div className="text-xs configurable-primary-text font-medium">
                                    Deal includes multiple items
                                  </div>
                                </div>
                                <span className="font-bold configurable-text-primary whitespace-nowrap">{formatBranchCurrency(packageItem.price, branchCurrency)}</span>
                              </div>
                              {/* Package Allergen Information */}
                              {packageItem.allergenItemContains && (
                                <div
                                  className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-1.5 rounded-lg"
                                  data-testid={`text-allergen-package-${packageItem.dealId}`}
                                >
                                  <span className="font-medium">⚠️ Package Contains:</span> {packageItem.allergenItemContains}
                                </div>
                              )}
                              {/* Individual Menu Items Allergen Information */}
                              {packageItem.menuItems.map((menuItem, itemIndex) => (
                                menuItem.allergenItemContains && (
                                  <div
                                    key={itemIndex}
                                    className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-1.5 rounded-lg"
                                    data-testid={`text-allergen-packageitem-${menuItem.menuItemId}-${itemIndex}`}
                                  >
                                    <span className="font-medium">⚠️ {menuItem.name} Contains:</span> {menuItem.allergenItemContains}
                                  </div>
                                )
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Budget Summary */}
              {budgetOptions.length > 0 && (
                <div className="rounded-2xl p-4 grid grid-cols-2 gap-4" style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))' }}>
                  <div>
                    <p className="text-xs font-semibold configurable-text-muted">Your Budget</p>
                    <p className="text-lg font-extrabold configurable-text-primary">{formatBranchCurrency(budget, branchCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold configurable-text-muted">Best Option</p>
                    <p className="text-lg font-extrabold configurable-primary-text">{formatBranchCurrency(Math.min(...budgetOptions.map(o => o.totalCost)), branchCurrency)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('input')}
                className="vibe-pill-soft flex-1 h-12"
                data-testid="button-back-to-input"
              >
                Back to Input
              </button>
              <button
                onClick={() => setAiEstimatorModalOpen(false)}
                className="vibe-pill flex-1 h-12"
                data-testid="button-close-estimator"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}