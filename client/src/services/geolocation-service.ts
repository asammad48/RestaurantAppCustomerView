/**
 * Geolocation Service
 * Provides reliable location fetching using browser Geolocation API + Nominatim reverse geocoding
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  country?: string;
}

export interface NominatimResponse {
  address: {
    road?: string;
    village?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  display_name: string;
}

class GeolocationService {
  /**
   * Get user's current location using browser Geolocation API
   * Attempts to get address, but gracefully falls back to coordinates
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          console.log('📍 Got coordinates:', latitude, longitude);
          
          let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          // Try to get a proper address in the background, but don't wait for it
          // This ensures coordinates are returned immediately
          this.getReverseGeocodeAddress(latitude, longitude)
            .then((geocodedAddress) => {
              console.log('✅ Got address from geocoding:', geocodedAddress);
            })
            .catch((error: any) => {
              console.log('⚠️ Geocoding unavailable (non-blocking):', error.message);
            });
          
          // Return immediately with coordinates, don't wait for address lookup
          resolve({
            latitude,
            longitude,
            address,
          });
        },
        (error) => {
          console.error('❌ Geolocation error:', error?.code, error?.message);
          reject(new Error(this.getGeolocationErrorMessage(error?.code)));
        },
        {
          enableHighAccuracy: false, // Set to false for faster results
          timeout: 20000, // Increased to 20 seconds
          maximumAge: 30000, // Allow 30 second old cached position
        }
      );
    });
  }

  /**
   * Get address from coordinates using Nominatim (OpenStreetMap)
   * Free service, no API key required
   * Falls back gracefully if CORS or network errors occur
   * Non-blocking - doesn't hold up location retrieval
   */
  private async getReverseGeocodeAddress(latitude: number, longitude: number): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RestaurantOrderingApp/1.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data: NominatimResponse = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      
      throw new Error('No address found in response');
    } catch (error: any) {
      console.warn('Reverse geocoding failed:', error.message);
      throw new Error('Reverse geocoding unavailable');
    }
  }

  /**
   * Get address from coordinates using multiple fallback methods
   * Tries Nominatim first, then returns formatted coordinates
   */
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    try {
      return await this.getReverseGeocodeAddress(latitude, longitude);
    } catch (error) {
      console.warn('Could not get address, returning coordinates:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  /**
   * Get human-readable error message for geolocation errors
   */
  private getGeolocationErrorMessage(errorCode: number | undefined): string {
    switch (errorCode) {
      case 1:
        return 'Location permission denied. In browser preview, try the map picker instead.';
      case 2:
        return 'Location service is unavailable. Please check your connection or use map picker.';
      case 3:
        return 'Location request timed out. Please try again or use map picker.';
      default:
        return 'Unable to get your location. Please use the map picker or enter address manually.';
    }
  }

  /**
   * Check if geolocation is available and permitted
   */
  isGeolocationAvailable(): boolean {
    return !!navigator.geolocation;
  }
}

export const geolocationService = new GeolocationService();
