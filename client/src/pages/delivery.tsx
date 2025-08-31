import { useState, useEffect } from "react";
import { MapPin, Search, Navigation, Map, Bike, ShoppingBag, Calendar, UtensilsCrossed, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { BranchService } from "@/services/branch-service";
import { Branch } from "@/types/branch";
import { useCartStore } from "@/lib/store";
import { applyGreenTheme } from "@/lib/colors";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import BranchResults from "@/components/branch-results";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function DeliveryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<'delivery' | 'takeaway' | 'dine-in' | 'reservation'>('delivery');
  const { setServiceType } = useCartStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Apply green theme on page load
  useEffect(() => {
    applyGreenTheme();
  }, []);

  // Filter branches based on search query
  const filteredBranches = branches.filter((branch: Branch) => {
    const matchesSearch = branch.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         branch.branchAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Search for nearby branches
  const searchBranches = async (latitude: number, longitude: number) => {
    setBranchesLoading(true);
    setBranchesError(null);
    
    try {
      const response = await BranchService.searchBranches({
        latitude,
        longitude,
        address: "", // As requested, send empty string
        branchName: "" // As requested, send empty string
      });

      setBranches(response.data);
      
      toast({
        title: "Restaurants Found",
        description: `Found ${response.data.length} restaurants available for delivery.`,
      });
    } catch (error: any) {
      console.error('Branch search failed:', error);
      setBranchesError(error.message || 'Failed to find restaurants for delivery');
      
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Unable to find restaurants for delivery. Please try again.",
      });
    } finally {
      setBranchesLoading(false);
    }
  };

  // Handle service type selection
  const handleServiceSelect = (service: 'delivery' | 'takeaway' | 'dine-in' | 'reservation') => {
    setSelectedService(service);
    setServiceType(service);
    // All services stay on this page now - no navigation
  };

  // Handle branch selection
  const handleSelectBranch = (branch: Branch) => {
    const { setSelectedBranch } = useCartStore.getState();
    setServiceType(selectedService);
    setSelectedBranch(branch);
    toast({
      title: "Restaurant Selected",
      description: `Selected ${branch.branchName} for ${selectedService}. Redirecting to menu...`,
    });
    
    // Navigate to menu page
    setLocation('/restaurant-menu');
  };

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          try {
            // Try to get address using Google Geocoding (if you have the key)
            setUserLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setUserCoords({ lat, lng });
            
            // Search for nearby branches
            await searchBranches(lat, lng);
            
            toast({
              title: "Location Found",
              description: "Found your location and searching for nearby restaurants.",
            });
          } catch (error) {
            console.error('Error processing location:', error);
            setUserCoords({ lat, lng });
            setUserLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
          
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Unable to get your location. Please enter address manually or use map picker.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setIsLoadingLocation(false);
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by this browser.",
      });
    }
  };

  // Handle map location selection
  const handleMapLocationSelect = () => {
    setShowMap(true);
  };

  // Handle location selection from map
  const handleLocationFromMap = async (lat: number, lng: number, address: string) => {
    setUserLocation(address);
    setUserCoords({ lat, lng });
    setShowMap(false);
    
    // Search for nearby branches
    await searchBranches(lat, lng);
    
    toast({
      title: "Location Set",
      description: "Location updated and searching for nearby restaurants.",
    });
  };

  // Handle manual address search
  const handleAddressSearch = async () => {
    if (!userLocation.trim()) {
      toast({
        variant: "destructive",
        title: "Address Required",
        description: "Please enter an address or use location services.",
      });
      return;
    }

    // For now, we'll use a mock location since we need coordinates
    // In a real app, you'd geocode the address to get coordinates
    toast({
      variant: "destructive",
      title: "Feature Not Available",
      description: "Please use current location or map picker for now. Address geocoding requires additional setup.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Service Selection */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Choose Your Service
          </h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                  data-testid={`service-option-${service.id}`}
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
        </div>

        {/* Dynamic Content Based on Service Selection */}
        {selectedService === 'delivery' && (
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
                
                <div className="flex gap-2">
                  <Input
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter your delivery address"
                    data-testid="input-delivery-location"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddressSearch}
                    variant="outline"
                    disabled={!userLocation.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Search className="w-4 h-4 mr-1 configurable-primary-text" />
                  Search Restaurants
                </label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or address"
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
          </div>
        )}

        {selectedService === 'takeaway' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="text-center mb-6">
              <ShoppingBag className="w-12 h-12 configurable-primary-text mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Set Your Pickup Location</h3>
              <p className="text-gray-600">Please set your location to find restaurants available for pickup in your area.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                  Pickup Location
                </label>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className="flex items-center justify-center gap-2"
                    data-testid="button-current-location-takeaway"
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
                    data-testid="button-map-location-takeaway"
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
                
                <div className="flex gap-2">
                  <Input
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter your pickup location"
                    data-testid="input-pickup-location"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddressSearch}
                    variant="outline"
                    disabled={!userLocation.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Search className="w-4 h-4 mr-1 configurable-primary-text" />
                  Search Restaurants
                </label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or address"
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
          </div>
        )}

        {selectedService === 'dine-in' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="text-center mb-6">
              <UtensilsCrossed className="w-12 h-12 configurable-primary-text mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Restaurants for Dining In</h3>
              <p className="text-gray-600">Browse restaurants in your area where you can dine in and enjoy your meal.</p>
            </div>
            
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
                    data-testid="button-current-location-dinein"
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
                    data-testid="button-map-location-dinein"
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
                
                <div className="flex gap-2">
                  <Input
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter area to search restaurants"
                    data-testid="input-dinein-location"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddressSearch}
                    variant="outline"
                    disabled={!userLocation.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Search className="w-4 h-4 mr-1 configurable-primary-text" />
                  Search Restaurants
                </label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or address"
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
          </div>
        )}

        {selectedService === 'reservation' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 configurable-primary-text mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Make a Restaurant Reservation</h3>
              <p className="text-gray-600">Book a table at your favorite restaurant for the perfect dining experience.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                  Restaurant Location
                </label>
                <Input
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Enter area or restaurant name"
                  data-testid="input-reservation-location"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 mr-1 configurable-primary-text" />
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  className="mb-2"
                  data-testid="input-reservation-datetime"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 mr-1 configurable-primary-text" />
                  Number of Guests
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md" data-testid="select-guests">
                  <option value="">Select guests</option>
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                  <option value="5">5 guests</option>
                  <option value="6">6 guests</option>
                  <option value="7">7 guests</option>
                  <option value="8">8 guests</option>
                  <option value="9+">9+ guests</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {selectedService === 'delivery' ? 'Available Restaurants for Delivery' :
             selectedService === 'takeaway' ? 'Available Restaurants for Pickup' :
             selectedService === 'dine-in' ? 'Available Restaurants for Dining In' :
             'Available Restaurants for Reservation'}
          </h2>
          
          {!userCoords ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedService === 'delivery' ? 'Set Your Delivery Location' :
                 selectedService === 'takeaway' ? 'Set Your Pickup Location' :
                 selectedService === 'dine-in' ? 'Find Restaurants Near You' :
                 'Find Restaurants for Reservation'}
              </h3>
              <p className="text-gray-500">
                {selectedService === 'delivery' ? 'Please set your location to find restaurants available for delivery in your area.' :
                 selectedService === 'takeaway' ? 'Please set your location to find restaurants available for pickup in your area.' :
                 selectedService === 'dine-in' ? 'Please set your location to find restaurants where you can dine in.' :
                 'Please search for restaurants where you can make a reservation.'}
              </p>
            </div>
          ) : (
            <>
              {branchesError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{branchesError}</AlertDescription>
                </Alert>
              )}
              
              <div className="mb-4 text-sm text-gray-600">
                {filteredBranches.length} restaurants found
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
              
              <BranchResults
                branches={filteredBranches}
                loading={branchesLoading}
                onSelectBranch={handleSelectBranch}
              />
            </>
          )}
        </div>
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