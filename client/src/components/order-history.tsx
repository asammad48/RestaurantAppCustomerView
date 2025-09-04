import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Package, Clock, MapPin, Users, Eye, Building2 } from 'lucide-react';
import { fetchOrderHistory, getOrderStatusText, getOrderTypeText, formatCurrency } from '@/services/order-history-service';
import { useAuthStore } from '@/lib/auth-store';
import { Order } from '@/types/order-history';
import { format } from 'date-fns';
import OrderDetailModal from './modals/order-detail-modal';

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const getStatusColor = (status: string | number) => {
    return 'bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/20';
  };

  return (
    <>
    <Card className="transition-all duration-200 hover:shadow-md w-full max-w-md" data-testid={`card-order-${order.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate" data-testid={`text-order-number-${order.id}`}>
              #{order.orderNumber.slice(-6)}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(order.createdAt), 'MMM dd • hh:mm a')}
            </p>
          </div>
          <div className="text-right ml-2">
            <Badge className={`${getStatusColor(order.orderStatus)} text-xs px-1.5 py-0.5`} data-testid={`status-${order.id}`}>
              {getOrderStatusText(order.orderStatus)}
            </Badge>
            <p className="text-sm font-bold mt-1" data-testid={`text-total-${order.id}`}>
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="space-y-1 mb-3">
          <div className="flex items-center text-xs text-gray-600">
            <Package className="h-3 w-3 mr-1.5" />
            <span>{getOrderTypeText(order.orderType)}</span>
            <span className="mx-2">•</span>
            <Building2 className="h-3 w-3 mr-1" />
            <span className="truncate">{order.branchName}</span>
          </div>
          
          {order.locationName && (
            <div className="flex items-center text-xs text-gray-500">
              <MapPin className="h-3 w-3 mr-1.5" />
              <span className="truncate">{order.locationName}</span>
            </div>
          )}
          
          {order.orderDeliveryDetails && (
            <div className="flex items-center text-xs text-gray-500">
              <MapPin className="h-3 w-3 mr-1.5" />
              <span className="truncate">{order.orderDeliveryDetails.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">
              {order.orderItems.length + (order.orderPackages?.length || 0)} items
            </span>
            <Button 
              onClick={() => setShowDetailModal(true)}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-[#15803d] hover:text-[#15803d] hover:bg-[#15803d]/10"
              data-testid={`button-view-details-${order.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
          <div className="text-xs text-gray-600">
            {order.orderItems.slice(0, 1).map((item, index) => (
              <span key={item.id}>
                {item.quantity}× {item.itemName.length > 20 ? item.itemName.substring(0, 20) + '...' : item.itemName}
              </span>
            ))}
            {order.orderItems.length > 1 && (
              <span className="text-gray-400"> +{order.orderItems.length - 1} more</span>
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
    
    <OrderDetailModal 
      order={order}
      isOpen={showDetailModal}
      onClose={() => setShowDetailModal(false)}
    />
    </>
  );
}