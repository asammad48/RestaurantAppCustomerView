import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Search, Star, Navigation, Map, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BranchService } from "@/services/branch-service";
import { Branch } from "@/types/branch";
import { applyGreenTheme } from "@/lib/colors";
import { useCartStore } from "@/lib/store";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function ReservationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("Downtown");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState(3);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setSelectedBranch } = useCartStore();

  // Apply green theme on page load
  useEffect(() => {
    applyGreenTheme();
  }, []);

  // Search for reservation branches
  const searchReservationBranches = async (latitude: number, longitude: number) => {
    setBranchesLoading(true);
    setBranchesError(null);
    
    try {
      const response = await BranchService.searchReservationBranches({
        latitude,
        longitude,
        address: userLocation || "",
        branchName: searchQuery || "",
        maxDistance
      });

      setBranches(response.data);
      
      toast({
        title: "Reservation Branches Found",
        description: `Found ${response.data.length} restaurants available for reservations.`,
      });
    } catch (error: any) {
      console.error('Reservation branch search failed:', error);
      setBranchesError(error.message || 'Failed to find reservation branches');
      
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Unable to find restaurants for reservations. Please try again.",
      });
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    // Store the selected branch in cart store for theming
    setSelectedBranch(branch);
    
    // Navigate to reservation detail page with selected branch
    setLocation(`/reservation-detail?branchId=${branch.branchId}&branchName=${encodeURIComponent(branch.branchName)}`);
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
          searchReservationBranches(lat, lng);
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
    searchReservationBranches(lat, lng);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  data-testid="button-current-location-reservation"
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
                  data-testid="button-map-location-reservation"
                >
                  <Map className="w-4 h-4 configurable-primary-text" />
                  Pick on Map
                </Button>
              </div>

              <Input
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                placeholder="Enter your location"
                data-testid="input-reservation-location"
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
                data-testid="input-search-reservation-restaurants"
              />
            </div>
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Max Distance (km)
              </label>
              <Input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                placeholder="3"
                min="1"
                max="50"
                data-testid="input-max-distance-reservation"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={() => userCoords && searchReservationBranches(userCoords.lat, userCoords.lng)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredBranches.map((branch: Branch) => (
                  <Card 
                    key={branch.branchId} 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                    onClick={() => handleBranchSelect(branch)}
                    data-testid={`reservation-branch-card-${branch.branchId}`}
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
                            data-testid={`button-reservation-select-${branch.branchId}`}
                          >
                            Book Table
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
      </div>

      {/* Map Modal */}
      {showMap && (
        <MapPickerModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          onLocationSelect={handleLocationFromMap}
          currentLocation={userLocation}
        />
      )}

      <Footer />
      <ThemeSwitcher />
    </div>
  );
}