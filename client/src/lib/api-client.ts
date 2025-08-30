// Generic API client with status code handling
// Using relative URLs for Replit compatibility - enables proper client/server separation
const BASE_URL = '';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  success: boolean;
  message?: string;
}


class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Generic API call method with comprehensive error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        // Handle non-JSON responses
        data = null;
      }

      // Handle different status codes
      switch (response.status) {
        case 200:
        case 201:
          return {
            data,
            status: response.status,
            success: true,
          };

        case 400:
          throw new ApiError({
            status: 400,
            message: 'Bad Request - Invalid input data',
            details: data,
          });

        case 401:
          throw new ApiError({
            status: 401,
            message: 'Unauthorized - Authentication required',
            details: data,
          });

        case 422:
          throw new ApiError({
            status: 422,
            message: 'Validation Error - Please check your input',
            details: data,
          });

        case 500:
          throw new ApiError({
            status: 500,
            message: 'Server Error - Please try again later',
            details: data,
          });

        default:
          throw new ApiError({
            status: response.status,
            message: `Request failed with status ${response.status}`,
            details: data,
          });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError({
        status: 0,
        message: 'Network error - Please check your connection',
        details: error,
      });
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Get full URL for images and assets
  getAssetUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.baseURL}/${path}`;
  }
}

// Custom error class for API errors
class ApiError extends Error {
  status: number;
  details?: any;

  constructor({ status, message, details }: { status: number; message: string; details?: any }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Export singleton instance
export const apiClient = new ApiClient(BASE_URL);
export { ApiError };