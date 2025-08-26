import { useState, useRef } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Animation: {
          DROP: any;
          BOUNCE: any;
        };
      };
    };
  }
}

// Replace with your actual Google API key
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE";

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface GoogleGeolocationResponse {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
}

interface GoogleGeocodingResponse {
  results: Array<{
    formatted_address: string;
  }>;
}

export default function LocationPicker() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { toast } = useToast();

  // Load Google Maps script
  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      
      document.head.appendChild(script);
    });
  };

  // Initialize Google Map
  const initializeMap = async (lat: number, lng: number) => {
    try {
      await loadGoogleMapsScript();
      
      if (!mapRef.current || !window.google) return;

      const mapOptions = {
        center: { lat, lng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Add marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: "Your Location",
        animation: window.google.maps.Animation.DROP,
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast({
        variant: "destructive",
        title: "Map Error",
        description: "Failed to load Google Maps. Please check your API key configuration.",
      });
    }
  };

  // Get address from coordinates using Google Geocoding API
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data: GoogleGeocodingResponse = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      
      throw new Error('No address found for these coordinates');
    } catch (error) {
      console.error('Geocoding error:', error);
      return `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Get location using IP-based Google Geolocation API
  const getLocationFromIP = async (): Promise<LocationData> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error(`Geolocation API error: ${response.status}`);
      }

      const data: GoogleGeolocationResponse = await response.json();
      
      const lat = data.location.lat;
      const lng = data.location.lng;
      const address = await getAddressFromCoordinates(lat, lng);
      
      return {
        latitude: lat,
        longitude: lng,
        address,
      };
    } catch (error) {
      console.error('IP geolocation error:', error);
      throw new Error('Failed to get location from IP address');
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      // First try Browser Geolocation API
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const address = await getAddressFromCoordinates(lat, lng);

        const locationData = {
          latitude: lat,
          longitude: lng,
          address,
        };

        setLocation(locationData);
        await initializeMap(lat, lng);

        toast({
          title: "Location Found",
          description: "Successfully retrieved your location using GPS.",
        });

      } else {
        throw new Error('Geolocation not supported');
      }
    } catch (error: any) {
      console.error('GPS location error:', error);
      
      // Check if permission was denied
      if (error.code === 1 || error.message?.includes('denied')) {
        setPermissionDenied(true);
        toast({
          variant: "destructive",
          title: "Location Permission Denied",
          description: "Trying to get your location using IP address instead.",
        });
      }

      try {
        // Fallback to IP-based geolocation
        const ipLocation = await getLocationFromIP();
        setLocation(ipLocation);
        await initializeMap(ipLocation.latitude, ipLocation.longitude);

        toast({
          title: "Location Found (IP-based)",
          description: "Retrieved approximate location using your IP address.",
        });
      } catch (ipError) {
        console.error('IP geolocation failed:', ipError);
        setError('Unable to determine your location. Please check your internet connection and API key configuration.');
        
        toast({
          variant: "destructive",
          title: "Location Error",
          description: "Failed to get your location from both GPS and IP address.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear current location
  const clearLocation = () => {
    setLocation(null);
    setError(null);
    setPermissionDenied(false);
    
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find My Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={getCurrentLocation}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Get My Location
              </>
            )}
          </Button>
          
          {location && (
            <Button
              variant="outline"
              onClick={clearLocation}
              disabled={loading}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Permission Denied Warning */}
        {permissionDenied && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location permission was denied. Enable location access in your browser settings for more accurate results.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Location Information */}
        {location && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-600">Latitude:</label>
                <p className="font-mono bg-gray-50 p-2 rounded border">
                  {location.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <label className="font-medium text-gray-600">Longitude:</label>
                <p className="font-mono bg-gray-50 p-2 rounded border">
                  {location.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            
            {location.address && (
              <div>
                <label className="font-medium text-gray-600">Address:</label>
                <p className="bg-gray-50 p-2 rounded border">
                  {location.address}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Google Map */}
        {location && (
          <div className="w-full">
            <label className="font-medium text-gray-600 block mb-2">Map:</label>
            <div 
              ref={mapRef}
              className="w-full h-64 rounded-lg border border-gray-300"
              style={{ minHeight: '300px' }}
            />
          </div>
        )}

        {/* API Key Warning */}
        {GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Required:</strong> Replace the placeholder API key in the component with your actual Google Maps API key to enable all features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}