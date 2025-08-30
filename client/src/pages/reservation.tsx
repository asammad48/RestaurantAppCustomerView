import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin, Check, Search, Filter, Star, Navigation, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table } from "@/lib/mock-data";
import { BranchService } from "@/services/branch-service";
import { Branch } from "@/types/branch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import MapPickerModal from "@/components/modals/map-picker-modal";

export default function ReservationPage() {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [guests, setGuests] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("Downtown");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState(3);
  const [step, setStep] = useState<'restaurant' | 'table' | 'details' | 'confirmation'>('restaurant');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const { toast } = useToast();

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

  // Mock tables data - in real app this would come from API based on selected branch
  const tables = [
    { id: '1', number: 1, seats: 2, type: 'window', isAvailable: true },
    { id: '2', number: 2, seats: 4, type: 'standard', isAvailable: true },
    { id: '3', number: 3, seats: 6, type: 'private', isAvailable: false },
    { id: '4', number: 4, seats: 8, type: 'outdoor', isAvailable: true },
  ] as Table[];
  const isLoadingTables = false;

  const reservationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/reservations", data);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setReservationId(result.id);
      setStep('confirmation');
      toast({
        title: "Reservation Confirmed!",
        description: "Your table has been successfully reserved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to make reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setStep('table');
  };

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    setStep('details');
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

  const handleSubmitReservation = () => {
    if (!selectedTable || !customerName || !customerPhone || !date || !time || !selectedBranch) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    reservationMutation.mutate({
      customerName,
      customerPhone,
      customerEmail,
      date,
      time,
      guests,
      branchId: selectedBranch.branchId,
      branchName: selectedBranch.branchName,
      tableId: selectedTable.id,
      specialRequests,
      status: 'confirmed',
    });
  };

  const getTableTypeColor = (type: string) => {
    switch (type) {
      case 'window': return 'configurable-secondary configurable-primary-text';
      case 'private': return 'bg-purple-100 text-purple-800';
      case 'outdoor': return 'configurable-secondary configurable-primary-text';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTableTypeIcon = (type: string) => {
    switch (type) {
      case 'window': return '🪟';
      case 'private': return '🔒';
      case 'outdoor': return '🌿';
      default: return '🪑';
    }
  };

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 configurable-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 configurable-primary-text" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Reservation Confirmed!
                </h1>
                <p className="text-gray-600 mb-6">
                  Your table has been successfully reserved.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-3">Reservation Details:</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Reservation ID:</strong> {reservationId}</div>
                    <div><strong>Name:</strong> {customerName}</div>
                    <div><strong>Date:</strong> {date}</div>
                    <div><strong>Time:</strong> {time}</div>
                    <div><strong>Guests:</strong> {guests}</div>
                    <div><strong>Restaurant:</strong> {selectedBranch?.branchName}</div>
                    <div><strong>Table:</strong> {selectedTable?.number} ({selectedTable?.type})</div>
                    {specialRequests && (
                      <div><strong>Special Requests:</strong> {specialRequests}</div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => window.location.href = '/'}
                  data-testid="button-back-to-home"
                >
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
        <ThemeSwitcher />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Table Reservation
            </h1>
            <p className="text-gray-600">
              Book a table for your dining experience
            </p>
          </div>

          {/* Steps */}
          <div className="flex items-center mb-8">
            <div className={`flex items-center ${step === 'restaurant' ? 'configurable-primary-text' : 'configurable-primary-text'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${step === 'restaurant' ? 'configurable-primary' : 'configurable-primary'}`}>
                {step === 'restaurant' ? '1' : '✓'}
              </div>
              <span className="ml-2 font-medium">Select Restaurant</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-2"></div>
            <div className={`flex items-center ${step === 'table' ? 'configurable-primary-text' : step !== 'restaurant' && step !== 'table' ? 'configurable-primary-text' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${step === 'table' ? 'configurable-primary' : step !== 'restaurant' && step !== 'table' ? 'configurable-primary' : 'bg-gray-300'}`}>
                {step !== 'restaurant' && step !== 'table' && step !== 'details' ? '✓' : '2'}
              </div>
              <span className="ml-2 font-medium">Select Table</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-2"></div>
            <div className={`flex items-center ${step === 'details' ? 'configurable-primary-text' : step !== 'restaurant' && step !== 'table' && step !== 'details' ? 'configurable-primary-text' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${step === 'details' ? 'configurable-primary' : step !== 'restaurant' && step !== 'table' && step !== 'details' ? 'configurable-primary' : 'bg-gray-300'}`}>
                {step !== 'restaurant' && step !== 'table' && step !== 'details' ? '✓' : '3'}
              </div>
              <span className="ml-2 font-medium">Your Details</span>
            </div>
          </div>

          {step === 'restaurant' && (
            <>
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
            </>
          )}

          {step === 'table' && selectedBranch && (
            <>
              {/* Guest Selection */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Number of Guests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      data-testid="button-decrease-guests"
                    >
                      -
                    </Button>
                    <span className="text-xl font-semibold w-8 text-center">{guests}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGuests(Math.min(selectedBranch?.maxGuestsPerReservation || 10, guests + 1))}
                      data-testid="button-increase-guests"
                    >
                      +
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Available Tables */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Tables at {selectedRestaurant.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {selectedRestaurant.cuisine} • {selectedRestaurant.rating} ⭐
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingTables ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-32 bg-gray-200 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(tables as Table[])?.filter((table: Table) => table.seats >= guests && table.isAvailable).map((table: Table) => (
                        <Card 
                          key={table.id}
                          className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105"
                          onClick={() => handleTableSelect(table)}
                          data-testid={`table-card-${table.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="text-center">
                              <div className="text-xl mb-1">
                                {getTableTypeIcon(table.type)}
                              </div>
                              <h3 className="font-semibold text-sm mb-1">
                                Table {table.number}
                              </h3>
                              <Badge className={`mb-2 text-xs ${getTableTypeColor(table.type)}`}>
                                {table.type}
                              </Badge>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center justify-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {table.seats} seats
                                </div>
                                <div className="flex items-center justify-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {table.location}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {(tables as Table[])?.filter((table: Table) => table.seats >= guests && table.isAvailable).length === 0 && !isLoadingTables && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No tables available for {guests} guests. Try reducing the number of guests.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {step === 'details' && selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle>Reservation Details</CardTitle>
                <p className="text-sm text-gray-600">
                  Selected: Table {selectedTable.number} ({selectedTable.type}) - {selectedTable.seats} seats
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="customerName" className="mb-2 block">Full Name *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your full name"
                        data-testid="input-customer-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="mb-2 block">Phone Number *</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+1234567890"
                        data-testid="input-customer-phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail" className="mb-2 block">Email Address</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        data-testid="input-customer-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="date" className="mb-2 block">Reservation Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-reservation-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time" className="mb-2 block">Reservation Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        data-testid="input-reservation-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialRequests" className="mb-2 block">Special Requests</Label>
                      <Textarea
                        id="specialRequests"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Any special requirements or occasions..."
                        rows={3}
                        data-testid="textarea-special-requests"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep('table')}
                    data-testid="button-back-to-tables"
                  >
                    Back to Tables
                  </Button>
                  <Button
                    onClick={handleSubmitReservation}
                    disabled={reservationMutation.isPending}
                    data-testid="button-confirm-reservation"
                  >
                    {reservationMutation.isPending ? 'Confirming...' : 'Confirm Reservation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      <Footer />
      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onLocationSelect={handleLocationFromMap}
        initialLat={userCoords?.lat}
        initialLng={userCoords?.lng}
      />
      <ThemeSwitcher />
    </div>
  );
}