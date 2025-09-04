import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Package, 
  Phone, 
  Mail, 
  User, 
  Printer,
  Receipt,
  Home,
  Users,
  CreditCard
} from "lucide-react";
import { Order } from '@/types/order-history';
import { formatCurrency, getOrderStatusText, getOrderTypeText } from '@/services/order-history-service';
import { format } from 'date-fns';

interface OrderDetailModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = generatePrintContent(order);
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status: string | number) => {
    const statusStr = typeof status === 'string' ? status.toLowerCase() : '';
    const statusNum = typeof status === 'number' ? status : 0;
    
    if (statusStr.includes('pending') || statusNum === 1) return 'bg-yellow-100 text-yellow-800';
    if (statusStr.includes('confirmed') || statusNum === 2) return 'bg-blue-100 text-blue-800';
    if (statusStr.includes('preparing') || statusNum === 3) return 'bg-orange-100 text-orange-800';
    if (statusStr.includes('ready') || statusNum === 4) return 'bg-purple-100 text-purple-800';
    if (statusStr.includes('delivered') || statusNum === 5) return 'bg-green-100 text-green-800';
    if (statusStr.includes('cancelled') || statusNum === 6) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Order #{order.orderNumber}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(order.createdAt), 'hh:mm a')}
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <Badge className={getStatusColor(order.orderStatus)}>
                {getOrderStatusText(order.orderStatus)}
              </Badge>
              <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type:</span>
                  <span className="font-medium">{getOrderTypeText(order.orderType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Branch:</span>
                  <span className="font-medium">{order.branchName}</span>
                </div>
                {order.locationName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{order.locationName}</span>
                  </div>
                )}
                {order.username && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{order.username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            {order.orderDeliveryDetails && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{order.orderDeliveryDetails.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{order.orderDeliveryDetails.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{order.orderDeliveryDetails.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div>{order.orderDeliveryDetails.deliveryAddress}</div>
                      <div className="text-gray-500">{order.orderDeliveryDetails.streetAddress}</div>
                      {order.orderDeliveryDetails.apartment && (
                        <div className="text-gray-500">Apt: {order.orderDeliveryDetails.apartment}</div>
                      )}
                    </div>
                  </div>
                  {order.orderDeliveryDetails.deliveryInstruction && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">
                      <strong>Instructions:</strong> {order.orderDeliveryDetails.deliveryInstruction}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Order Items ({order.orderItems.length})</h3>
            <div className="space-y-4">
              {order.orderItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.itemName}</h4>
                      {item.variantName && (
                        <p className="text-sm text-gray-600">Variant: {item.variantName}</p>
                      )}
                      {item.personServing && (
                        <p className="text-sm text-gray-600">Serving: {item.personServing}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                      </div>
                      {item.discount && item.discount > 0 && (
                        <div className="text-sm text-green-600">
                          Discount: -{formatCurrency(item.discount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {item.orderItemModifiers && item.orderItemModifiers.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-blue-200">
                      <h5 className="text-sm font-medium text-blue-800 mb-1">Modifiers:</h5>
                      {item.orderItemModifiers.map((modifier) => (
                        <div key={modifier.id} className="flex justify-between text-sm">
                          <span>{modifier.quantity}× {modifier.modifierName}</span>
                          <span>+{formatCurrency(modifier.price * modifier.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customizations */}
                  {item.orderItemCustomizations && item.orderItemCustomizations.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-green-200">
                      <h5 className="text-sm font-medium text-green-800 mb-1">Customizations:</h5>
                      {item.orderItemCustomizations.map((customization) => (
                        <div key={customization.id} className="flex justify-between text-sm">
                          <span>{customization.customizationName}</span>
                          <span>+{formatCurrency(customization.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub Menu Items */}
                  {item.subMenuItems && item.subMenuItems.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-purple-200">
                      <h5 className="text-sm font-medium text-purple-800 mb-1">Sub Items:</h5>
                      {item.subMenuItems.map((subItem) => (
                        <div key={subItem.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{subItem.quantity}× {subItem.itemName}</span>
                            <span>{formatCurrency(subItem.totalPrice)}</span>
                          </div>
                          {subItem.discount && subItem.discount > 0 && (
                            <div className="text-xs text-green-600 pl-2">
                              Discount: -{formatCurrency(subItem.discount)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Menu Packages */}
          {order.orderPackages && order.orderPackages.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Menu Packages ({order.orderPackages.length})</h3>
                <div className="space-y-4">
                  {order.orderPackages.map((pkg) => (
                    <div key={pkg.id} className="border rounded-lg p-4 bg-orange-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{pkg.packageName}</h4>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {pkg.quantity} × {formatCurrency(pkg.price)} = {formatCurrency(pkg.price * pkg.quantity)}
                          </div>
                          {pkg.discount && pkg.discount > 0 && (
                            <div className="text-sm text-green-600">
                              Package Discount: -{formatCurrency(pkg.discount)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Package Items */}
                      {pkg.menuItems && pkg.menuItems.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-orange-300">
                          <h5 className="text-sm font-medium text-orange-800 mb-1">Package Items:</h5>
                          {pkg.menuItems.map((item) => (
                            <div key={item.id} className="mb-2">
                              <div className="flex justify-between text-sm">
                                <span>{item.quantity}× {item.itemName}</span>
                              </div>
                              {/* Package Item Variants */}
                              {item.variants && item.variants.length > 0 && (
                                <div className="pl-4 text-xs text-gray-600">
                                  {item.variants.map((variant) => (
                                    <div key={variant.id}>
                                      {variant.quantity}× {variant.variantName}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Package Item Modifiers */}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="pl-4 text-xs text-blue-600">
                                  {item.modifiers.map((modifier) => (
                                    <div key={modifier.id}>
                                      +{modifier.quantity}× {modifier.modifierName}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Package Sub Items */}
                      {pkg.subItems && pkg.subItems.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-yellow-300">
                          <h5 className="text-sm font-medium text-yellow-800 mb-1">Package Sub Items:</h5>
                          {pkg.subItems.map((subItem) => (
                            <div key={subItem.id} className="text-sm">
                              {subItem.quantity}× {subItem.itemName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Split Bills */}
          {order.splitBills && order.splitBills.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Split Bill Details ({order.splitBills.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.splitBills.map((split) => (
                    <div key={split.id} className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{split.mobileNumber}</div>
                          <div className="text-sm text-gray-600">{split.itemName}</div>
                          <div className="text-xs text-gray-500">Split Type: {split.splitType}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(split.price)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Order Summary
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Order Amount:</span>
                <span>{formatCurrency(order.orderAmount)}</span>
              </div>
              {order.discountedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(order.discountedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Service Charges:</span>
                <span>{formatCurrency(order.serviceCharges)}</span>
              </div>
              {order.deliveryCharges > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Charges:</span>
                  <span>{formatCurrency(order.deliveryCharges)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax Amount:</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              {order.tipAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <span>{formatCurrency(order.tipAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generatePrintContent(order: Order): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order Receipt #${order.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .order-info { margin-bottom: 15px; }
        .items-section { margin-bottom: 15px; }
        .item { margin-bottom: 10px; padding: 5px; border: 1px solid #ddd; }
        .modifier { margin-left: 20px; font-size: 11px; color: #666; }
        .summary { border-top: 2px solid #000; padding-top: 10px; }
        .total { font-weight: bold; font-size: 14px; }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ORDER RECEIPT</h1>
        <h2>Order #${order.orderNumber}</h2>
        <p>${format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}</p>
      </div>
      
      <div class="order-info">
        <p><strong>Order Type:</strong> ${getOrderTypeText(order.orderType)}</p>
        <p><strong>Branch:</strong> ${order.branchName}</p>
        ${order.locationName ? `<p><strong>Location:</strong> ${order.locationName}</p>` : ''}
        <p><strong>Status:</strong> ${getOrderStatusText(order.orderStatus)}</p>
      </div>
      
      ${order.orderDeliveryDetails ? `
      <div class="delivery-info">
        <h3>Delivery Details</h3>
        <p><strong>Name:</strong> ${order.orderDeliveryDetails.fullName}</p>
        <p><strong>Phone:</strong> ${order.orderDeliveryDetails.phoneNumber}</p>
        <p><strong>Address:</strong> ${order.orderDeliveryDetails.deliveryAddress}</p>
        ${order.orderDeliveryDetails.deliveryInstruction ? `<p><strong>Instructions:</strong> ${order.orderDeliveryDetails.deliveryInstruction}</p>` : ''}
      </div>
      ` : ''}
      
      <div class="items-section">
        <h3>Order Items</h3>
        ${order.orderItems.map(item => `
          <div class="item">
            <div><strong>${item.quantity}× ${item.itemName}</strong> - ${formatCurrency(item.totalPrice)}</div>
            ${item.variantName ? `<div class="modifier">Variant: ${item.variantName}</div>` : ''}
            ${item.orderItemModifiers?.map(mod => `
              <div class="modifier">${mod.quantity}× ${mod.modifierName} (+${formatCurrency(mod.price)})</div>
            `).join('') || ''}
          </div>
        `).join('')}
      </div>
      
      <div class="summary">
        <p>Order Amount: ${formatCurrency(order.orderAmount)}</p>
        ${order.discountedAmount > 0 ? `<p>Discount: -${formatCurrency(order.discountedAmount)}</p>` : ''}
        <p>Service Charges: ${formatCurrency(order.serviceCharges)}</p>
        ${order.deliveryCharges > 0 ? `<p>Delivery Charges: ${formatCurrency(order.deliveryCharges)}</p>` : ''}
        <p>Tax Amount: ${formatCurrency(order.taxAmount)}</p>
        <p class="total">Total: ${formatCurrency(order.totalAmount)}</p>
      </div>
    </body>
    </html>
  `;
}