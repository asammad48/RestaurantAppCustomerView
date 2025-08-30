import { apiClient, ApiResponse } from '@/lib/api-client';
import { BranchSearchRequest, BranchSearchResponse } from '@/types/branch';

export class BranchService {
  // Search takeaway branches based on location
  static async searchTakeawayBranches(params: BranchSearchRequest): Promise<ApiResponse<BranchSearchResponse>> {
    return apiClient.post<BranchSearchResponse>('/api/customer-search/search-takeaway-branches', params);
  }

  // Search branches based on location (general search)
  static async searchBranches(params: BranchSearchRequest): Promise<ApiResponse<BranchSearchResponse>> {
    return apiClient.post<BranchSearchResponse>('/api/customer-search/search-branches', params);
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
}