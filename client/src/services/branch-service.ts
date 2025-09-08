import { apiClient, ApiResponse } from '@/lib/api-client';
import { BranchSearchRequest, BranchSearchResponse, Branch } from '@/types/branch';
import { formatBranchDecimals } from '@/lib/utils';

export class BranchService {
  // Search takeaway branches based on location
  static async searchTakeawayBranches(params: BranchSearchRequest): Promise<ApiResponse<BranchSearchResponse>> {
    const response = await apiClient.post<BranchSearchResponse>('/api/customer-search/search-takeaway-branches', params);
    
    // Format decimal values to 2 decimal places
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(branch => formatBranchDecimals(branch));
    }
    
    return response;
  }

  // Search reservation branches based on location
  static async searchReservationBranches(params: BranchSearchRequest): Promise<ApiResponse<BranchSearchResponse>> {
    const response = await apiClient.post<BranchSearchResponse>('/api/customer-search/search-reservation-branches', params);
    
    // Format decimal values to 2 decimal places
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(branch => formatBranchDecimals(branch));
    }
    
    return response;
  }

  // Search branches based on location (general search)
  static async searchBranches(params: BranchSearchRequest): Promise<ApiResponse<BranchSearchResponse>> {
    const response = await apiClient.post<BranchSearchResponse>('/api/customer-search/search-branches', params);
    
    // Format decimal values to 2 decimal places
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(branch => formatBranchDecimals(branch));
    }
    
    return response;
  }

  // Get branch image URL
  static getBranchImageUrl(imagePath: string): string {
    return apiClient.getAssetUrl(imagePath);
  }

  // Get branch logo URL
  static getBranchLogoUrl(logoPath: string): string {
    return apiClient.getAssetUrl(logoPath);
  }

  // Get banner URL
  static getBannerUrl(bannerPath: string): string {
    return apiClient.getAssetUrl(bannerPath);
  }

  // Get branch details by ID
  static async getBranchDetails(branchId: number): Promise<ApiResponse<any>> {
    const response = await apiClient.get<any>(`/api/customer-search/branch/${branchId}`);
    
    // Format decimal values to 2 decimal places if the response contains branch data
    if (response.data && typeof response.data === 'object') {
      response.data = formatBranchDecimals(response.data);
    }
    
    return response;
  }
}