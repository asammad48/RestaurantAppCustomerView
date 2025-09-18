// Reservation API Types based on the provided API response

export interface Reservation {
  id: number;
  branchId: number;
  branchName: string;
  locationId: number;
  locationName: string;
  reservationName: string;
  reservationDate: string; // ISO date string
  reservationTime: string; // Time string in format "HH:mm:ss"
  actionTaken: string; // e.g., "Rejected", "Approved", "Pending"
  numberOfGuests: number;
}

export interface ReservationListResponse {
  items: Reservation[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ReservationParams {
  pageNumber?: number;
  pageSize?: number;
}