import { apiClient, ApiResponse } from '@/lib/api-client';

// Table/Location interface based on the API response
export interface TableLocation {
  id: number;
  branchId: number;
  locationType: number;
  name: string;
  capacity: number;
}

// Request interface for table searches
export interface TableSearchRequest {
  branchId: number;
  date?: string;
  time?: string;
  guests?: number;
}

export class TableService {
  // Get all table locations for a specific branch
  static async getTableLocations(branchId: number): Promise<ApiResponse<TableLocation[]>> {
    return apiClient.get<TableLocation[]>(`/api/customer-search/branch/${branchId}/locations`);
  }

  // Get available tables for reservation (if API exists)
  static async getAvailableTables(params: TableSearchRequest): Promise<ApiResponse<TableLocation[]>> {
    const searchParams = {
      date: params.date || '',
      time: params.time || '',
      guests: params.guests?.toString() || ''
    };
    
    return apiClient.get<TableLocation[]>(
      `/api/customer-search/branch/${params.branchId}/available-tables`, 
      searchParams
    );
  }

  // Reserve a table (if API exists)
  static async reserveTable(reservationData: any): Promise<ApiResponse<any>> {
    return apiClient.post('/api/reservations', reservationData);
  }

  // Get table type display name
  static getTableTypeName(locationType: number): string {
    const typeMap: { [key: number]: string } = {
      1: 'Indoor',
      2: 'Outdoor',
      3: 'Private',
      4: 'Bar',
      5: 'VIP'
    };
    return typeMap[locationType] || 'Standard';
  }

  // Get table capacity range display
  static getCapacityDisplay(capacity: number): string {
    if (capacity <= 2) return 'Intimate (1-2 people)';
    if (capacity <= 4) return 'Small (3-4 people)';
    if (capacity <= 6) return 'Medium (5-6 people)';
    if (capacity <= 8) return 'Large (7-8 people)';
    return `Extra Large (${capacity} people)`;
  }
}