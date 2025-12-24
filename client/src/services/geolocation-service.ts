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
          
          // Try to get a proper address, but don't fail if it doesn't work
          try {
            address = await this.getReverseGeocodeAddress(latitude, longitude);
            console.log('✅ Got address from geocoding:', address);
          } catch (error: any) {
            console.log('⚠️ Geocoding unavailable, using coordinates instead:', address);
            // Continue with coordinate-based address
          }
          
          resolve({
            latitude,
            longitude,
            address,
          });
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          reject(new Error(this.getGeolocationErrorMessage(error.code)));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Don't use cached position
        }
      );
    });
  }

  /**
   * Get address from coordinates using Nominatim (OpenStreetMap)
   * Free service, no API key required
   * Falls back gracefully if CORS or network errors occur
   */
  private async getReverseGeocodeAddress(latitude: number, longitude: number): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
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
      console.warn('Reverse geocoding failed, will use coordinates:', error.message);
      // Don't throw - let the caller handle the fallback
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
  private getGeolocationErrorMessage(errorCode: number): string {
    switch (errorCode) {
      case 1:
        return 'Location permission denied. Please enable location access in browser settings.';
      case 2:
        return 'Unable to retrieve your location. Please check your connection and try again.';
      case 3:
        return 'Location request timed out. Please try again.';
      default:
        return 'An error occurred while fetching your location.';
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
