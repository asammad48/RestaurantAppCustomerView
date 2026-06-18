import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiClient, ApiError } from "./api-client";

// Real API integration for production use
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    let result: any;
    
    // Route API calls to the appropriate apiClient methods
    if (url.includes('/api/Generic/allergens') && method === 'GET') {
      const response = await apiClient.getAllergens();
      result = response.data;
    } else if (url.includes('/api/customer-search/branch/') && method === 'GET') {
      // Extract branch ID from URL like '/api/customer-search/branch/1'
      const branchId = parseInt(url.split('/').pop() || '1');
      const response = await apiClient.get(`/api/customer-search/branch/${branchId}`);
      result = response.data;
    } else if (url.includes('/api/customer-search/get-branch-by-id') && method === 'POST') {
      const response = await apiClient.getBranchById(data as any);
      result = response.data;
    } else if (url.includes('/api/customer-search/estimate') && method === 'POST') {
      const response = await apiClient.getBudgetEstimate(data as any);
      result = response.data;
    } else if (url.includes('/api/Order') && method === 'POST') {
      const response = await apiClient.createOrder(data as any);
      result = response.data;
    } else {
      // For other endpoints, make a direct API call
      let response: any;
      
      switch (method) {
        case 'GET':
          response = await apiClient.get(url);
          break;
        case 'POST':
          response = await apiClient.post(url, data);
          break;
        case 'PUT':
          response = await apiClient.put(url, data);
          break;
        case 'DELETE':
          response = await apiClient.delete(url);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      result = response.data;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`API Request failed: ${method} ${url}`, error);
    
    if (error instanceof ApiError) {
      return new Response(JSON.stringify({ error: error.message, details: error.details }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
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
