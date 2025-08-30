// API Configuration - All APIs now use the generic API client
export const API_CONFIG = {
  BASE_URL: 'https://5dtrtpzg-7261.inc1.devtunnels.ms',
  ENDPOINTS: {
    CUSTOMER_SEARCH: '/api/customer-search/branch',
  }
} as const;

// Helper function to build full image URLs
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    // Return a default fallback image
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200';
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Append base URL to relative paths
  return `${API_CONFIG.BASE_URL}/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}