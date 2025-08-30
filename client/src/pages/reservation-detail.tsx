import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table } from "@/lib/mock-data";
import { TableService, TableLocation } from "@/services/table-service";
import { BranchService } from "@/services/branch-service";
import { applyBranchPrimaryColor } from "@/lib/colors";
import { useCartStore } from "@/lib/store";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";

export default function ReservationDetailPage() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [guests, setGuests] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [tables, setTables] = useState<TableLocation[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [step, setStep] = useState<'table' | 'details' | 'confirmation'>('table');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [branchPrimaryColor, setBranchPrimaryColor] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { selectedBranch } = useCartStore();

  // Parse URL parameters and fetch branch details
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const branchIdParam = urlParams.get('branchId');
    const branchNameParam = urlParams.get('branchName');
    
    if (branchIdParam) {
      setBranchId(parseInt(branchIdParam));
      fetchTablesForBranch(parseInt(branchIdParam));
      fetchBranchDetails(parseInt(branchIdParam));
    }
    
    if (branchNameParam) {
      setBranchName(decodeURIComponent(branchNameParam));
    }
  }, []);

  // Apply branch-specific theming when color is available
  useEffect(() => {
    // First try selectedBranch from store, then fallback to fetched branch color
    const primaryColor = selectedBranch?.primaryColor || branchPrimaryColor;
    if (primaryColor) {
      applyBranchPrimaryColor(primaryColor);
    } else {
      console.log('No primary color found:', { selectedBranch, branchPrimaryColor });
    }
  }, [selectedBranch, branchPrimaryColor]);

  // Fetch branch details for theming
  const fetchBranchDetails = async (branchId: number) => {
    try {
      const response = await BranchService.getBranchDetails(branchId);
      if (response.data?.primaryColor) {
        setBranchPrimaryColor(response.data.primaryColor);
      } else if (response.data?.branchPrimaryColor) {
        setBranchPrimaryColor(response.data.branchPrimaryColor);
      }
      console.log('Branch details response:', response.data);
    } catch (error) {
      console.error('Failed to fetch branch details:', error);
    }
  };

  // Fetch tables for selected branch
  const fetchTablesForBranch = async (branchId: number) => {
    setTablesLoading(true);
    setTablesError(null);
    
    try {
      const response = await TableService.getTableLocations(branchId);
      setTables(response.data);
      
      toast({
        title: "Tables Loaded",
        description: `Found ${response.data.length} tables available for reservation.`,
      });
    } catch (error: any) {
      console.error('Failed to fetch tables:', error);
      setTablesError(error.message || 'Failed to load tables');
      
      toast({
        variant: "destructive",
        title: "Error Loading Tables",
        description: "Unable to load available tables. Please try again.",
      });
    } finally {
      setTablesLoading(false);
    }
  };

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

  const handleTableSelect = (table: TableLocation) => {
    // Convert TableLocation to Table format for compatibility
    const compatibleTable: Table = {
      id: table.id.toString(),
      number: parseInt(table.name.replace(/\D/g, '')) || table.id,
      seats: table.capacity,
      isAvailable: true, // Assume available from API
      type: 'standard',
      location: TableService.getTableTypeName(table.locationType)
    };
    setSelectedTable(compatibleTable);
    setStep('details');
  };

  const handleSubmitReservation = () => {
    if (!selectedTable || !customerName || !customerPhone || !date || !time || !branchId) {
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
      branchId,
      branchName,
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
                    <div><strong>Restaurant:</strong> {branchName}</div>
                    <div><strong>Table:</strong> {selectedTable?.number} ({selectedTable?.type})</div>
                    {specialRequests && (
                      <div><strong>Special Requests:</strong> {specialRequests}</div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => setLocation('/')}
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
          <div className="flex items-center mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/reservation')}
              className="mr-4"
              data-testid="button-back-to-restaurants"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Restaurants
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {step === 'table' ? 'Select Table' : 'Reservation Details'}
              </h1>
              <p className="text-gray-600">
                Restaurant: <strong>{branchName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center configurable-primary-text">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium configurable-primary">
              ✓
            </div>
            <span className="ml-2 font-medium">Select Restaurant</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-2"></div>
          <div className={`flex items-center ${step === 'table' ? 'configurable-primary-text' : 'configurable-primary-text'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${step === 'table' ? 'configurable-primary' : 'configurable-primary'}`}>
              {step === 'details' ? '✓' : '2'}
            </div>
            <span className="ml-2 font-medium">Select Table</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-2"></div>
          <div className={`flex items-center ${step === 'details' ? 'configurable-primary-text' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${step === 'details' ? 'configurable-primary' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="ml-2 font-medium">Your Details</span>
          </div>
        </div>

        {step === 'table' && (
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
                    onClick={() => setGuests(guests + 1)}
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
                <CardTitle>Available Tables</CardTitle>
              </CardHeader>
              <CardContent>
                {tablesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-32 bg-gray-200 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tables.filter((table: TableLocation) => table.capacity >= guests).map((table: TableLocation) => (
                      <Card 
                        key={table.id} 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          selectedTable?.id === table.id.toString() ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleTableSelect(table)}
                        data-testid={`table-card-${table.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-lg">{table.name}</span>
                            <Badge className={getTableTypeColor(TableService.getTableTypeName(table.locationType))}>
                              {getTableTypeIcon(TableService.getTableTypeName(table.locationType))} {TableService.getTableTypeName(table.locationType)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              Seats {table.capacity} guests
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {tables.filter((table: TableLocation) => table.capacity >= guests).length === 0 && !tablesLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {tablesError ? tablesError : `No tables available for ${guests} guests. Try reducing the number of guests.`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {step === 'details' && selectedTable && (
          <>
            {/* Selected Table Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Selected Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Badge className={getTableTypeColor(selectedTable.type)}>
                    {getTableTypeIcon(selectedTable.type)} {selectedTable.type}
                  </Badge>
                  <span className="font-semibold">Table {selectedTable.number}</span>
                  <span className="text-gray-600">• {selectedTable.seats} seats</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details Form */}
            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      data-testid="input-customer-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter your email address"
                      data-testid="input-customer-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="date">Reservation Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      data-testid="input-reservation-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Reservation Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      data-testid="input-reservation-time"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requests">Special Requests</Label>
                  <Textarea
                    id="requests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests or dietary requirements?"
                    rows={3}
                    data-testid="textarea-special-requests"
                  />
                </div>

                <div className="flex justify-between">
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
                    className="configurable-primary"
                    data-testid="button-confirm-reservation"
                  >
                    {reservationMutation.isPending ? 'Confirming...' : 'Confirm Reservation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Footer />
      <ThemeSwitcher />
    </div>
  );
}