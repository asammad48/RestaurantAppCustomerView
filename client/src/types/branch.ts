// Branch search types
export interface BranchSearchRequest {
  latitude: number;
  longitude: number;
  address: string;
  branchName: string;
}

export interface Branch {
  branchName: string;
  rating: number;
  deliveryTime: number;
  deliveryFee: number;
  maxDistanceForDelivery: number;
  branchPicture: string;
  branchAddress: string;
  branchId: number;
  branchOpenTime: string;
  branchCloseTime: string;
  isBranchClosed: boolean;
  primaryColor: string;
  branchLogo: string;
  banner: string;
}

export type BranchSearchResponse = Branch[];