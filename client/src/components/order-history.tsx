import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Package, Clock, MapPin, Users } from 'lucide-react';
import { fetchOrderHistory, getOrderStatusText, getOrderTypeText, formatCurrency } from '@/services/order-history-service';
import { useAuthStore } from '@/lib/auth-store';
import { Order } from '@/types/order-history';
import { format } from 'date-fns';

export default function OrderHistory() {
  const { user } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['order-history', user?.id, currentPage],
    queryFn: () => fetchOrderHistory({
      userId: user?.id,
      pageNumber: currentPage,
      pageSize: pageSize
    }),
    staleTime: 30000, // 30 seconds
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="order-history-loading">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Order History</h2>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" data-testid="order-history-error">
        <h2 className="text-2xl font-bold">Order History</h2>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load order history. Please try again.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="ml-2"
              data-testid="button-retry"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-4" data-testid="order-history-empty">
        <h2 className="text-2xl font-bold">Order History</h2>
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-gray-600">
              Your order history will appear here once you place your first order.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="order-history">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order History</h2>
        <p className="text-sm text-gray-600">
          {data.totalCount} total orders
        </p>
      </div>

      <div className="space-y-4">
        {data.items.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="pagination">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!data.hasPrevious}
            data-testid="button-previous-page"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600" data-testid="text-page-info">
            Page {data.pageNumber} of {data.totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!data.hasNext}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 4: return 'bg-purple-100 text-purple-800 border-purple-200';
      case 5: return 'bg-green-100 text-green-800 border-green-200';
      case 6: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md" data-testid={`card-order-${order.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold" data-testid={`text-order-number-${order.id}`}>
              Order #{order.orderNumber.slice(-8)}
            </CardTitle>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1" />
              {format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}
            </p>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(order.orderStatus)} data-testid={`status-${order.id}`}>
              {getOrderStatusText(order.orderStatus)}
            </Badge>
            <p className="text-lg font-bold mt-1" data-testid={`text-total-${order.id}`}>
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center text-sm">
            <Package className="h-4 w-4 mr-2 text-gray-400" />
            <span>{getOrderTypeText(order.orderType)}</span>
          </div>
          
          {order.orderDeliveryDetails && (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span className="truncate">{order.orderDeliveryDetails.deliveryAddress}</span>
            </div>
          )}
          
          {order.splitBills.length > 0 && (
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span>Split with {order.splitBills.length} people</span>
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Items ({order.orderItems.length})</h4>
          <div className="space-y-1">
            {order.orderItems.slice(0, showDetails ? undefined : 3).map((item, index) => (
              <div key={item.id} className="flex justify-between text-sm" data-testid={`item-${order.id}-${index}`}>
                <span>
                  {item.quantity}x {item.itemName}
                  {item.variantName && <span className="text-gray-500"> ({item.variantName})</span>}
                </span>
                <span data-testid={`item-price-${order.id}-${index}`}>
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
            
            {!showDetails && order.orderItems.length > 3 && (
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
                data-testid={`button-show-more-${order.id}`}
              >
                +{order.orderItems.length - 3} more items
              </button>
            )}
          </div>
        </div>

        {/* Split Bills */}
        {showDetails && order.splitBills.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-sm mb-2">Split Bill Details</h4>
            <div className="space-y-1">
              {order.splitBills.map((split, index) => (
                <div key={split.id} className="flex justify-between text-sm" data-testid={`split-${order.id}-${index}`}>
                  <span>{split.mobileNumber} - {split.itemName}</span>
                  <span>{formatCurrency(split.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Details */}
        {showDetails && order.orderDeliveryDetails && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-sm mb-2">Delivery Details</h4>
            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {order.orderDeliveryDetails.fullName}</p>
              <p><strong>Phone:</strong> {order.orderDeliveryDetails.phoneNumber}</p>
              <p><strong>Address:</strong> {order.orderDeliveryDetails.deliveryAddress}</p>
              {order.orderDeliveryDetails.deliveryInstruction && (
                <p><strong>Instructions:</strong> {order.orderDeliveryDetails.deliveryInstruction}</p>
              )}
            </div>
          </div>
        )}

        {showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(false)}
            className="mt-2"
            data-testid={`button-show-less-${order.id}`}
          >
            Show Less
          </Button>
        )}

        {!showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(true)}
            className="mt-2"
            data-testid={`button-view-details-${order.id}`}
          >
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}