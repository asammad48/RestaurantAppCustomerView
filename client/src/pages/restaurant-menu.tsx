import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiDeal, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Clock, MapPin, DollarSign, Search, ChevronLeft, ChevronRight, Plus, Tag, Calendar } from "lucide-react";
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
import ThemeSwitcher from "@/components/theme-switcher";
import FoodCard from "@/components/food-card";
import { getImageUrl } from "@/lib/config";
import { applyBranchPrimaryColor } from "@/lib/colors";

export default function RestaurantMenuPage() {
  const { 
    selectedRestaurant, 
    selectedBranch, 
    serviceType, 
    getCartCount, 
    setLastAddedItem, 
    setAddToCartModalOpen 
  } = useCartStore();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<{[key: number]: number}>({});
  const itemsPerPage = 8;

  const queryClient = useQueryClient();

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
    const urlParams = new URLSearchParams(window.location.search);
    const urlBranchId = urlParams.get('branchId');
    if (urlBranchId) {
      return parseInt(urlBranchId, 10);
    }
    
    // Default fallback
    return 1;
  };

  const branchId = getBranchId();

  const { data: menuData, isLoading } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const apiMenuData = menuData as ApiMenuResponse;

  // Handle case where no restaurant is selected for QR code access
  useEffect(() => {
    if (!selectedRestaurant && !selectedBranch && serviceType !== 'qr') {
      setLocation('/');
    }
  }, [selectedRestaurant, selectedBranch, serviceType, setLocation]);

  // Apply branch primary color when branch is selected
  useEffect(() => {
    if (selectedBranch?.primaryColor) {
      applyBranchPrimaryColor(selectedBranch.primaryColor);
    } else if (apiMenuData?.branchPrimaryColor) {
      applyBranchPrimaryColor(apiMenuData.branchPrimaryColor);
    }
  }, [selectedBranch?.primaryColor, apiMenuData?.branchPrimaryColor]);

  // Get unique categories from menu items
  const categoryList = apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [];
  const uniqueCategories = categoryList.filter((value, index, self) => self.indexOf(value) === index);
  const categories = ["all", ...uniqueCategories];
  
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
    switch (serviceType) {
      case 'delivery':
        setLocation('/delivery');
        break;
      case 'takeaway':
        setLocation('/takeaway');
        break;
      case 'qr':
        setLocation('/');
        break;
      default:
        setLocation('/');
    }
  };

  const getServiceBadge = () => {
    switch (serviceType) {
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
          {serviceType === 'delivery' && (
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2 configurable-primary-text" />
              Delivery Fee: PKR {selectedBranch.deliveryFee}
            </div>
          )}
        </div>
      );
    }

    if (selectedRestaurant) {
      switch (serviceType) {
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
            <div className="mb-3 p-2 configurable-primary-bg-alpha-10 rounded-md">
              <div className="flex items-center text-sm" style={{ color: 'var(--color-primary)' }}>
                <Calendar className="w-3 h-3 mr-1" />
                <span>Valid until: {new Date(deal.dealEndDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Price and Add to Cart */}
            <div className="flex items-center justify-between">
              <div>
                {hasDiscount ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold configurable-text-primary">
                      PKR {formatPrice(discountedPrice)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      PKR {formatPrice(deal.price)}
                    </span>
                  </div>
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
        {serviceType !== 'delivery' && (
          <div className="absolute bottom-0 left-0 right-0 configurable-primary text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
              {serviceType === 'takeaway' && (
                <>
                  <Clock className="mr-3" size={20} />
                  <span className="text-lg font-medium">Takeaway Order - {selectedRestaurant?.name || selectedBranch?.branchName}</span>
                </>
              )}
              {serviceType === 'qr' && (
                <>
                  <MapPin className="mr-3" size={20} />
                  <span className="text-lg font-medium">Menu - {selectedBranch?.branchName || 'Restaurant'}</span>
                </>
              )}
              {(serviceType === 'dine-in' || !serviceType) && (
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
          {serviceType !== 'qr' && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center"
                data-testid="button-back-to-restaurants"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {serviceType === 'delivery' ? 'Delivery' : serviceType === 'takeaway' ? 'Takeaway' : 'Restaurants'}
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

                  {serviceType === 'delivery' && selectedBranch && (
                    <div className="mt-4 p-3 rounded-lg configurable-primary-bg-alpha-10">
                      <p className="text-sm" style={{ color: 'var(--configurable-primary)' }}>
                        <strong>Maximum Delivery Distance:</strong> {selectedBranch.maxDistanceForDelivery} km
                      </p>
                    </div>
                  )}
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

        {/* Menu Items */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold configurable-text-primary mb-6">Menu Items</h2>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: itemsPerPage }, (_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex">
                      <div className="w-48 h-32 bg-gray-200 rounded-lg mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              paginatedItems.map((item: ApiMenuItem) => (
                <FoodCard 
                  key={item.menuItemId} 
                  item={item} 
                  variant="list"
                />
              ))
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "ghost"}
                    size="icon"
                    className={currentPage === pageNum ? "configurable-primary text-white" : ""}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </section>

        {/* Deals Section */}
        {apiMenuData?.deals && apiMenuData.deals.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Special Deals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Cart indicator */}
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
    </div>
  );
}