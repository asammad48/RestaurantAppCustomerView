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
  branchLogo: string;
  banner: string;
  distanceFromMyLocation: number;
  // Reservation-specific fields (optional)
  minNoticeMinute?: number;
  maxGuestsPerReservation?: number;
  holdTimeMinutes?: number;
}

export type BranchSearchResponse = Branch[];