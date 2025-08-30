import { User } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  password: string;
  mobileNumber: string;
  roleName: string;
}

export interface LoginResponse {
  userId: number;
  token: string;
  email: string;
  mobileNumber?: string | null;
  fullName: string;
  profilePicture?: string | null;
  roles: Array<{
    roleId: number;
    roleName: string;
  }>;
}

export interface SignupResponse {
  id: number;
  email: string;
  name: string;
  mobileNumber?: string | null;
  profilePicture?: string | null;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/User/login', credentials);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Login error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during login');
    }
  }

  async signup(userData: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await apiClient.post<SignupResponse>('/api/User/customer', userData);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Signup error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during signup');
    }
  }

  // Helper method to convert LoginResponse to User
  static loginResponseToUser(response: LoginResponse): User {
    return {
      id: response.userId,
      email: response.email,
      name: response.fullName,
      fullName: response.fullName,
      mobileNumber: response.mobileNumber,
      profilePicture: response.profilePicture,
      roles: response.roles,
    };
  }

  // Helper method to get auth headers with token
  static getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}

export const authService = new AuthService();
export { AuthService };