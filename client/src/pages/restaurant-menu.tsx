import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiDeal, ApiMenuResponse } from "@/lib/mock-data";
import { apiClient, BudgetEstimateRequest, BudgetEstimateResponse, BudgetOption } from "@/lib/api-client";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calculator, ArrowLeft, Star, Clock, MapPin, DollarSign, Search, ChevronLeft, ChevronRight, Plus, Tag, Calendar, Bot, Users, Pizza, Sandwich, Coffee, ChefHat, Cake, Sparkles, TrendingUp, Lightbulb, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import DeliveryDetailsModal from "@/components/modals/delivery-details-modal";
import TakeawayDetailsModal from "@/components/modals/takeaway-details-modal";
import PaymentModal from "@/components/modals/payment-modal";
import SplitBillModal from "@/components/modals/split-bill-modal";
import ReviewModal from "@/components/modals/review-modal";
import OrderConfirmationModal from "@/components/modals/order-confirmation-modal";
import AiEstimatorModal from "@/components/modals/ai-estimator-modal";
import ThemeSwitcher from "@/components/theme-switcher";
import FoodCard from "@/components/food-card";
import { getImageUrl } from "@/lib/config";
import { applyBranchPrimaryColor } from "@/lib/colors";
import { formatToLocalTime } from '@/lib/utils';

