import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BranchService } from "@/services/branch-service";
import { Branch } from "@/types/branch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, Clock, MapPin, Search, Navigation, Filter, Map } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function TakeawayPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userLocation, setUserLocation] = useState("Downtown");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState(30);
  const { setSelectedRestaurant, setServiceType } = useCartStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Search for takeaway branches
  const searchTakeawayBranches = async (latitude: number, longitude: number) => {
    setBranchesLoading(true);
    setBranchesError(null);
    
    try {
      const response = await BranchService.searchTakeawayBranches({
        latitude,
        longitude,
        address: userLocation || "",
        branchName: searchQuery || "",
        maxDistance
      });

      setBranches(response.data);
      
      toast({
        title: "Takeaway Branches Found",
        description: `Found ${response.data.length} branches available for takeaway.`,
      });
    } catch (error: any) {
      console.error('Takeaway branch search failed:', error);
      setBranchesError(error.message || 'Failed to find takeaway branches');
      
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Unable to find takeaway branches. Please try again.",
      });
    } finally {
      setBranchesLoading(false);
    }
  };

  // Get unique categories from branches
  const categories = ["All"];

  const filteredBranches = branches.filter((branch: Branch) => {
    const matchesSearch = branch.branchName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleSelectBranch = (branch: Branch) => {
    // Convert branch to restaurant format for compatibility
    const restaurant = {
      id: branch.branchId.toString(),
      name: branch.branchName,
      image: BranchService.getBranchImageUrl(branch.branchPicture),
      rating: branch.rating,
      cuisine: 'Restaurant',
      deliveryTime: '30-45 mins',
      deliveryFee: 0,
      minimumOrder: 0,
      address: branch.branchAddress,
      distance: branch.distanceFromMyLocation,
      isOpen: !branch.isBranchClosed
    };
    setSelectedRestaurant(restaurant);
    setServiceType('takeaway');
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
            // Auto-search when location is set
            searchTakeawayBranches(lat, lng);
          } catch (error) {
            console.error('Error getting address:', error);
            setUserCoords({ lat, lng });
            // Auto-search when location is set
            searchTakeawayBranches(lat, lng);
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
    // Auto-search when location is set
    searchTakeawayBranches(lat, lng);
  };

  // Handle manual search
  const handleManualSearch = () => {
    if (userCoords) {
      searchTakeawayBranches(userCoords.lat, userCoords.lng);
    } else {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please set your location first to search for takeaway branches.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Take Away Orders
            </h1>
            <p className="text-gray-600">
              Pick up your order from restaurants near you
            </p>
          </div>

          {/* Location and Search */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-1 configurable-primary-text" />
                  Pickup Location
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
                
                <Input
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Enter your location or use options above"
                  data-testid="input-takeaway-location"
                />
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Search className="w-4 h-4 mr-1 configurable-primary-text" />
                  Search Restaurants
                </label>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by restaurant name"
                    data-testid="input-search-takeaway-restaurants"
                  />
                  <Button 
                    onClick={handleManualSearch}
                    disabled={!userCoords || branchesLoading}
                    className="shrink-0"
                  >
                    {branchesLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Max Distance (km)
                </label>
                <Input
                  type="number"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  placeholder="30"
                  min="1"
                  max="100"
                  data-testid="input-max-distance"
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
                    data-testid={`takeaway-filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600">
              {filteredBranches.length} takeaway branches found
              {branchesError && (
                <div className="text-red-600 mt-1">{branchesError}</div>
              )}
            </div>
          </div>

          {/* Branch List */}
          {branchesLoading ? (
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
              {filteredBranches.map((branch: Branch) => (
                <Card 
                  key={branch.branchId} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    branch.isBranchClosed ? 'opacity-60' : ''
                  }`}
                  onClick={() => !branch.isBranchClosed && handleSelectBranch(branch)}
                  data-testid={`takeaway-branch-card-${branch.branchId}`}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={BranchService.getBranchImageUrl(branch.branchPicture)}
                        alt={branch.branchName}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {branch.isBranchClosed && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-lg flex items-center justify-center">
                          <Badge variant="destructive">Closed</Badge>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white text-black shadow-sm">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {branch.rating}
                        </Badge>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className="configurable-primary text-white">
                          Take Away
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
                          {branch.branchAddress.substring(0, 30)}...
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <Button 
                          size="sm" 
                          className="w-full configurable-primary text-white hover:configurable-primary-hover"
                          disabled={branch.isBranchClosed}
                          data-testid={`button-takeaway-order-${branch.branchId}`}
                        >
                          {!branch.isBranchClosed ? 'Order Now' : 'Closed'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredBranches.length === 0 && !branchesLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {branches.length === 0 ? 
                  "Set your location to find takeaway branches near you." :
                  "No takeaway branches found matching your search."
                }
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