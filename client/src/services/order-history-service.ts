// Order History API Service
import { OrderHistoryResponse, OrderHistoryParams } from '@/types/order-history';
import { getDeviceId } from '@/lib/device-id';

const ORDER_HISTORY_BASE_URL = 'https://5dtrtpzg-7261.inc1.devtunnels.ms/api/Order';

/**
 * Fetches order history for a user and device with pagination
 */
export async function fetchOrderHistory(params: {
  userId?: number;
  pageNumber?: number;
  pageSize?: number;
}): Promise<OrderHistoryResponse> {
  const deviceId = getDeviceId();
  
  const queryParams = new URLSearchParams({
    DeviceId: deviceId,
    PageNumber: (params.pageNumber || 1).toString(),
    PageSize: (params.pageSize || 10).toString(),
  });

  // Add UserId if provided (when user is logged in)
  if (params.userId) {
    queryParams.append('UserId', params.userId.toString());
  }

  const url = `${ORDER_HISTORY_BASE_URL}/ByUserAndDevice?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order history: ${response.status} ${response.statusText}`);
    }

    const data: OrderHistoryResponse = await response.json();
    
    // Add order status changes, subTotal, and discountAmount to each order using the actual order status
    const enhancedData = {
      ...data,
      items: data.items.map(order => ({
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
    throw error;
  }
}

/**
 * Fetches a specific order by order number
 */
export async function fetchOrderById(orderId: number): Promise<any> {
  try {
    const response = await fetch(`${ORDER_HISTORY_BASE_URL}/${orderId}`, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    throw error;
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