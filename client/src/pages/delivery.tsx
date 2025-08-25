import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, Clock, DollarSign, MapPin, Search, Filter, Navigation, Map } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { Restaurant } from "@/lib/mock-data";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function DeliveryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userLocation, setUserLocation] = useState("Downtown");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const { setSelectedRestaurant, setServiceType } = useCartStore();
  const [, setLocation] = useLocation();

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Get unique categories from restaurants
  const cuisineTypes = (restaurants as Restaurant[])?.map(r => r.cuisine) || [];
  const uniqueCuisines = cuisineTypes.filter((value, index, self) => self.indexOf(value) === index);
  const categories = ["All", ...uniqueCuisines];

  const filteredRestaurants = (restaurants as Restaurant[])?.filter((restaurant: Restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || restaurant.cuisine === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setServiceType('delivery');
    setLocation('/restaurant-menu');
  };

  // Get current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          try {
            // Reverse geocoding to get address
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
            );
            const data = await response.json();
            
            if (data.features && data.features[0]) {
              const address = data.features[0].place_name;
              setUserLocation(address);
            }
            setUserCoords({ lat, lng });
          } catch (error) {
            console.error('Error getting address:', error);
            setUserCoords({ lat, lng });
          }
          
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
          alert('Unable to get your location. Please enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setIsLoadingLocation(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Handle map location selection
  const handleMapLocationSelect = () => {
    setShowMap(true);
  };

  // Handle location selection from map
  const handleLocationFromMap = (lat: number, lng: number, address: string) => {
    setUserLocation(address);
    setUserCoords({ lat, lng });
    setShowMap(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Food Delivery
            </h1>
            <p className="text-gray-600">
              Order from restaurants in your area
            </p>
          </div>

          {/* Location and Search */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                  Delivery Location
                </label>
                
                {/* Location Options */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className="flex items-center justify-center gap-2"
                    data-testid="button-current-location-delivery"
                  >
                    <Navigation className="w-4 h-4 configurable-primary-text" />
                    {isLoadingLocation ? 'Getting...' : 'Current Location'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMapLocationSelect}
                    className="flex items-center justify-center gap-2"
                    data-testid="button-map-location-delivery"
                  >
                    <Map className="w-4 h-4 configurable-primary-text" />
                    Pick on Map
                  </Button>
                </div>

                {/* Show coordinates if available */}
                {userCoords && (
                  <div className="configurable-secondary p-2 rounded-md border configurable-border mb-2">
                    <div className="flex items-center configurable-primary-text text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>Location set: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>
                    </div>
                  </div>
                )}
                
                <Input
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Enter your address or use location options above"
                  data-testid="input-delivery-location"
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
                  placeholder="Search by name or cuisine"
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 configurable-primary-text" />
              <h3 className="font-medium text-gray-900">Filter by Cuisine</h3>
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="text-sm"
                    data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              {filteredRestaurants.length} restaurants found
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </div>
          </div>

          {/* Restaurant List */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-0">
                    <div className="h-48 bg-gray-200 rounded-t-lg mb-4"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredRestaurants.map((restaurant: Restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    !restaurant.isOpen ? 'opacity-60' : ''
                  }`}
                  onClick={() => restaurant.isOpen && handleSelectRestaurant(restaurant)}
                  data-testid={`restaurant-card-${restaurant.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {!restaurant.isOpen && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-lg flex items-center justify-center">
                          <Badge variant="destructive">Closed</Badge>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white text-black shadow-sm">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {restaurant.rating}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {restaurant.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {restaurant.cuisine}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 configurable-primary-text" />
                          {restaurant.deliveryTime}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1 configurable-primary-text" />
                          Fee: PKR {restaurant.deliveryFee}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1 configurable-primary-text" />
                          {restaurant.distance}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <Button 
                          size="sm" 
                          className="w-full configurable-primary text-white hover:configurable-primary-hover"
                          disabled={!restaurant.isOpen}
                          onClick={() => handleSelectRestaurant(restaurant)}
                          data-testid={`button-order-from-${restaurant.id}`}
                        >
                          {restaurant.isOpen ? 'Order Now' : 'Closed'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredRestaurants.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No restaurants found matching your search.
              </p>
            </div>
          )}
      </div>

      <Footer />
      <ThemeSwitcher />
      
      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onLocationSelect={handleLocationFromMap}
        initialLat={userCoords?.lat}
        initialLng={userCoords?.lng}
      />
    </div>
  );
}