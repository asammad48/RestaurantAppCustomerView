// Generic API client with status code handling
const BASE_URL = 'https://5dtrtpzg-7261.inc1.devtunnels.ms';

// Order API Types
export interface OrderModifier {
  modifierId: number;
}

export interface OrderCustomization {
  customizationId: number;
  optionId: number;
}

export interface OrderItem {
  menuItemId: number;
  variantId?: number;
  quantity: number;
  modifiers?: OrderModifier[];
  customizations?: OrderCustomization[];
}

export interface OrderPackage {
  menuPackageId: number;
  quantity: number;
}

export interface DeliveryDetails {
  fullName: string;
  email: string;
  phoneNumber: string;
  deliveryAddress: string;
  streetAddress: string;
  apartment: string;
  deliveryInstruction: string;
  prefferedDeliveryTime: string; // ISO date string
  longitude: number;
  latitude: number;
}

export interface SplitBill {
  splitType: number; // 1=Equality, 2=ByItem
  price: number;
  mobileNumber: string;
  itemName: string;
}

export interface OrderRequest {
  branchId: number;
  locationId?: number;
  deviceInfo: string;
  tipAmount: number;
  username: string;
  orderType: number; // 1=Delivery, 2=Takeaway, 3=DineIn
  orderItems: OrderItem[];
  orderPackages?: OrderPackage[];
  deliveryDetails?: DeliveryDetails | null;
  pickupDetails?: any | null;
  splitBills?: SplitBill[] | null;
  specialInstruction?: string;
  allergens?: number[]; // Array of allergen IDs
}

export interface OrderResponse {
  id: number;
  orderId: number;
  orderNumber: string;
  branchId: number;
  locationId?: number;
  userId?: number;
  username: string;
  deviceInfo: string;
  subTotal: number;
  discountAmount: number;
  serviceCharges: number;
  deliveryCharges: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  orderStatus: number;
  orderType: number;
  createdAt: string;
  estimatedPreparationTimeMinutes?: number;
  estimatedDeliveryTimeMinutes?: number;
  completionTimeMinutes?: number;
}

// AI Budget Estimator Types
export interface BudgetEstimateRequest {
  branchId: number;
  groupSize: number;
  maxPrice: number;
  categories: string[];
}

export interface BudgetMenuItem {
  menuItemId: number;
  name: string;
  description: string;
  categoryName: string;
  picture: string;
  variations: {
    id: number;
    name: string;
    price: number;
    discountedPrice?: number;
    quantity: number;
  }[];
}

export interface BudgetMenuPackage {
  dealId: number;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  picture: string;
  dealEndDate: string;
  menuItems: {
    menuItemId: number;
    name: string;
    variantsDetails: {
      menuItemVariantId: number;
      name: string;
      quantity: number;
    }[];
  }[];
  subMenuItems: {
    subMenuItemId: number;
    name: string;
    quantity: number;
  }[];
}

export interface BudgetOption {
  totalCost: number;
  totalPeopleServed: number;
  isWithinBudget: boolean;
  menuPackages: BudgetMenuPackage[];
  menuItems: BudgetMenuItem[];
}

export interface BudgetEstimateResponse {
  budgetOptions: BudgetOption[];
  maxAllowedDiscount: number;
}

// Allergens Types
export interface Allergen {
  id: number;
  name: string;
}

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

      // Handle different types of network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiError({
          status: 0,
          message: 'Unable to connect to server. Please check your internet connection and try again.',
          details: { type: 'network_error', originalError: error },
        });
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({
          status: 0,
          message: 'Request timed out. Please try again.',
          details: { type: 'timeout_error', originalError: error },
        });
      }

      // Generic network or other errors
      throw new ApiError({
        status: 0,
        message: 'Something went wrong. Please try again later.',
        details: { type: 'unknown_error', originalError: error },
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

  // Order API methods
  async createOrder(orderData: OrderRequest): Promise<ApiResponse<OrderResponse>> {
    return this.post<OrderResponse>('/api/Order', orderData);
  }

  // AI Budget Estimator API method
  async getBudgetEstimate(estimateData: BudgetEstimateRequest): Promise<ApiResponse<BudgetEstimateResponse>> {
    return this.post<BudgetEstimateResponse>('/api/customer-search/estimate', estimateData);
  }

  // Allergens API method
  async getAllergens(): Promise<ApiResponse<Allergen[]>> {
    return this.get<Allergen[]>('/api/Generic/allergens');
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