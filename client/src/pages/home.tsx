import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Armchair, MapPin, Navigation, Map, Bike, ShoppingBag, Calendar, UtensilsCrossed, Star, Clock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import FoodCard from "@/components/food-card";
import FloatingButtons from "@/components/floating-buttons";
import LocationPicker from "@/components/location-picker";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import CartModal from "@/components/modals/cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import SplitBillModal from "@/components/modals/split-bill-modal";
import ReviewModal from "@/components/modals/review-modal";
import ServiceRequestModal from "@/components/modals/service-request-modal";
import OrderConfirmationModal from "@/components/modals/order-confirmation-modal";
import ThemeSwitcher from "@/components/theme-switcher";
import { MenuItem } from "@/lib/mock-data";
import { useCartStore } from "@/lib/store";
import { getQueryFn } from "@/lib/queryClient";
import { BranchService } from "@/services/branch-service";
import { Branch } from "@/types/branch";
import { applyGreenTheme } from "@/lib/colors";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedService, setSelectedService] = useState<'delivery' | 'takeaway' | 'dine-in' | 'reservation'>('delivery');
  
  // Reservation-specific states
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("Downtown");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | ''>(20);
  const [takeawayMaxDistance, setTakeawayMaxDistance] = useState<number | ''>(30);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setSelectedBranch, setServiceType } = useCartStore();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Apply green theme when reservation is selected
  useEffect(() => {
    if (selectedService === 'reservation') {
      applyGreenTheme();
    }
  }, [selectedService]);
  

  // Extract unique categories from menu items
  const uniqueCategories = Array.from(new Set(
    menuItems.map(item => {
      // Handle both old and new API data structures
      const category = 'categoryName' in item ? (item as any).categoryName : (item as any).category;
      return category as string;
    }).filter(Boolean)
  )).sort() as string[];

  const filteredItems = menuItems.filter((item) => {
    const itemCategory = 'categoryName' in item ? (item as any).categoryName : (item as any).category;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           (itemCategory as string).toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const recommendedItems = menuItems.filter(item => item.isRecommended);
  const dealItems = menuItems.filter(item => item.isDeal);
  
  // Handle service type selection
  const handleServiceSelect = (service: 'delivery' | 'takeaway' | 'dine-in' | 'reservation') => {
    setSelectedService(service);
    setServiceType(service);
  };
  
  // Search for branches based on selected service type
  const searchBranchesForSelectedService = async (latitude: number, longitude: number) => {
    setBranchesLoading(true);
    setBranchesError(null);
    
    try {
      let response;
      let serviceDescription = "";
      
      switch (selectedService) {
        case 'delivery':
          response = await BranchService.searchBranches({
            latitude,
            longitude,
            address: "",
            branchName: "",
            maxDistance: Number.isFinite(takeawayMaxDistance as number) ? (takeawayMaxDistance as number) : 30
          });
          serviceDescription = "delivery";
          break;
        case 'takeaway':
          response = await BranchService.searchTakeawayBranches({
            latitude,
            longitude,
            address: userLocation || "",
            branchName: searchQuery || "",
            maxDistance: Number.isFinite(takeawayMaxDistance as number) ? (takeawayMaxDistance as number) : 30
          });
          serviceDescription = "takeaway";
          break;
        case 'dine-in':
          response = await BranchService.searchBranches({
            latitude,
            longitude,
            address: userLocation || "",
            branchName: searchQuery || "",
            maxDistance: Number.isFinite(takeawayMaxDistance as number) ? (takeawayMaxDistance as number) : 30
          });
          serviceDescription = "dine-in";
          break;
        case 'reservation':
          response = await BranchService.searchReservationBranches({
            latitude,
            longitude,
            address: userLocation || "",
            branchName: searchQuery || "",
            maxDistance: Number.isFinite(maxDistance as number) ? (maxDistance as number) : 20
          });
          serviceDescription = "reservations";
          break;
        default:
          throw new Error('Invalid service type');
      }

      setBranches(response.data);
      
      toast({
        title: "Restaurants Found",
        description: `Found ${response.data.length} restaurants available for ${serviceDescription}.`,
      });
    } catch (error: any) {
      console.error(`${selectedService} branch search failed:`, error);
      setBranchesError(error.message || `Failed to find restaurants for ${selectedService}`);
      
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: `Unable to find restaurants for ${selectedService}. Please try again.`,
      });
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    // Store the selected branch in cart store
    setSelectedBranch(branch);
    setServiceType(selectedService);
    
    // Navigate based on selected service type
    if (selectedService === 'reservation') {
      setLocation(`/reservation-detail?branchId=${branch.branchId}&branchName=${encodeURIComponent(branch.branchName)}`);
    } else if (selectedService === 'dine-in') {
      const { setDineInSelectionModalOpen } = useCartStore.getState();
      toast({
        title: "Restaurant Selected",
        description: `Selected ${branch.branchName} for dine-in. Please select a table.`,
      });
      // Open dine-in selection modal for table selection
      setDineInSelectionModalOpen(true);
    } else {
      // For delivery and takeaway, navigate to restaurant menu
      setLocation('/restaurant-menu');
    }
  };

  // Filter branches
  const filteredBranches = branches.filter((branch: Branch) => {
    const matchesSearch = branch.branchName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
          searchBranchesForSelectedService(lat, lng);
          setIsLoadingLocation(false);
        },
        () => {
          setIsLoadingLocation(false);
          alert("Unable to get location");
        }
      );
    }
  };

  // Handle map location
  const handleLocationFromMap = (lat: number, lng: number, address: string) => {
    setUserLocation(address);
    setUserCoords({ lat, lng });
    setShowMap(false);
    searchBranchesForSelectedService(lat, lng);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative">
        <div className="h-48 md:h-64 relative overflow-hidden" style={{background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-hover))'}}>
          <div className="absolute inset-0 flex">
            <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pizza slice" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pasta dish" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Salad bowl" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Pancakes" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Burger" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Salad" className="w-1/6 h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 opacity-70" style={{background: 'linear-gradient(to right, var(--color-primary), var(--color-primary-hover))'}}></div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 configurable-primary text-white py-3">
          <div className="page-container flex items-center justify-center">
            <Armchair className="mr-3" size={20} />
            <span className="text-lg font-medium">You're at TABLE #5</span>
          </div>
        </div>
      </div>

      <div className="page-container section-y">
        {/* Service Selection */}
        <section className="mb-8">
          <div className="responsive-grid gap-4 mb-8">
            {[
              {
                id: 'delivery',
                title: 'Delivery',
                description: 'Get food delivered to your doorstep',
                icon: Bike,
                color: selectedService === 'delivery' ? 'configurable-primary text-white' : 'bg-white hover:bg-gray-50 border-gray-200',
              },
              {
                id: 'takeaway',
                title: 'Take Away',
                description: 'Pick up your order from the restaurant',
                icon: ShoppingBag,
                color: selectedService === 'takeaway' ? 'configurable-primary text-white' : 'bg-white hover:bg-gray-50 border-gray-200',
              },
              {
                id: 'dine-in',
                title: 'Dine In',
                description: 'Eat at the restaurant',
                icon: UtensilsCrossed,
                color: selectedService === 'dine-in' ? 'configurable-primary text-white' : 'bg-white hover:bg-gray-50 border-gray-200',
              },
              {
                id: 'reservation',
                title: 'Reservation',
                description: 'Book a table for dining in',
                icon: Calendar,
                color: selectedService === 'reservation' ? 'configurable-primary text-white' : 'bg-white hover:bg-gray-50 border-gray-200',
              },
            ].map((service) => {
              const Icon = service.icon;
              return (
                <Card 
                  key={service.id} 
                  className={`cursor-pointer transition-all duration-200 border ${service.color}`}
                  onClick={() => handleServiceSelect(service.id as 'delivery' | 'takeaway' | 'dine-in' | 'reservation')}
                >
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className={`p-3 rounded-full ${selectedService === service.id ? 'bg-white/20' : 'bg-gray-100'} mb-3`}>
                      <Icon size={24} className={selectedService === service.id ? 'text-white' : 'configurable-primary-text'} />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {service.title}
                    </h3>
                    <p className={`text-sm ${selectedService === service.id ? 'text-white/80' : 'text-gray-600'}`}>
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        
        {/* Location Section - only show for non-reservation services */}
        {selectedService !== 'reservation' && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                    Your Location
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      className="flex items-center justify-center gap-2"
                      data-testid="button-current-location-main"
                    >
                      <Navigation className="w-4 h-4 configurable-primary-text" />
                      {isLoadingLocation ? 'Getting...' : 'Current Location'}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMap(true)}
                      className="flex items-center justify-center gap-2"
                      data-testid="button-map-location-main"
                    >
                      <Map className="w-4 h-4 configurable-primary-text" />
                      Pick on Map
                    </Button>
                  </div>

                  <Input
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter your location"
                    data-testid="input-main-location"
                  />
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Search className="w-4 h-4 mr-1 configurable-primary-text" />
                    Search Restaurants
                  </label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by restaurant name"
                    data-testid="input-search-main-restaurants"
                  />
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Max Distance (km)
                  </label>
                  <Input
                    type="number"
                    value={takeawayMaxDistance}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setTakeawayMaxDistance('');
                      } else {
                        const num = Number(value);
                        setTakeawayMaxDistance(Number.isFinite(num) ? num : '');
                      }
                    }}
                    placeholder="30"
                    min="1"
                    max="100"
                    data-testid="input-max-distance-main"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={() => userCoords && searchBranchesForSelectedService(userCoords.lat, userCoords.lng)}
                  disabled={!userCoords || branchesLoading}
                  className="configurable-primary"
                  data-testid="button-search-main-restaurants"
                >
                  {branchesLoading ? 'Searching...' : 'Search Restaurants'}
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                {filteredBranches.length} restaurants found
                {branchesError && (
                  <div className="text-red-600 mt-1">{branchesError}</div>
                )}
              </div>
            </div>
            
            {/* Restaurant Results */}
            {filteredBranches.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Available Restaurants</h3>
                <div className="responsive-grid gap-6">
                  {filteredBranches.map((branch: Branch) => (
                    <Card 
                      key={branch.branchId} 
                      className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                      onClick={() => handleBranchSelect(branch)}
                      data-testid={`main-branch-card-${branch.branchId}`}
                    >
                      <CardContent className="p-0">
                        <div className="relative">
                          <img
                            src={BranchService.getBranchImageUrl(branch.branchPicture)}
                            alt={branch.branchName}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-white text-black shadow-sm">
                              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {branch.rating}
                            </Badge>
                          </div>
                          <div className="absolute top-3 left-3">
                            <Badge className="configurable-primary text-white">
                              {selectedService === 'delivery' ? 'Delivery' : 
                               selectedService === 'takeaway' ? 'Takeaway' :
                               selectedService === 'dine-in' ? 'Dine In' : 'Restaurant'}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-2">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {branch.branchName}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {branch.distanceFromMyLocation.toFixed(1)} km away
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1 configurable-primary-text" />
                              {branch.branchOpenTime} - {branch.branchCloseTime}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1 configurable-primary-text" />
                              {branch.branchAddress.substring(0, 40)}...
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            <Button 
                              size="sm" 
                              className="w-full configurable-primary text-white configurable-primary-hover"
                              data-testid={`button-main-select-${branch.branchId}`}
                            >
                              {selectedService === 'delivery' ? 'Order for Delivery' :
                               selectedService === 'takeaway' ? 'Order for Pickup' :
                               selectedService === 'dine-in' ? 'Dine In' : 'Select'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Reservation Section */}
        {selectedService === 'reservation' && (
          <section className="mb-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Select Restaurant
              </h1>
              <p className="text-gray-600">
                Choose a restaurant for your table reservation
              </p>
            </div>

            {/* Location and Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                    Restaurant Location
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      className="flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4 configurable-primary-text" />
                      {isLoadingLocation ? 'Getting...' : 'Current Location'}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMap(true)}
                      className="flex items-center justify-center gap-2"
                    >
                      <Map className="w-4 h-4 configurable-primary-text" />
                      Pick on Map
                    </Button>
                  </div>

                  <Input
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter area or restaurant name"
                  />
                  
                  {userCoords && (
                    <div className="text-xs text-gray-600 mt-2">
                      Location set: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Max Distance (km)
                  </label>
                  <Input
                    type="number"
                    value={maxDistance}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setMaxDistance('');
                      } else {
                        const num = Number(value);
                        setMaxDistance(Number.isFinite(num) ? num : '');
                      }
                    }}
                    placeholder="20"
                    min="1"
                    max="50"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={() => userCoords && searchBranchesForSelectedService(userCoords.lat, userCoords.lng)}
                  disabled={!userCoords || branchesLoading}
                  className="configurable-primary"
                >
                  {branchesLoading ? 'Searching...' : 'Search Restaurants'}
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                {filteredBranches.length} restaurants found for reservations
                {branchesError && (
                  <div className="text-red-600 mt-1">{branchesError}</div>
                )}
              </div>
            </div>

            {/* Restaurant List */}
            <Card>
              <CardHeader>
                <CardTitle>Available Restaurants</CardTitle>
              </CardHeader>
              <CardContent>
                {branchesLoading ? (
                  <div className="responsive-grid gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-t-lg mb-4"></div>
                        <div className="p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="responsive-grid gap-6">
                    {filteredBranches.map((branch: Branch) => (
                      <Card 
                        key={branch.branchId} 
                        className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                        onClick={() => handleBranchSelect(branch)}
                      >
                        <CardContent className="p-0">
                          <div className="relative">
                            <img
                              src={BranchService.getBranchImageUrl(branch.branchPicture)}
                              alt={branch.branchName}
                              className="w-full h-48 object-cover rounded-t-lg"
                            />
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-white text-black shadow-sm">
                                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                {branch.rating}
                              </Badge>
                            </div>
                            <div className="absolute top-3 left-3">
                              <Badge className="configurable-primary text-white">
                                Reservation
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="mb-2">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {branch.branchName}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {branch.distanceFromMyLocation.toFixed(1)} km away
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-gray-600 mb-3">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 configurable-primary-text" />
                                {branch.branchOpenTime} - {branch.branchCloseTime}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1 configurable-primary-text" />
                                {branch.branchAddress.substring(0, 40)}...
                              </div>
                              {branch.maxGuestsPerReservation && (
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1 configurable-primary-text" />
                                  Max {branch.maxGuestsPerReservation} guests
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                              <Button 
                                size="sm" 
                                className="w-full configurable-primary text-white configurable-primary-hover"
                              >
                                {selectedService === 'reservation' ? 'Proceed to reservation' : 
                                 selectedService === 'takeaway' ? 'Order Now' :
                                 selectedService === 'delivery' ? 'Order for Delivery' : 'View Menu'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredBranches.length === 0 && !branchesLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {branches.length === 0 ? 
                        "Set your location to find restaurants for reservations." :
                        "No restaurants found matching your search."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
        
        {/* Recommended Section - only show for non-reservation services */}
        {selectedService !== 'reservation' && recommendedItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Recommended For You</h2>
            <div className="space-y-4">
              {recommendedItems.slice(0, 4).map((item) => (
                <FoodCard key={item.id} item={item} variant="list" />
              ))}
            </div>
          </section>
        )}

        {/* Menu Filters - only show for non-reservation services */}
        {selectedService !== 'reservation' && (
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
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
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
        )}

        {/* Menu Items - only show for non-reservation services */}
        {selectedService !== 'reservation' && (
          <section className="mb-12">
            <div className="space-y-4">
              {paginatedItems.map((item) => (
                <FoodCard key={item.id} item={item} variant="list" />
              ))}
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
        )}

        {/* Deals Section - only show for non-reservation services */}
        {selectedService !== 'reservation' && dealItems.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold configurable-text-primary mb-6">Deals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dealItems.map((item) => (
                <FoodCard key={item.id} item={item} variant="grid" />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
      <FloatingButtons />
      <ThemeSwitcher />

      {/* Modals */}
      <AddToCartModal />
      <CartModal />
      <PaymentModal />
      <SplitBillModal />
      <ReviewModal />
      <ServiceRequestModal />
      <OrderConfirmationModal />
      
      {/* Map Modal */}
      {showMap && (
        <MapPickerModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          onLocationSelect={handleLocationFromMap}
        />
      )}
    </div>
  );
}
