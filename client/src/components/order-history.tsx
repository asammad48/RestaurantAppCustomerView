import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Package, Clock, MapPin, Users, Eye, Building2, User, Calendar, 
         Phone, Mail, DollarSign, Utensils, ShoppingCart, AlertTriangle, ChevronDown, ChevronUp, 
         Smartphone, Receipt, CreditCard, Truck, Package2, Plus } from 'lucide-react';
import { fetchOrderHistory, getOrderStatusText, getOrderTypeText, formatCurrency } from '@/services/order-history-service';
import { useAuthStore } from '@/lib/auth-store';
import { Order } from '@/types/order-history';
import { formatToLocalTime } from '@/lib/utils';
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
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const getStatusColor = (status: string | number) => {
    if (status === 'Pending' || status === 'pending') {
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    }
    return 'bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/20';
  };

  const getCustomerName = () => {
    if (order.username && order.username !== 'guest' && !order.username.startsWith('guest_')) {
      return order.username;
    }
    return '';
  };

  const getOrderDate = () => {
    if (order.createdAt) {
      return formatToLocalTime(order.createdAt, 'MMM dd, yyyy');
    }
    return 'Date not available';
  };

  const getOrderTime = () => {
    if (order.createdAt) {
      return formatToLocalTime(order.createdAt, 'hh:mm a');
    }
    return 'Date not available';
  };

  const getOrderTypeDisplay = () => {
    const orderTypeText = getOrderTypeText(order.orderType);
    return orderTypeText || 'Unknown';
  };

  // Helper function to check if a value should be displayed
  const shouldDisplay = (value: any) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    return Boolean(value);
  };

  return (
    <>
    <Card className="transition-all duration-200 hover:shadow-md w-full border rounded-lg" data-testid={`card-order-${order.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-2" data-testid={`text-order-number-${order.id}`}>
              {order.orderNumber}
            </CardTitle>
            <p className="text-sm text-gray-500 mb-1">Order Number</p>
            
            {/* Branch and Location Info */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-xs text-gray-600">
                <Building2 className="h-3 w-3 mr-1.5" />
                <span>{order.branchName}</span>
                {shouldDisplay(order.branchId) && (
                  <span className="text-gray-400 ml-1">(ID: {order.branchId})</span>
                )}
              </div>
              
              {shouldDisplay(order.locationName) && (
                <div className="flex items-center text-xs text-gray-500">
                  <MapPin className="h-3 w-3 mr-1.5" />
                  <span>{order.locationName}</span>
                  {shouldDisplay(order.locationId) && (
                    <span className="text-gray-400 ml-1">(ID: {order.locationId})</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor(order.orderStatus)} text-sm px-3 py-1 rounded-full`} data-testid={`status-${order.id}`}>
            {getOrderStatusText(order.orderStatus)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {/* Customer and Device Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            {shouldDisplay(getCustomerName()) && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900" data-testid={`text-customer-${order.id}`}>
                    {getCustomerName()}
                  </p>
                  <p className="text-xs text-gray-500">Customer</p>
                </div>
              </div>
            )}
            
            {shouldDisplay(order.deviceInfo) && (
              <div className="flex items-center">
                <Smartphone className="h-4 w-4 mr-2 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.deviceInfo}
                  </p>
                  <p className="text-xs text-gray-500">Device</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid={`text-order-date-${order.id}`}>
                  {getOrderDate()}
                </p>
                <p className="text-xs text-gray-500">Order Date</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900" data-testid={`text-order-time-${order.id}`}>
                  {getOrderTime()}
                </p>
                <p className="text-xs text-gray-500">Order Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Type */}
        <div className="mb-4">
          <div className="flex items-center">
            <Package className="h-4 w-4 mr-2 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900" data-testid={`text-order-type-${order.id}`}>
                {getOrderTypeDisplay()}
              </p>
              <p className="text-xs text-gray-500">Order Type</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Receipt className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Financial Summary</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount, order.currency)}</span>
          </div>
          
          {showAllDetails && (
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Order Amount:</span>
                <span>{formatCurrency(order.orderAmount, order.currency)}</span>
              </div>
              {shouldDisplay(order.serviceCharges) && order.serviceCharges > 0 && (
                <div className="flex justify-between">
                  <span>Service Charges:</span>
                  <span>{formatCurrency(order.serviceCharges, order.currency)}</span>
                </div>
              )}
              {shouldDisplay(order.deliveryCharges) && order.deliveryCharges > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charges:</span>
                  <span>{formatCurrency(order.deliveryCharges, order.currency)}</span>
                </div>
              )}
              {shouldDisplay(order.taxAmount) && order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(order.taxAmount, order.currency)}</span>
                </div>
              )}
              {shouldDisplay(order.tipAmount) && order.tipAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tip Amount:</span>
                  <span>{formatCurrency(order.tipAmount, order.currency)}</span>
                </div>
              )}
              {shouldDisplay(order.discountedAmount) && order.discountedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.discountedAmount, order.currency)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Utensils className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {order.orderItems.length + (order.orderPackages?.length || 0)} items
              </span>
            </div>
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
          
          {!showAllDetails && (
            <div className="text-xs text-gray-600">
              {order.orderItems.slice(0, 2).map((item, index) => (
                <div key={item.id} className="truncate">
                  {item.quantity}× {item.itemName}
                  {shouldDisplay(item.variantName) && <span className="text-gray-400"> ({item.variantName})</span>}
                </div>
              ))}
              {order.orderItems.length > 2 && (
                <span className="text-gray-400">+{order.orderItems.length - 2} more items</span>
              )}
              {shouldDisplay(order.orderPackages) && order.orderPackages.length > 0 && (
                <div className="mt-1 text-gray-400">
                  +{order.orderPackages.length} package{order.orderPackages.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expandable Details Section */}
        {showAllDetails && (
          <div className="space-y-4">
            {/* Allergens */}
            {shouldDisplay(order.allergens) && (
              <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Allergens to Avoid</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {order.allergens!.map((allergen, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Order Items */}
            {shouldDisplay(order.orderItems) && (
              <div>
                <div className="flex items-center mb-2">
                  <Utensils className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Order Items</span>
                </div>
                <div className="space-y-2">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <span className="font-medium">{item.quantity}× {item.itemName}</span>
                          {shouldDisplay(item.variantName) && (
                            <span className="text-gray-500 ml-1">({item.variantName})</span>
                          )}
                          {shouldDisplay(item.personServing) && (
                            <span className="text-gray-500 ml-1">- {item.personServing}</span>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(item.totalPrice, order.currency)}</span>
                      </div>
                      
                      {/* Modifiers */}
                      {shouldDisplay(item.orderItemModifiers) && (
                        <div className="ml-2 space-y-1">
                          {item.orderItemModifiers.map((modifier) => (
                            <div key={modifier.id} className="flex justify-between text-gray-600">
                              <span>+ {modifier.modifierName} (x{modifier.quantity})</span>
                              <span>+{formatCurrency(modifier.price, order.currency)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Customizations */}
                      {shouldDisplay(item.orderItemCustomizations) && (
                        <div className="ml-2 space-y-1">
                          {item.orderItemCustomizations.map((customization) => (
                            <div key={customization.id} className="text-gray-600">
                              <span>{customization.customizationName}</span>
                              {shouldDisplay(customization.price) && customization.price > 0 && (
                                <span className="ml-1">+{formatCurrency(customization.price, order.currency)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {shouldDisplay(item.discount) && item.discount! > 0 && (
                        <div className="text-green-600 text-right">
                          Discount: -{formatCurrency(item.discount!, order.currency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Order Packages */}
            {shouldDisplay(order.orderPackages) && (
              <div>
                <div className="flex items-center mb-2">
                  <Package2 className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Order Packages</span>
                </div>
                <div className="space-y-2">
                  {order.orderPackages.map((pkg) => (
                    <div key={pkg.id} className="p-2 bg-blue-50 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <span className="font-medium">{pkg.quantity}× {pkg.packageName}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(pkg.price * pkg.quantity, order.currency)}</span>
                      </div>
                      
                      {/* Package Items */}
                      {shouldDisplay(pkg.menuItems) && (
                        <div className="ml-2 space-y-1">
                          {pkg.menuItems!.map((item) => (
                            <div key={item.id} className="text-gray-600">
                              <span>{item.quantity}× {item.itemName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Package Sub Items */}
                      {shouldDisplay(pkg.subItems) && (
                        <div className="ml-2 space-y-1">
                          {pkg.subItems!.map((subItem) => (
                            <div key={subItem.id} className="text-gray-600">
                              <span>{subItem.quantity}× {subItem.itemName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {shouldDisplay(pkg.discount) && pkg.discount! > 0 && (
                        <div className="text-green-600 text-right">
                          Package Discount: -{formatCurrency(pkg.discount!, order.currency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Bills */}
            {shouldDisplay(order.splitBills) && (
              <div>
                <div className="flex items-center mb-2">
                  <CreditCard className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Split Bill Details</span>
                </div>
                <div className="space-y-1">
                  {order.splitBills.map((split, index) => (
                    <div key={split.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded" data-testid={`split-${order.id}-${index}`}>
                      <div>
                        <div className="font-medium">{split.itemName}</div>
                        <div className="text-xs text-gray-500">{split.mobileNumber}</div>
                      </div>
                      <span className="font-medium">{formatCurrency(split.price, order.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Details */}
            {shouldDisplay(order.orderDeliveryDetails) && order.orderDeliveryDetails && (
              <div>
                <div className="flex items-center mb-2">
                  <Truck className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Delivery Details</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1">
                  {shouldDisplay(order.orderDeliveryDetails.fullName) && (
                    <div><strong>Name:</strong> {order.orderDeliveryDetails.fullName}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.email) && (
                    <div className="flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      <span>{order.orderDeliveryDetails.email}</span>
                    </div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.phoneNumber) && (
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{order.orderDeliveryDetails.phoneNumber}</span>
                    </div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.deliveryAddress) && (
                    <div><strong>Address:</strong> {order.orderDeliveryDetails.deliveryAddress}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.streetAddress) && (
                    <div><strong>Street:</strong> {order.orderDeliveryDetails.streetAddress}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.apartment) && (
                    <div><strong>Apartment:</strong> {order.orderDeliveryDetails.apartment}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.deliveryInstruction) && (
                    <div><strong>Instructions:</strong> {order.orderDeliveryDetails.deliveryInstruction}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.prefferedDeliveryTime) && (
                    <div><strong>Preferred Time:</strong> {formatToLocalTime(order.orderDeliveryDetails.prefferedDeliveryTime, 'MMM dd, yyyy hh:mm a')}</div>
                  )}
                  {shouldDisplay(order.orderDeliveryDetails.latitude) && shouldDisplay(order.orderDeliveryDetails.longitude) && (
                    <div className="text-xs text-gray-500">
                      <strong>Coordinates:</strong> {order.orderDeliveryDetails.latitude}, {order.orderDeliveryDetails.longitude}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Details */}
            {shouldDisplay(order.orderPickupDetails) && order.orderPickupDetails && (
              <div>
                <div className="flex items-center mb-2">
                  <ShoppingCart className="h-4 w-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Pickup Details</span>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-sm space-y-1">
                  {shouldDisplay(order.orderPickupDetails.name) && (
                    <div><strong>Name:</strong> {order.orderPickupDetails.name}</div>
                  )}
                  {shouldDisplay(order.orderPickupDetails.email) && (
                    <div className="flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      <span>{order.orderPickupDetails.email}</span>
                    </div>
                  )}
                  {shouldDisplay(order.orderPickupDetails.phoneNumber) && (
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{order.orderPickupDetails.phoneNumber}</span>
                    </div>
                  )}
                  {shouldDisplay(order.orderPickupDetails.pickupInstruction) && (
                    <div><strong>Instructions:</strong> {order.orderPickupDetails.pickupInstruction}</div>
                  )}
                  {shouldDisplay(order.orderPickupDetails.prefferedPickupTime) && (
                    <div><strong>Preferred Time:</strong> {formatToLocalTime(order.orderPickupDetails.prefferedPickupTime, 'MMM dd, yyyy hh:mm a')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Details Button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllDetails(!showAllDetails)}
            className="text-[#15803d] hover:text-[#15803d] hover:bg-[#15803d]/10"
            data-testid={`button-toggle-details-${order.id}`}
          >
            {showAllDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All Details
              </>
            )}
          </Button>
        </div>
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