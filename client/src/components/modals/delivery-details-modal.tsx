import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, User, Mail, Phone, Clock, Navigation, Map } from "lucide-react";
import { useCartStore } from "@/lib/store";
import MapPickerModal from "./map-picker-modal";

interface DeliveryDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  apartmentUnit?: string;
  deliveryInstructions?: string;
  preferredTime?: string;
  latitude?: number;
  longitude?: number;
}

export default function DeliveryDetailsModal() {
  const { 
    isDeliveryDetailsModalOpen, 
    setDeliveryDetailsModalOpen, 
    setPaymentModalOpen,
    selectedRestaurant,
    setDeliveryDetails
  } = useCartStore();

  const [details, setDetails] = useState<DeliveryDetails>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    apartmentUnit: "",
    deliveryInstructions: "",
    preferredTime: "",
    latitude: undefined,
    longitude: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!details.customerName.trim()) {
      newErrors.customerName = "Name is required";
    }

    if (!details.customerEmail.trim()) {
      newErrors.customerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.customerEmail)) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    if (!details.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required";
    } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(details.customerPhone)) {
      newErrors.customerPhone = "Please enter a valid phone number";
    }

    if (!details.deliveryAddress.trim()) {
      newErrors.deliveryAddress = "Delivery address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateForm()) {
      setDeliveryDetails(details);
      setDeliveryDetailsModalOpen(false);
      setPaymentModalOpen(true);
    }
  };

  const handleBack = () => {
    setDeliveryDetailsModalOpen(false);
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
              setDetails({
                ...details,
                deliveryAddress: address,
                latitude: lat,
                longitude: lng
              });
            } else {
              setDetails({
                ...details,
                latitude: lat,
                longitude: lng
              });
            }
          } catch (error) {
            console.error('Error getting address:', error);
            setDetails({
              ...details,
              latitude: lat,
              longitude: lng
            });
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
    setDetails({
      ...details,
      deliveryAddress: address,
      latitude: lat,
      longitude: lng
    });
    setShowMap(false);
  };


  return (
    <Dialog open={isDeliveryDetailsModalOpen} onOpenChange={setDeliveryDetailsModalOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-xl font-bold text-black flex items-center">
            <MapPin className="w-5 h-5 mr-2 configurable-primary-text" />
            Delivery Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Restaurant Info */}
          {selectedRestaurant && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-black mb-2">{selectedRestaurant.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Estimated delivery: {selectedRestaurant.deliveryTime}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Delivery fee: PKR {selectedRestaurant.deliveryFee}
                </div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-black flex items-center">
              <User className="w-4 h-4 mr-2 configurable-primary-text" />
              Customer Information
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="customerName" className="mb-2.5 block">Full Name *</Label>
                <Input
                  id="customerName"
                  value={details.customerName}
                  onChange={(e) => setDetails({ ...details, customerName: e.target.value })}
                  placeholder="Enter your full name"
                  className={errors.customerName ? "border-red-500" : ""}
                  data-testid="input-customer-name"
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail" className="mb-2.5 block">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={details.customerEmail}
                  onChange={(e) => setDetails({ ...details, customerEmail: e.target.value })}
                  placeholder="Enter your email address"
                  className={errors.customerEmail ? "border-red-500" : ""}
                  data-testid="input-customer-email"
                />
                {errors.customerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerPhone" className="mb-2.5 block">Phone Number *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={details.customerPhone}
                  onChange={(e) => setDetails({ ...details, customerPhone: e.target.value })}
                  placeholder="Enter your phone number"
                  className={errors.customerPhone ? "border-red-500" : ""}
                  data-testid="input-customer-phone"
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-4">
            <h3 className="font-medium text-black flex items-center">
              <MapPin className="w-4 h-4 mr-2 configurable-primary-text" />
              Delivery Address
            </h3>

            <div className="space-y-4">
              {/* Location Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                  className="flex items-center justify-center gap-2"
                  data-testid="button-current-location"
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
                  data-testid="button-map-location"
                >
                  <Map className="w-4 h-4 configurable-primary-text" />
                  Pick on Map
                </Button>
              </div>

              {/* Show coordinates if available */}
              {details.latitude && details.longitude && (
                <div className="configurable-secondary p-3 rounded-lg border configurable-border">
                  <div className="flex items-center configurable-primary-text text-sm">
                    <MapPin className="w-4 h-4 mr-2 configurable-primary-text" />
                    <span>Location set: {details.latitude.toFixed(6)}, {details.longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="deliveryAddress" className="mb-2.5 block">Street Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={details.deliveryAddress}
                  onChange={(e) => setDetails({ ...details, deliveryAddress: e.target.value })}
                  placeholder="Enter your full delivery address or use location options above"
                  className={errors.deliveryAddress ? "border-red-500" : ""}
                  rows={3}
                  data-testid="textarea-delivery-address"
                />
                {errors.deliveryAddress && (
                  <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress}</p>
                )}
              </div>

              <div>
                <Label htmlFor="apartmentUnit" className="mb-2.5 block">Apartment/Unit Number</Label>
                <Input
                  id="apartmentUnit"
                  value={details.apartmentUnit}
                  onChange={(e) => setDetails({ ...details, apartmentUnit: e.target.value })}
                  placeholder="Apt, Suite, Unit, Floor (optional)"
                  data-testid="input-apartment-unit"
                />
              </div>

              <div>
                <Label htmlFor="deliveryInstructions" className="mb-2.5 block">Delivery Instructions</Label>
                <Textarea
                  id="deliveryInstructions"
                  value={details.deliveryInstructions}
                  onChange={(e) => setDetails({ ...details, deliveryInstructions: e.target.value })}
                  placeholder="Any special instructions for the delivery driver (optional)"
                  rows={2}
                  data-testid="textarea-delivery-instructions"
                />
              </div>

              <div>
                <Label htmlFor="preferredTime" className="mb-2.5 block">Preferred Delivery Time</Label>
                <Input
                  id="preferredTime"
                  type="time"
                  value={details.preferredTime}
                  onChange={(e) => setDetails({ ...details, preferredTime: e.target.value })}
                  data-testid="input-preferred-time"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for ASAP delivery
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex-1"
              data-testid="button-back-to-cart"
            >
              Back to Cart
            </Button>
            <Button 
              onClick={handleProceedToPayment}
              className="flex-1 configurable-primary hover:configurable-primary-hover text-white"
              data-testid="button-proceed-to-payment"
            >
              Proceed to Payment
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            * Required fields. Your information will be used only for this order.
          </p>
        </div>
      </DialogContent>
      
      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onLocationSelect={handleLocationFromMap}
        initialLat={details.latitude}
        initialLng={details.longitude}
      />
    </Dialog>
  );
}