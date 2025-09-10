import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoords = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
    setIsLoadingAddress(false);
  };

  // Initialize map when modal opens
  useEffect(() => {
    if (isOpen && mapRef.current && !mapInstanceRef.current) {
      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([selectedLat, selectedLng], 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add marker
      markerRef.current = L.marker([selectedLat, selectedLng], {
        draggable: true
      }).addTo(mapInstanceRef.current);

      // Handle map click
      mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setSelectedLat(lat);
        setSelectedLng(lng);
        
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      });

      // Handle marker drag
      markerRef.current.on('dragend', (e: L.DragEndEvent) => {
        const { lat, lng } = e.target.getLatLng();
        setSelectedLat(lat);
        setSelectedLng(lng);
      });

      // Get initial address
      getAddressFromCoords(selectedLat, selectedLng);
    }
  }, [isOpen, selectedLat, selectedLng]);

  // Update address when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current) {
      getAddressFromCoords(selectedLat, selectedLng);
    }
  }, [selectedLat, selectedLng]);

  // Cleanup map when modal closes
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

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
              ref={mapRef}
              className="w-full h-96 rounded-lg border border-gray-300 overflow-hidden"
              data-testid="map-container"
              style={{ zIndex: 1 }}
            />
          </div>

          {/* Selected Location Info */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--configurable-primary-alpha-10)', borderColor: 'var(--configurable-primary-alpha-20)', borderWidth: '1px' }}>
            <h4 className="font-medium mb-2" style={{ color: 'var(--color-primary)' }}>Selected Location:</h4>
            <div className="space-y-1 text-sm">
              <div style={{ color: 'var(--color-primary)' }}>
                <strong>Coordinates:</strong> {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </div>
              <div style={{ color: 'var(--color-primary)' }}>
                <strong>Address:</strong> {isLoadingAddress ? "Loading address..." : address}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              📍 <strong>How to use:</strong> Click anywhere on the map above to select your location, or drag the red marker to adjust the position. 
              We'll automatically get the address for you.
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