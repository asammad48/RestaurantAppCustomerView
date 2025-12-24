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
   * Falls back to IP-based location if needed
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
          
          try {
            const address = await this.getReverseGeocodeAddress(latitude, longitude);
            resolve({
              latitude,
              longitude,
              address,
            });
          } catch (error) {
            // If reverse geocoding fails, still return coordinates
            console.warn('Reverse geocoding failed, using coordinates:', error);
            resolve({
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
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
   */
  private async getReverseGeocodeAddress(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data: NominatimResponse = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
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
