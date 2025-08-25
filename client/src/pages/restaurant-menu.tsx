import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { MenuItem } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Clock, MapPin, DollarSign, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import FoodCard from "@/components/food-card";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import DeliveryDetailsModal from "@/components/modals/delivery-details-modal";
import TakeawayDetailsModal from "@/components/modals/takeaway-details-modal";
import PaymentModal from "@/components/modals/payment-modal";
import SplitBillModal from "@/components/modals/split-bill-modal";
import ReviewModal from "@/components/modals/review-modal";
import OrderConfirmationModal from "@/components/modals/order-confirmation-modal";
import ThemeSwitcher from "@/components/theme-switcher";

export default function RestaurantMenuPage() {
  const { selectedRestaurant, serviceType, getCartCount } = useCartStore();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['/api/menu-items'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!selectedRestaurant) {
    setLocation('/');
    return null;
  }

  const categoryList = (menuItems as MenuItem[])?.map((item: MenuItem) => item.category) || [];
  const uniqueCategories = categoryList.filter((value, index, self) => self.indexOf(value) === index);
  const categories = ["all", ...uniqueCategories];
  
  // Filter items by category and search
  const filteredItems = (menuItems as MenuItem[])?.filter((item: MenuItem) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Get recommended items (items with high ratings)
  const recommendedItems = (menuItems as MenuItem[])?.filter((item: MenuItem) => 
    item.isRecommended
  ) || [];

  // Get deal items (items with discounts)
  const dealItems = (menuItems as MenuItem[])?.filter((item: MenuItem) => 
    item.discount && item.discount > 0
  ) || [];

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
      default:
        setLocation('/');
    }
  };

  const getServiceBadge = () => {
    switch (serviceType) {
      case 'delivery':
        return <Badge className="configurable-primary text-white">Delivery</Badge>;
      case 'takeaway':
        return <Badge className="bg-blue-500 text-white">Take Away</Badge>;
      case 'dine-in':
        return <Badge className="bg-purple-500 text-white">Dine In</Badge>;
      default:
        return null;
    }
  };

  const getServiceInfo = () => {
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
              <div>
                <div className="font-medium text-gray-900">Pickup Address:</div>
                <div className="text-gray-600">{selectedRestaurant.address}</div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
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
        
        {/* Service Type Indicator */}
        <div className="absolute bottom-0 left-0 right-0 configurable-primary text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            {serviceType === 'delivery' && (
              <>
                <DollarSign className="mr-3" size={20} />
                <span className="text-lg font-medium">Delivery Service - {selectedRestaurant.name}</span>
              </>
            )}
            {serviceType === 'takeaway' && (
              <>
                <Clock className="mr-3" size={20} />
                <span className="text-lg font-medium">Takeaway Order - {selectedRestaurant.name}</span>
              </>
            )}
            {(serviceType === 'dine-in' || !serviceType) && (
              <>
                <MapPin className="mr-3" size={20} />
                <span className="text-lg font-medium">Dine In Menu - {selectedRestaurant.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center"
              data-testid="button-back-to-restaurants"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Restaurants
            </Button>
          </div>

          {/* Restaurant Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <img
                  src={selectedRestaurant.image}
                  alt={selectedRestaurant.name}
                  className="w-full md:w-48 h-32 object-cover rounded-lg"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedRestaurant.name}
                      </h1>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{selectedRestaurant.rating}</span>
                        </div>
                        <Badge variant="outline">{(selectedRestaurant as any).cuisine || 'Restaurant'}</Badge>
                        {getServiceBadge()}
                      </div>
                    </div>
                  </div>

                  {getServiceInfo()}

                  {serviceType === 'delivery' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Minimum Order:</strong> PKR {selectedRestaurant.minimumOrder}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Recommended Section */}
        {recommendedItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Recommended</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedItems.slice(0, 4).map((item) => (
                <FoodCard key={item.id} item={item} variant="grid" />
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
                  placeholder="Search..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Menu Items */}
        <section className="mb-12">
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: itemsPerPage }, (_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              paginatedItems.map((item: MenuItem) => (
                <FoodCard key={item.id} item={item} variant="list" />
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
        {dealItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Deals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dealItems.map((item) => (
                <FoodCard key={item.id} item={item} variant="grid" />
              ))}
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
            className="rounded-full w-16 h-16 shadow-lg"
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