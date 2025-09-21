// Order History API Service
import { OrderHistoryResponse, OrderHistoryParams } from '@/types/order-history';
import { getDeviceId } from '@/lib/device-id';
import { apiClient, ApiError } from '@/lib/api-client';

/**
 * Fetches order history for a user and device with pagination
 */
export async function fetchOrderHistory(params: {
  userId?: number;
  pageNumber?: number;
  pageSize?: number;
}): Promise<OrderHistoryResponse> {
  const deviceId = getDeviceId();
  
  const queryParams: Record<string, string> = {
    DeviceId: deviceId,
    PageNumber: (params.pageNumber || 1).toString(),
    PageSize: (params.pageSize || 10).toString(),
  };

  // Add UserId if provided (when user is logged in)
  if (params.userId) {
    queryParams.UserId = params.userId.toString();
  }

  try {
    const response = await apiClient.get<OrderHistoryResponse>(
      '/api/Order/ByUserAndDevice',
      queryParams
    );
    
    // Add order status changes, subTotal, and discountAmount to each order using the actual order status
    const enhancedData = {
      ...response.data,
      items: response.data.items.map(order => ({
        ...order,
        // Temporarily use totalAmount as subTotal to test display
        subTotal: order.totalAmount,
        // Set a test discount amount to see if it displays
        discountAmount: 50,
        orderStatusChanges: [
          {
            orderStatus: getOrderStatusText(order.orderStatus),
            statusChangesDate: order.createdAt,
            statusComment: `Order ${getOrderStatusText(order.orderStatus).toLowerCase()}`
          }
        ]
      }))
    };
    
    return enhancedData;
  } catch (error) {
    console.error('Error fetching order history:', error);
    
    // If it's an ApiError, throw it as-is to preserve the structured error information
    if (error instanceof ApiError) {
      throw error;
    }
    
    // For any other errors, wrap them in a generic error
    throw new Error('Failed to fetch order history. Please try again.');
  }
}

/**
 * Fetches a specific order by order number
 */
export async function fetchOrderById(orderId: number): Promise<any> {
  try {
    const response = await apiClient.get<any>(`/api/Order/${orderId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    
    // If it's an ApiError, throw it as-is to preserve the structured error information
    if (error instanceof ApiError) {
      throw error;
    }
    
    // For any other errors, wrap them in a generic error
    throw new Error('Failed to fetch order details. Please try again.');
  }
}

/**
 * Helper function to get order status text
 */
export function getOrderStatusText(status: string | number): string {
  if (typeof status === 'string') {
    return status;
  }
  // Fallback for numeric statuses
  switch (status) {
    case 1: return 'Pending';
    case 2: return 'Confirmed';
    case 3: return 'Preparing';
    case 4: return 'Ready';
    case 5: return 'Delivered';
    case 6: return 'Cancelled';
    default: return 'Unknown';
  }
}

/**
 * Helper function to get order type text
 */
export function getOrderTypeText(type: string | number): string {
  if (typeof type === 'string') {
    return type;
  }
  // Fallback for numeric types
  switch (type) {
    case 1: return 'Dine In';
    case 2: return 'Takeaway';
    case 3: return 'Delivery';
    default: return 'Unknown';
  }
}

/**
 * Helper function to format currency
 */
export function formatCurrency(amount: number | undefined | null, currency: string = 'PKR'): string {
  // Handle undefined, null, or invalid amounts
  if (amount == null || isNaN(amount)) {
    return `${currency} 0`;
  }
  
  // Format the actual amount without dividing by 100
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${currency} ${formattedAmount}`;
}