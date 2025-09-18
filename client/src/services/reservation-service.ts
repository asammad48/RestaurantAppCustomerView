import { apiClient } from '@/lib/api-client';
import { ReservationListResponse, ReservationParams } from '@/types/reservation';

class ReservationService {
  async getUserReservations(
    token: string, 
    params: ReservationParams = { pageNumber: 1, pageSize: 10 }
  ): Promise<ReservationListResponse> {
    try {
      const queryParams: Record<string, string> = {
        PageNumber: params.pageNumber?.toString() || '1',
        PageSize: params.pageSize?.toString() || '10'
      };
      
      const response = await apiClient.getWithAuth<ReservationListResponse>(
        '/api/Reservations/me', 
        token, 
        queryParams
      );
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error fetching reservations: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while fetching reservations');
    }
  }
}

export const reservationService = new ReservationService();
export { ReservationService };