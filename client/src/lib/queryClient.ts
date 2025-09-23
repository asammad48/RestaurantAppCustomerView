import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mockStorage } from "./mock-data";
import { API_CONFIG } from "./config";

// Mock API simulation for frontend-only operation
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    let result: any;
    
    if (url.includes('/menu-items') && method === 'GET') {
      if (url.includes('/menu-items/')) {
        const id = url.split('/').pop();
        result = await mockStorage.getMenuItem(id!);
      } else {
        result = await mockStorage.getMenuItems();
      }
    } else if (url.includes('/menu-data') && method === 'GET') {
      result = await mockStorage.getMenuData();
    } else if (url.includes('/deals') && method === 'GET') {
      result = await mockStorage.getDeals();
    } else if (url.includes('/orders') && method === 'GET') {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const tableNumber = urlParams.get('tableNumber');
      result = await mockStorage.getOrders(tableNumber ? parseInt(tableNumber) : undefined);
    } else if (url.includes('/orders') && method === 'POST') {
      result = await mockStorage.createOrder(data as any);
    } else if (url.includes('/orders/') && url.includes('/status') && method === 'PATCH') {
      const id = url.split('/')[2];
      const { status } = data as any;
      result = await mockStorage.updateOrderStatus(id, status);
    } else if (url.includes('/service-requests') && method === 'GET') {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const tableNumber = urlParams.get('tableNumber');
      result = await mockStorage.getServiceRequests(tableNumber ? parseInt(tableNumber) : undefined);
    } else if (url.includes('/service-requests') && method === 'POST') {
      result = await mockStorage.createServiceRequest(data as any);
    } else if (url.includes('/reviews') && method === 'GET') {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const orderId = urlParams.get('orderId');
      result = await mockStorage.getReviews(orderId || undefined);
    } else if (url.includes('/reviews') && method === 'POST') {
      result = await mockStorage.createReview(data as any);
    } else if (url.includes('/colors')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const theme = urlParams.get('theme') || 'default';
      result = await mockStorage.getColors(theme);
    } else if (url.includes('/themes')) {
      result = await mockStorage.getThemes();
    } else if (url.includes('/restaurants') && method === 'GET') {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const location = urlParams.get('location');
      result = await mockStorage.getRestaurants(location || undefined);
    } else if (url.includes('/tables') && method === 'GET') {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const guests = urlParams.get('guests');
      result = await mockStorage.getTables(guests ? parseInt(guests) : undefined);
    } else if (url.includes('/reservations') && method === 'GET') {
      result = await mockStorage.getReservations();
    } else if (url.includes('/reservations') && method === 'POST') {
      result = await mockStorage.createReservation(data as any);
    } else if (url.includes('/api/customer-search/estimate') && method === 'POST') {
      result = await mockStorage.getBudgetEstimate(data as any);
    } else if (url.includes('/api/Generic/allergens') && method === 'GET') {
      // Mock allergens data
      result = [
        { id: 1, name: "Wheat" },
        { id: 2, name: "Dairy" },
        { id: 3, name: "Nuts" },
        { id: 4, name: "Soy" },
        { id: 5, name: "Eggs" },
        { id: 6, name: "Fish" },
        { id: 7, name: "Shellfish" },
        { id: 8, name: "Sesame" }
      ];
    } else if (url.includes('/api/customer-search/get-branch-by-id') && method === 'POST') {
      // Mock branch data
      const branchData = data as any;
      result = {
        branchName: "Restaurant Demo Branch",
        rating: 4.8,
        deliveryTime: 30,
        deliveryFee: 50,
        maxDistanceForDelivery: 10,
        branchPicture: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        branchAddress: "123 Main Street, City Center",
        branchId: branchData?.branchId || 1,
        branchOpenTime: "09:00",
        branchCloseTime: "23:00",
        isBranchClosed: false,
        primaryColor: "#16a34a",
        branchLogo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        banner: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
        deliveryCharges: 50,
        minDeliveryAmount: 200,
        serviceCharges: 25,
        taxAppliedType: "percentage",
        taxPercentage: 8.5,
        maxDiscountAmount: 500,
        currency: "PKR",
        locationName: branchData?.locationId ? `Location ${branchData.locationId}` : undefined,
        locationId: branchData?.locationId
      };
    } else if (url.includes('/api/Order') && method === 'POST') {
      // Mock order creation
      result = {
        id: Math.floor(Math.random() * 10000),
        orderId: Math.floor(Math.random() * 10000),
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        branchId: (data as any)?.branchId || 1,
        locationId: (data as any)?.locationId,
        username: (data as any)?.username || "Guest User",
        deviceInfo: (data as any)?.deviceInfo || "mock-device",
        subTotal: 500,
        discountAmount: 0,
        serviceCharges: 25,
        deliveryCharges: (data as any)?.orderType === 1 ? 50 : 0,
        taxAmount: 42.5,
        tipAmount: (data as any)?.tipAmount || 0,
        totalAmount: 617.5,
        orderStatus: 1,
        orderType: (data as any)?.orderType || 3,
        createdAt: new Date().toISOString(),
        estimatedPreparationTimeMinutes: 25,
        estimatedDeliveryTimeMinutes: (data as any)?.orderType === 1 ? 35 : undefined,
        completionTimeMinutes: undefined
      };
    } else {
      throw new Error(`Mock API endpoint not found: ${method} ${url}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    
    try {
      let res: Response;
      
      // Handle all API calls with mock data for Replit environment
      res = await apiRequest('GET', url);
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
