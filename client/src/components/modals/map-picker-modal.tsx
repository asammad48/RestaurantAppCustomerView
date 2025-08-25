import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPickerModal({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  initialLat = 24.8607, // Default to Karachi
  initialLng = 67.0011 
}: MapPickerModalProps) {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [address, setAddress] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoords = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      // Using a public geocoding service (you can replace with Google Maps API)
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
      );
      const data = await response.json();
      
      if (data.features && data.features[0]) {
        setAddress(data.features[0].place_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
    setIsLoadingAddress(false);
  };

  useEffect(() => {
    if (isOpen) {
      getAddressFromCoords(selectedLat, selectedLng);
    }
  }, [isOpen, selectedLat, selectedLng]);

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert click position to approximate coordinates
    // This is a simplified calculation - in a real app you'd use proper map projection
    const lat = selectedLat + (rect.height / 2 - y) * 0.001;
    const lng = selectedLng + (x - rect.width / 2) * 0.001;
    
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng, address);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-xl font-bold text-black flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 configurable-primary-text" />
              Pick Location on Map
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              data-testid="button-close-map"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Map Container */}
          <div className="relative">
            <div 
              className="w-full h-96 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair relative overflow-hidden"
              onClick={handleMapClick}
              data-testid="map-container"
              style={{
                backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                                 linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                                 linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                                 linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}
            >
              {/* Map Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-green-400" />
                  <p className="text-lg font-medium">Interactive Map</p>
                  <p className="text-sm">Click anywhere to select location</p>
                </div>
              </div>
              
              {/* Selected Location Pin */}
              <div 
                className="absolute z-10 transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: '50%',
                  top: '50%'
                }}
              >
                <MapPin className="w-8 h-8 text-green-500 drop-shadow-lg" fill="currentColor" />
              </div>
              
              {/* Grid overlay for visual reference */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" className="text-gray-400">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </div>
          </div>

          {/* Selected Location Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Selected Location:</h4>
            <div className="space-y-1 text-sm">
              <div className="text-blue-700">
                <strong>Coordinates:</strong> {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </div>
              <div className="text-blue-700">
                <strong>Address:</strong> {isLoadingAddress ? "Loading address..." : address}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              📍 <strong>How to use:</strong> Click anywhere on the map above to select your delivery location. 
              The pin will move to show your selected spot, and we'll automatically get the address for you.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-map"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 configurable-primary hover:configurable-primary-hover text-white"
              disabled={isLoadingAddress}
              data-testid="button-confirm-location"
            >
              {isLoadingAddress ? "Loading..." : "Confirm Location"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}