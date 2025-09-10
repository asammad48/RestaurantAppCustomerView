// Branch search types
export interface BranchSearchRequest {
  latitude: number;
  longitude: number;
  address: string;
  branchName: string;
  maxDistance: number;
}

export interface Branch {
  branchName: string;
  rating: number;
  branchPicture: string;
  branchAddress: string;
  branchId: number;
  branchOpenTime: string;
  branchCloseTime: string;
  isBranchClosed: boolean;
  primaryColor: string;
  branchCurrency: string;
  branchLogo: string;
  banner: string;
  distanceFromMyLocation: number;
  // Pricing and charges (formatted to 2 decimal places)
  deliveryCharges: number;
  minDeliveryAmount: number;
  serviceCharges: number;
  taxPercentage: number;
  maxDiscountAmount: number;
  taxAppliedType: string;
  // Reservation-specific fields (optional)
  minNoticeMinute?: number;
  maxGuestsPerReservation?: number;
  holdTimeMinutes?: number;
}

export type BranchSearchResponse = Branch[];