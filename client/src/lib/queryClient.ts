import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mockStorage } from "./mock-data";

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
      const res = await apiRequest('GET', url);
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
