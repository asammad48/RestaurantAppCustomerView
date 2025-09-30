import { User } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { config } from '@/lib/config';

export interface UpdateProfileRequest {
  token: string;
  formData: FormData;
  selectedAvatar?: string;
}

export interface UpdateProfileResponse {
  id: number;
  email: string;
  name: string;
  mobileNumber: string;
  profilePicture: string;
}

class UserService {
  async updateProfile(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    try {
      // If avatar is selected, include it as a text file in the form data
      if (request.selectedAvatar) {
        const blob = new Blob([request.selectedAvatar], { type: 'text/plain' });
        request.formData.append('SelectedAvatar', blob, 'avatar.txt');
      }

      // Use fetch directly for multipart/form-data as apiClient doesn't support it properly
      const response = await fetch(`${config.apiBaseUrl}/api/User/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${request.token}`,
          'Accept': '*/*'
        },
        body: request.formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as UpdateProfileResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Profile update error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during profile update');
    }
  }

  // Helper method to get auth headers with token
  static getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}

export const userService = new UserService();

// Export the function for the mutation
export const updateUserProfile = (request: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
  return userService.updateProfile(request);
};

export { UserService };