export default function RestaurantMenuPage() {
  const { 
    selectedRestaurant, 
    selectedBranch, 
    serviceType, 
    getCartCount, 
    setLastAddedItem, 
    setAddToCartModalOpen,
    setAiEstimatorModalOpen,
    addItem,
  } = useCartStore();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<{[key: number]: number}>({});
  
  // View toggle state
  const [viewMode, setViewMode] = useState<'menu' | 'ai-budget'>('menu');
  
  // AI Estimator state
  const [aiStep, setAiStep] = useState<'input' | 'suggestions'>('input');
  const [aiGroupSize, setAiGroupSize] = useState<number>(2);
  const [aiBudget, setAiBudget] = useState<number>(5000);
  const [aiSelectedCategories, setAiSelectedCategories] = useState<string[]>([]);
  const [budgetEstimateData, setBudgetEstimateData] = useState<BudgetEstimateRequest | null>(null);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  // Get URL parameters helper function
  const getUrlParams = () => {
    return new URLSearchParams(window.location.search);
  };

  // Get restaurant ID from URL parameters or store
  const getRestaurantId = () => {
    const urlParams = getUrlParams();
    const urlRestaurantId = urlParams.get('restaurantId');
    if (urlRestaurantId) {
      return parseInt(urlRestaurantId, 10);
    }
    
    // Fallback to selected restaurant from store
    if (selectedRestaurant?.id) {
      return selectedRestaurant.id;
    }
    
    return null;
  };

  // Get method type from URL parameters or store
  const getMethodType = () => {
    const urlParams = getUrlParams();
    const urlMethod = urlParams.get('method');
    if (urlMethod && ['delivery', 'takeaway', 'dine-in', 'qr'].includes(urlMethod)) {
      return urlMethod;
    }
    
    // Fallback to store serviceType
    return serviceType || 'delivery';
  };

  // Get branch ID dynamically - can come from:
  // 1. Selected branch (from takeaway/delivery flow)
  // 2. URL parameters (for direct access)
  // 3. Default fallback (for QR code access)
  const getBranchId = () => {
    // Check if branch is selected from the service flow
    if (selectedBranch?.branchId) {
      return selectedBranch.branchId;
    }
    
    // Check URL parameters for branch ID
    const urlParams = getUrlParams();
    const urlBranchId = urlParams.get('branchId');
    if (urlBranchId) {
      return parseInt(urlBranchId, 10);
    }
    
    // Default fallback
    return 1;
  };

  const restaurantId = getRestaurantId();
  const methodType = getMethodType();
  const branchId = getBranchId();

  // Update URL when restaurant/method changes
  useEffect(() => {
    const urlParams = getUrlParams();
    const currentRestaurantId = urlParams.get('restaurantId');
    const currentMethod = urlParams.get('method');
    const currentBranchId = urlParams.get('branchId');
    
    // Update URL if parameters don't match current values
    let needsUpdate = false;
    const newParams = new URLSearchParams(urlParams);
    
    if (restaurantId && currentRestaurantId !== restaurantId.toString()) {
      newParams.set('restaurantId', restaurantId.toString());
      needsUpdate = true;
    }
    
    if (methodType && currentMethod !== methodType) {
      newParams.set('method', methodType);
      needsUpdate = true;
    }
    
    if (branchId && currentBranchId !== branchId.toString()) {
      newParams.set('branchId', branchId.toString());
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [restaurantId, methodType, branchId]);

  const { data: menuData, isLoading } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // AI Budget Estimate Mutation
  const { data: budgetData, isPending: isBudgetLoading, mutate: generateBudgetEstimate } = useMutation({
    mutationFn: async (estimateRequest: BudgetEstimateRequest) => {
      console.log('🤖 API Call: Making budget estimate request with data:', estimateRequest);
      const response = await apiClient.getBudgetEstimate(estimateRequest);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🤖 API Success: Budget estimate completed', data);
      setBudgetEstimateData(null); // Clear the request data
    },
    onError: (error) => {
      console.error('🤖 API Error: Budget estimate failed', error);
    }
  });


  const apiMenuData = menuData as ApiMenuResponse;

  // Handle case where no restaurant is selected for QR code access
  useEffect(() => {
    if (!selectedRestaurant && !selectedBranch && methodType !== 'qr') {
      setLocation('/');
    }
  }, [selectedRestaurant, selectedBranch, methodType, setLocation]);

  // Apply branch primary color when branch is selected
  useEffect(() => {
    if (selectedBranch?.primaryColor) {
      applyBranchPrimaryColor(selectedBranch.primaryColor);
    }
  }, [selectedBranch?.primaryColor]);

  // Get unique categories from menu items
  const categoryList = apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [];
  const uniqueCategories = categoryList.filter((value, index, self) => self.indexOf(value) === index);
  const categories = ["all", ...uniqueCategories];

  // AI Budget Estimation handlers
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('pizza')) return <Pizza className="w-4 h-4" />;
    if (name.includes('burger')) return <Sandwich className="w-4 h-4" />;
    if (name.includes('drink') || name.includes('beverage')) return <Coffee className="w-4 h-4" />;
    if (name.includes('dessert') || name.includes('sweet')) return <Cake className="w-4 h-4" />;
    return <ChefHat className="w-4 h-4" />;
  };

  const handleAiCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      setAiSelectedCategories(prev => [...prev, category]);
    } else {
      setAiSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  const handleGenerateBudgetEstimate = () => {
    const estimateRequest: BudgetEstimateRequest = {
      branchId,
      groupSize: aiGroupSize,
      maxPrice: aiBudget,
      categories: aiSelectedCategories
    };
    
    console.log('🤖 GENERATE: Creating estimate request:', estimateRequest);
    
    // Switch to AI budget view and trigger the mutation
    setViewMode('ai-budget');
    generateBudgetEstimate(estimateRequest);
  };

  const handleSwitchToMenu = () => {
    setViewMode('menu');
  };

  const handleSwitchToAI = () => {
    if (budgetData) {
      setViewMode('ai-budget');
    } else {
      handleGenerateBudgetEstimate();
    }
  };

  // Add budget items to cart
  const handleAddBudgetOptionToCart = (budgetOption: BudgetOption) => {
    console.log('🛒 RESTAURANT MENU: Adding budget option to cart', budgetOption);
    
    // Add menu items separately
    budgetOption.menuItems.forEach(item => {
      console.log('🛒 RESTAURANT MENU: Processing menu item', item);
      
      // Find the menu item to get full details
      const menuItem = apiMenuData?.menuItems?.find(mi => mi.menuItemId === item.menuItemId);
      if (menuItem && item.variations && item.variations.length > 0) {
        const variation = item.variations[0]; // Get the selected variation
        
        // Add item for each quantity
        for (let i = 0; i < variation.quantity; i++) {
          console.log(`🛒 RESTAURANT MENU: Adding menu item ${i + 1}/${variation.quantity}`, {
            name: item.name,
            variation: variation.name,
            price: variation.price
          });
          
          // Create enhanced menu item with variant details for cart
          const enhancedMenuItem = {
            ...menuItem,
            selectedVariantId: variation.id,
            variantName: variation.name,
            variantPrice: variation.price,
            menuPicture: item.picture
          };
          
          addItem(enhancedMenuItem, variation.name);
        }
      }
    });

    // Add menu packages separately
    budgetOption.menuPackages.forEach(pkg => {
      console.log('🛒 RESTAURANT MENU: Processing package', pkg);
      
      // Add package (quantity is always 1 for packages in new format)
      console.log('🛒 RESTAURANT MENU: Adding package to cart', {
        name: pkg.name,
        price: pkg.price
      });
      
      // Find the deal in API data to get full details
      const dealItem = apiMenuData?.deals?.find(d => d.dealId === pkg.dealId);
      if (dealItem) {
        const enhancedPackage = {
          ...dealItem,
          packagePicture: pkg.picture
        };
        
        addItem(enhancedPackage);
      } else {
        // Fallback if deal not found in API data
        addItem(pkg as any);
      }
    });
    
    console.log('🛒 RESTAURANT MENU: Finished adding budget option to cart');
  };
  
  // Filter items by category and search
  const filteredItems = apiMenuData?.menuItems?.filter((item: ApiMenuItem) => {
    const matchesCategory = selectedCategory === "all" || item.categoryName === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleBack = () => {
    // All services now go back to the main delivery page
    // since it handles all service types (delivery, takeaway, dine-in, reservation)
    setLocation('/');
  };

  const getServiceBadge = () => {
    switch (methodType) {
      case 'delivery':
        return <Badge className="configurable-primary text-white">Delivery</Badge>;
      case 'takeaway':
        return <Badge className="configurable-primary text-white">Take Away</Badge>;
      case 'dine-in':
        return <Badge className="configurable-primary text-white">Dine In</Badge>;
      case 'qr':
        return <Badge className="configurable-primary text-white">QR Menu</Badge>;
      default:
        return null;
    }
  };

  const getServiceInfo = () => {
    if (selectedBranch) {
      return (
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 configurable-primary-text" />
            {selectedBranch.isBranchClosed ? 'Closed' : `Open: ${selectedBranch.branchOpenTime} - ${selectedBranch.branchCloseTime}`}
          </div>
          <div className="flex items-start">
            <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 configurable-primary-text" />
            <div className="text-gray-600">{selectedBranch.branchAddress}</div>
          </div>
        </div>
      );
    }

    if (selectedRestaurant) {
      switch (methodType) {
        case 'delivery':
          return (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 configurable-primary-text" />
                Delivery in {selectedRestaurant.deliveryTime}
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2 configurable-primary-text" />
                Delivery Fee: PKR {selectedRestaurant.deliveryFee}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 configurable-primary-text" />
                {selectedRestaurant.distance} away
              </div>
            </div>
          );
        case 'takeaway':
          return (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 configurable-primary-text" />
                Ready for pickup in {selectedRestaurant.deliveryTime.replace('delivery', 'preparation')}
              </div>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 configurable-primary-text" />
                <div className="text-gray-600">{selectedRestaurant.address}</div>
              </div>
            </div>
          );
        default:
          return null;
      }
    }
    return null;
  };

  // Helper function to get selected variation price for an item
  const getSelectedVariationPrice = (item: ApiMenuItem): number => {
    const selectedVariationId = selectedVariations[item.menuItemId];
    if (selectedVariationId && item.variations) {
      const variation = item.variations.find(v => v.id === selectedVariationId);
      return variation?.price || (item.variations[0]?.price || 0);
    }
    return item.variations?.[0]?.price || 0;
  };

  // Helper function to calculate discounted price
  const getDiscountedPrice = (price: number, discount?: { value: number } | null): number => {
    if (!discount) return price;
    return price - (price * discount.value / 100);
  };

  // Helper function to format price to 2 decimal places
  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  // Handle add to cart for menu items
  const handleAddToCart = (item: ApiMenuItem) => {
    setLastAddedItem(item);
    setAddToCartModalOpen(true);
  };

  // Handle add to cart for deals
  const handleAddDealToCart = (deal: ApiDeal) => {
    setLastAddedItem(deal);
    setAddToCartModalOpen(true);
  };

  const generateAiSuggestions = () => {
    if (!apiMenuData?.menuItems) return [];

    const categoriesData = aiSelectedCategories.length > 0 ? aiSelectedCategories : uniqueCategories;
    const budgetPerCategory = Math.floor(aiBudget / categoriesData.length);

    const suggestions: any[] = [];

    categoriesData.forEach(categoryName => {
      const categoryItems = apiMenuData.menuItems.filter(item => 
        item.categoryName === categoryName
      );

      if (categoryItems.length === 0) return;

      const sortedItems = categoryItems.sort((a, b) => {
        const priceA = a.variations?.[0]?.price || 0;
        const priceB = b.variations?.[0]?.price || 0;
        return priceA - priceB;
      });

      const combo = {
        categoryName,
        icon: getCategoryIcon(categoryName),
        items: [] as any[],
        totalPrice: 0
      };

      let remainingBudget = budgetPerCategory;
      let currentIndex = 0;

      const isMainCategory = !categoryName.toLowerCase().includes('drink') && 
                           !categoryName.toLowerCase().includes('dessert') &&
                           !categoryName.toLowerCase().includes('side');

      if (isMainCategory) {
        for (let person = 0; person < aiGroupSize && currentIndex < sortedItems.length; person++) {
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

  const handleGenerateAiSuggestions = () => {
    if (aiGroupSize > 0 && aiBudget > 0) {
      setAiStep('suggestions');
    }
  };

  const handleAddComboToCart = (combo: any) => {
    combo.items.forEach((item: any) => {
      const menuItem = apiMenuData?.menuItems.find(m => m.menuItemId === item.menuItemId);
      if (menuItem) {
        for (let i = 0; i < item.quantity; i++) {
          const { addItem } = useCartStore.getState();
          addItem(menuItem);
        }
      }
    });
    useCartStore.getState().setCartOpen(true);
  };

  const aiSuggestions = aiStep === 'suggestions' ? generateAiSuggestions() : [];
  const totalSuggestedCost = aiSuggestions.reduce((sum: number, combo: any) => sum + combo.totalPrice, 0);

  // Render deal card
  const renderDeal = (deal: ApiDeal) => {
    const discountedPrice = getDiscountedPrice(deal.price, deal.discount);
    const hasDiscount = deal.discount && deal.discount.value > 0;

    return (
      <Card key={deal.dealId} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="relative">
            <img
              src={getImageUrl(deal.picture)}
              alt={deal.name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 left-2">
              <Badge className="configurable-primary text-white">
                DEAL
              </Badge>
            </div>
            {hasDiscount && (
              <div className="absolute top-2 right-2">
                <Badge className="configurable-deal text-white">
                  {deal.discount!.value}% OFF
                </Badge>
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{deal.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{deal.description}</p>

            {/* Deal End Date */}
            <div className="mb-3 p-2 rounded-md bg-gray-100">
              <div className="flex items-center text-sm" style={{ color: 'var(--color-primary)' }}>
                <Calendar className="w-3 h-3 mr-1" />
                <span>Valid until: {formatToLocalTime(deal.dealEndDate, 'MMM dd, yyyy')}</span>
              </div>
            </div>

            {/* Price and Add to Cart */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                {hasDiscount ? (
                  <>
                    <span className="text-lg font-bold configurable-text-primary">
                      PKR {formatPrice(discountedPrice)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      PKR {formatPrice(deal.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold configurable-text-primary">
                    PKR {formatPrice(deal.price)}
                  </span>
                )}
              </div>
              <Button
                onClick={() => handleAddDealToCart(deal)}
                className="configurable-primary hover:configurable-primary-hover text-white"
                data-testid={`button-add-deal-to-cart-${deal.dealId}`}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Service Banner */}
      <div className="relative">
        <div className="h-32 md:h-40 relative overflow-hidden configurable-primary">
          <div className="absolute inset-0 flex">
            <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pizza slice" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pasta dish" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Salad bowl" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pancakes" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Burger" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Salad" className="w-1/6 h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 configurable-primary/70"></div>
        </div>
        
        {/* Service Type Indicator - Hidden for delivery */}
        {methodType !== 'delivery' && (
          <div className="absolute bottom-0 left-0 right-0 configurable-primary text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
              {methodType === 'takeaway' && (
                <>
                  <Clock className="mr-3" size={20} />
                  <span className="text-lg font-medium">Takeaway Order - {selectedRestaurant?.name || selectedBranch?.branchName}</span>
                </>
              )}
              {methodType === 'qr' && (
                <>
                  <MapPin className="mr-3" size={20} />
                  <span className="text-lg font-medium">Menu - {selectedBranch?.branchName || 'Restaurant'}</span>
                </>
              )}
              {(methodType === 'dine-in' || !methodType) && (
                <>
                  <MapPin className="mr-3" size={20} />
                  <span className="text-lg font-medium">Dine In Menu - {selectedRestaurant?.name || selectedBranch?.branchName}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        {methodType !== 'qr' && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center"
              data-testid="button-back-to-restaurants"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {methodType === 'delivery' ? 'Delivery' : methodType === 'takeaway' ? 'Takeaway' : 'Restaurants'}
            </Button>
          </div>
        )}

        {/* Restaurant/Branch Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <img
                src={selectedBranch?.branchPicture ? getImageUrl(selectedBranch.branchPicture) : selectedRestaurant?.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'}
                alt={selectedBranch?.branchName || selectedRestaurant?.name || 'Restaurant'}
                className="w-full md:w-48 h-32 object-cover rounded-lg flex-shrink-0"
              />
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedBranch?.branchName || selectedRestaurant?.name || 'Restaurant Menu'}
                    </h1>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedBranch?.rating || selectedRestaurant?.rating || '4.5'}</span>
                      </div>
                      {getServiceBadge()}
                    </div>
                  </div>
                </div>

                {getServiceInfo()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Section */}
        {apiMenuData?.recommendedForYou && apiMenuData.recommendedForYou.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Recommended For You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {apiMenuData.recommendedForYou.map((item) => (
                <FoodCard 
                  key={item.menuItemId} 
                  item={item} 
                  variant="grid" 
                  isRecommended={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Menu Filters */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-menu-items"
                />
              </div>
            </div>
          </div>
        </section>


        {/* Split Layout: Menu Items Left, AI Estimator Right */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Left Side - Menu Items */}
          <div className="flex-1">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold configurable-text-primary">
                    {viewMode === 'menu' ? 'Menu Items' : 'AI Budget Suggestions'}
                  </h2>
                  {/* View Toggle Buttons */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'menu' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={handleSwitchToMenu}
                      className={viewMode === 'menu' ? 'configurable-primary text-white' : ''}
                      data-testid="button-switch-to-menu"
                    >
                      Menu
                    </Button>
                    <Button
                      variant={viewMode === 'ai-budget' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={handleSwitchToAI}
                      className={viewMode === 'ai-budget' ? 'configurable-primary text-white' : ''}
                      data-testid="button-switch-to-ai"
                    >
                      <Bot className="w-4 h-4 mr-1" />
                      AI Budget
                    </Button>
                  </div>
                </div>
                {/* Mobile AI Estimator Button */}
                <div className="lg:hidden">
                  <Button
                    onClick={() => {
                      console.debug('🤖 Opening AI Estimator Modal from restaurant menu');
                      setAiEstimatorModalOpen(true);
                    }}
                    className="configurable-primary hover:configurable-primary-hover text-white flex items-center gap-2"
                    data-testid="button-open-ai-estimator-mobile"
                  >
                    <Bot className="w-4 h-4" />
                    AI Estimator
                  </Button>
                </div>
              </div>
              
              {/* Conditional rendering based on view mode */}
              {viewMode === 'menu' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {isLoading ? (
                    Array.from({ length: itemsPerPage }, (_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-3">
                          <div className="flex">
                            <div className="w-20 h-20 bg-gray-200 rounded-lg mr-3"></div>
                            <div className="flex-1">
                              <div className="h-3 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    paginatedItems.map((item: ApiMenuItem) => (
                      <div key={item.menuItemId} className="h-full">
                        <FoodCard 
                          item={item} 
                          variant="compact"
                          className="h-full"
                        />
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* AI Budget Options Display */
                <div className="space-y-4 mb-6">
                  {isBudgetLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Generating budget suggestions...</span>
                    </div>
                  ) : budgetData?.budgetOptions && budgetData.budgetOptions.length > 0 ? (
                    budgetData.budgetOptions.map((option, index) => (
                      <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">Budget Option {index + 1}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center">
                                  PKR {option.totalCost}
                                </span>
                                <span className="flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  Serves {option.totalPeopleServed}
                                </span>
                                <Badge variant={option.isWithinBudget ? "default" : "destructive"}>
                                  {option.isWithinBudget ? "Within Budget" : "Over Budget"}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddBudgetOptionToCart(option)}
                              className="configurable-primary hover:configurable-primary-hover text-white"
                              data-testid={`button-add-budget-option-${index}`}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add to Cart
                            </Button>
                          </div>
                          
                          {/* Menu Items in this option */}
                          {option.menuItems.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-gray-700 mb-2">Menu Items:</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {option.menuItems.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <div>
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-sm text-gray-500 ml-2">({item.variations[0]?.name})</span>
                                      <div className="text-sm text-gray-600">
                                        Qty: {item.variations[0]?.quantity} • {item.categoryName}
                                      </div>
                                    </div>
                                    <span className="font-semibold">PKR {item.variations[0]?.price}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Menu Packages in this option */}
                          {option.menuPackages.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-700 mb-2">Deals & Packages:</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {option.menuPackages.map((pkg, pkgIndex) => (
                                  <div key={pkgIndex} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <div>
                                      <span className="font-medium">{pkg.name}</span>
                                      <div className="text-sm text-gray-600">
                                        {pkg.description}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Deal includes multiple items
                                      </div>
                                    </div>
                                    <span className="font-semibold">PKR {pkg.price}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12" data-testid="status-menu-loading">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin mb-4" style={{borderTopColor: 'var(--primary)'}}>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold configurable-text-primary mb-2">Menu is being loaded</h3>
                      <p className="text-gray-500 text-center max-w-md">
                        Please wait while we fetch the latest menu items and prepare your dining options.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Budget Suggestions Available</h3>
                      <p className="text-gray-500 mb-4">
                        Try adjusting your budget or group size in the AI Estimator to generate suggestions.
                      </p>
                      <Button
                        onClick={() => setAiEstimatorModalOpen(true)}
                        className="configurable-primary hover:configurable-primary-hover text-white"
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Open AI Estimator
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          className={currentPage === pageNum ? "configurable-primary text-white" : ""}
                          onClick={() => setCurrentPage(pageNum)}
                          data-testid={`button-page-${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </section>
          </div>

          {/* Right Side - AI Estimator Panel (Desktop Only) */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--color-primary)] rounded-2xl mb-4 shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--color-primary)]">
                    AI Budget Estimator
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Smart recommendations for your perfect meal</p>
                </div>

                {/* Group Size */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-8 h-8 bg-[var(--configurable-primary-alpha-10)] rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <span>Group Size</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={aiGroupSize}
                    onChange={(e) => setAiGroupSize(parseInt(e.target.value) || 1)}
                    className="h-12 text-lg bg-white/80 border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--configurable-primary-alpha-20)] rounded-xl"
                    data-testid="input-group-size"
                  />
                </div>

                {/* Total Budget */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-8 h-8 bg-[var(--configurable-primary-alpha-10)] rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <span>Total Budget (PKR)</span>
                  </div>
                  <Input
                    type="number"
                    min="500"
                    step="100"
                    value={aiBudget}
                    onChange={(e) => setAiBudget(parseInt(e.target.value) || 500)}
                    className="h-12 text-lg bg-white/80 border-slate-200 focus:border-[var(--color-primary)] focus:ring-[var(--configurable-primary-alpha-20)] rounded-xl"
                    data-testid="input-budget"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-white/60 rounded-lg py-2 px-3">
                    <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full"></span>
                    <span>PKR {Math.round(aiBudget / aiGroupSize)} per person</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-8 h-8 bg-[var(--configurable-primary-alpha-10)] rounded-lg flex items-center justify-center">
                      <ChefHat className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <span>Food Categories</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uniqueCategories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ai-category-${category}`}
                          checked={aiSelectedCategories.includes(category)}
                          onCheckedChange={(checked) => handleAiCategoryToggle(category, checked as boolean)}
                          data-testid={`checkbox-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={`ai-category-${category}`} className="text-sm flex items-center gap-2 cursor-pointer flex-1">
                          {getCategoryIcon(category)}
                          <span className="text-slate-700">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {aiSelectedCategories.length > 0 && (
                    <div className="text-xs text-[var(--color-primary)] bg-[var(--configurable-primary-alpha-05)] rounded-lg py-2 px-3">
                      {aiSelectedCategories.length} category(ies) selected
                    </div>
                  )}
                </div>

                {/* Popular Ranges */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-8 h-8 bg-[var(--configurable-primary-alpha-10)] rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <span>Popular Ranges</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setAiBudget(1500)}
                      className="group bg-white/80 hover:bg-white border border-slate-200 hover:border-[var(--color-primary)] rounded-xl p-3 text-center transition-all duration-200 hover:shadow-md hover:scale-105"
                      data-testid="button-range-light"
                    >
                      <div className="text-xs font-medium text-slate-600 mb-1">Light</div>
                      <div className="text-lg font-bold text-[var(--color-primary)] group-hover:text-[var(--color-primary-hover)]">1500</div>
                      <div className="text-xs text-slate-400">{Math.round(1500 / aiGroupSize)}/person</div>
                    </button>
                    <button
                      onClick={() => setAiBudget(3000)}
                      className="group bg-white/80 hover:bg-white border border-slate-200 hover:border-[var(--color-primary)] rounded-xl p-3 text-center transition-all duration-200 hover:shadow-md hover:scale-105"
                      data-testid="button-range-standard"
                    >
                      <div className="text-xs font-medium text-slate-600 mb-1">Standard</div>
                      <div className="text-lg font-bold text-[var(--color-primary)] group-hover:text-[var(--color-primary-hover)]">3000</div>
                      <div className="text-xs text-slate-400">{Math.round(3000 / aiGroupSize)}/person</div>
                    </button>
                    <button
                      onClick={() => setAiBudget(6000)}
                      className="group bg-white/80 hover:bg-white border border-slate-200 hover:border-[var(--color-primary)] rounded-xl p-3 text-center transition-all duration-200 hover:shadow-md hover:scale-105"
                      data-testid="button-range-premium"
                    >
                      <div className="text-xs font-medium text-slate-600 mb-1">Premium</div>
                      <div className="text-lg font-bold text-[var(--color-primary)] group-hover:text-[var(--color-primary-hover)]">6000</div>
                      <div className="text-xs text-slate-400">{Math.round(6000 / aiGroupSize)}/person</div>
                    </button>
                  </div>
                </div>

                {/* Smart Tips */}
                <div className="bg-[var(--configurable-primary-alpha-05)] border border-[var(--configurable-primary-alpha-20)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-[var(--color-primary)]">Smart Tips</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-[var(--color-primary)]">
                      <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full mt-2 flex-shrink-0"></div>
                      <span>Budget 20% extra for drinks</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--color-primary)]">
                      <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full mt-2 flex-shrink-0"></div>
                      <span>Combo meals offer better value</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--color-primary)]">
                      <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full mt-2 flex-shrink-0"></div>
                      <span>Share family portions for groups 3+</span>
                    </div>
                  </div>
                </div>

                {/* How AI Works */}
                <div className="bg-[var(--configurable-primary-alpha-05)] border border-[var(--configurable-primary-alpha-20)] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                      <Info className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-[var(--color-primary)]">How AI Works</span>
                  </div>
                  <div className="text-sm text-[var(--color-primary)]">
                    <p className="mb-2 font-medium">Our algorithm creates combinations that:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full"></div>
                        <span>Maximize variety within budget</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full"></div>
                        <span>Balance nutrition and taste</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full"></div>
                        <span>Consider group sharing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--color-primary)] rounded-full"></div>
                        <span>Optimize price-per-person</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateBudgetEstimate}
                  disabled={aiGroupSize <= 0 || aiBudget <= 0 || isBudgetLoading}
                  className="w-full h-14 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-generate-estimate"
                >
                  {isBudgetLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Analyzing Menu...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span>Generate AI Budget</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Deals Section */}
        {apiMenuData?.deals && apiMenuData.deals.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Special Deals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {apiMenuData.deals.map((deal) => renderDeal(deal))}
            </div>
          </section>
        )}

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No items found matching your search.
            </p>
          </div>
        )}
      </div>

      <Footer />
      <ThemeSwitcher />

      {/* Floating Cart Button */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => useCartStore.getState().setCartOpen(true)}
            className="rounded-full w-16 h-16 shadow-lg configurable-primary hover:configurable-primary-hover text-white"
            data-testid="button-open-cart"
          >
            <div className="text-center">
              <div className="text-xs">Cart</div>
              <div className="text-lg font-bold">{getCartCount()}</div>
            </div>
          </Button>
        </div>
      )}

      {/* Modals */}
      <CartModal />
      <AddToCartModal />
      <DeliveryDetailsModal />
      <TakeawayDetailsModal />
      <PaymentModal />
      <SplitBillModal />
      <ReviewModal />
      <OrderConfirmationModal />
      <AiEstimatorModal />
    </div>
  );
}