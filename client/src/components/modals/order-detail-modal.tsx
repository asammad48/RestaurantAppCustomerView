import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CreditCard,
  Building2
} from "lucide-react";
import { Order } from '@/types/order-history';
import { formatCurrency, getOrderStatusText, getOrderTypeText } from '@/services/order-history-service';
import { formatToLocalTime } from '@/lib/utils';

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
    return 'bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#15803d] text-white p-6 -mx-6 -mt-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Receipt className="h-5 w-5" />
                </div>
                Order #{order.orderNumber}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-green-100 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatToLocalTime(order.createdAt, 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatToLocalTime(order.createdAt, 'hh:mm a')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${getStatusColor(order.orderStatus)} bg-white/20 text-white border-white/30 text-xs px-2 py-1`}>
                {getOrderStatusText(order.orderStatus)}
              </Badge>
              <div className="mt-2">
                <Button 
                  onClick={handlePrint} 
                  variant="secondary" 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-7 px-3 text-xs"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 px-1">
          {/* Order Information */}
          <div className="bg-[#15803d]/5 p-4 rounded-xl border border-[#15803d]/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-[#15803d] p-1.5 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-lg text-[#15803d]">Order Info</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[#15803d]/10">
                <span className="text-gray-600">Type</span>
                <span className="font-semibold text-[#15803d]">{getOrderTypeText(order.orderType)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#15803d]/10">
                <span className="text-gray-600">Branch</span>
                <span className="font-semibold">{order.branchName}</span>
              </div>
              {order.locationName && (
                <div className="flex justify-between py-1 border-b border-[#15803d]/10">
                  <span className="text-gray-600">Location</span>
                  <span className="font-semibold">{order.locationName}</span>
                </div>
              )}
              {order.username && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-semibold">{order.username}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Status Changes */}
          {order.orderStatusChanges && order.orderStatusChanges.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-lg text-blue-700">Order Status History</h3>
              </div>
              <div className="space-y-3">
                {order.orderStatusChanges.map((status, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-blue-900">{status.orderStatus}</span>
                        <span className="text-xs text-gray-500">
                          {formatToLocalTime(status.statusChangesDate, 'MMM dd, yyyy hh:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{status.statusComment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Details */}
          {order.orderDeliveryDetails && (
            <div className="bg-[#15803d]/5 p-4 rounded-xl border border-[#15803d]/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-[#15803d] p-1.5 rounded-lg">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-lg text-[#15803d]">Delivery Details</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#15803d]/10">
                  <User className="h-4 w-4 text-[#15803d]" />
                  <div>
                    <div className="font-semibold">{order.orderDeliveryDetails.fullName}</div>
                    <div className="text-xs text-gray-500">Customer Name</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#15803d]/10">
                  <Phone className="h-4 w-4 text-[#15803d]" />
                  <div>
                    <div className="font-semibold">{order.orderDeliveryDetails.phoneNumber}</div>
                    <div className="text-xs text-gray-500">Phone Number</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-[#15803d]/10">
                  <Home className="h-4 w-4 text-[#15803d] mt-0.5" />
                  <div>
                    <div className="font-semibold">{order.orderDeliveryDetails.deliveryAddress}</div>
                    <div className="text-xs text-gray-500">{order.orderDeliveryDetails.streetAddress}</div>
                    {order.orderDeliveryDetails.apartment && (
                      <div className="text-xs text-gray-500">Apt: {order.orderDeliveryDetails.apartment}</div>
                    )}
                  </div>
                </div>
                {order.orderDeliveryDetails.deliveryInstruction && (
                  <div className="p-3 bg-[#15803d]/10 rounded-lg border border-[#15803d]/20">
                    <div className="font-semibold text-[#15803d] text-xs mb-1">Special Instructions</div>
                    <div className="text-sm text-gray-700">{order.orderDeliveryDetails.deliveryInstruction}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#15803d] p-1.5 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-bold text-lg text-[#15803d]">Order Items</h2>
              <span className="bg-[#15803d]/10 text-[#15803d] px-2 py-0.5 rounded-full text-xs font-semibold">
                {order.orderItems.length}
              </span>
            </div>
            <div className="space-y-3">
              {order.orderItems.map((item, index) => (
                <div key={item.id} className="bg-white border border-[#15803d]/10 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#15803d] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {index + 1}
                        </span>
                        <h4 className="font-bold text-base">{item.itemName}</h4>
                      </div>
                      <div className="space-y-1">
                        {item.variantName && (
                          <div className="text-sm text-[#15803d]">Variant: {item.variantName}</div>
                        )}
                        {item.personServing && (
                          <div className="text-sm text-[#15803d]">Serving: {item.personServing}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right bg-[#15803d]/5 p-3 rounded-lg">
                      <div className="font-bold text-sm">
                        {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
                      </div>
                      <div className="text-lg font-bold text-[#15803d]">
                        {formatCurrency(item.totalPrice, order.currency)}
                      </div>
                      {item.discount && item.discount > 0 && (
                        <div className="text-xs text-[#15803d] font-semibold">
                          Saved: {formatCurrency(item.discount, order.currency)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {item.orderItemModifiers && item.orderItemModifiers.length > 0 && (
                    <div className="bg-[#15803d]/5 border border-[#15803d]/10 rounded-lg p-3 mb-2">
                      <h5 className="font-bold text-[#15803d] mb-2 text-sm">Modifiers</h5>
                      <div className="space-y-1">
                        {item.orderItemModifiers.map((modifier) => (
                          <div key={modifier.id} className="flex justify-between items-center bg-white p-2 rounded text-sm">
                            <span>{modifier.quantity}× {modifier.modifierName}</span>
                            <span className="font-bold text-[#15803d]">+{formatCurrency(modifier.price * modifier.quantity, order.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customizations */}
                  {item.orderItemCustomizations && item.orderItemCustomizations.length > 0 && (
                    <div className="bg-[#15803d]/5 border border-[#15803d]/10 rounded-lg p-3 mb-2">
                      <h5 className="font-bold text-[#15803d] mb-2 text-sm">Customizations</h5>
                      <div className="space-y-1">
                        {item.orderItemCustomizations.map((customization) => (
                          <div key={customization.id} className="flex justify-between items-center bg-white p-2 rounded text-sm">
                            <span>{customization.customizationName}</span>
                            <span className="font-bold text-[#15803d]">+{formatCurrency(customization.price, order.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub Menu Items */}
                  {item.subMenuItems && item.subMenuItems.length > 0 && (
                    <div className="bg-[#15803d]/5 border border-[#15803d]/10 rounded-lg p-3">
                      <h5 className="font-bold text-[#15803d] mb-2 text-sm">Sub Items</h5>
                      <div className="space-y-1">
                        {item.subMenuItems.map((subItem) => (
                          <div key={subItem.id} className="bg-white p-2 rounded">
                            <div className="flex justify-between items-center text-sm">
                              <span>{subItem.quantity}× {subItem.itemName}</span>
                              <span className="font-bold text-[#15803d]">{formatCurrency(subItem.totalPrice, order.currency)}</span>
                            </div>
                            {subItem.discount && subItem.discount > 0 && (
                              <div className="text-xs text-[#15803d] font-semibold">
                                Discount: -{formatCurrency(subItem.discount, order.currency)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Menu Packages */}
          {order.orderPackages && order.orderPackages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#15803d] p-1.5 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-lg text-[#15803d]">Menu Packages</h2>
                <span className="bg-[#15803d]/10 text-[#15803d] px-2 py-0.5 rounded-full text-xs font-semibold">
                  {order.orderPackages.length}
                </span>
              </div>
              <div className="space-y-3">
                {order.orderPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-[#15803d]/5 border border-[#15803d]/10 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-lg">{pkg.packageName}</h4>
                      <div className="text-right bg-white p-3 rounded-lg border border-[#15803d]/10">
                        <div className="font-bold text-sm">
                          {pkg.quantity} × {formatCurrency(pkg.price, order.currency)}
                        </div>
                        <div className="text-lg font-bold text-[#15803d]">
                          {formatCurrency(pkg.price * pkg.quantity, order.currency)}
                        </div>
                        {pkg.discount && pkg.discount > 0 && (
                          <div className="text-xs text-[#15803d] font-semibold">
                            Discount: -{formatCurrency(pkg.discount, order.currency)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Package Items & Sub Items */}
                    <div className="space-y-3">
                      {pkg.menuItems && pkg.menuItems.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-[#15803d]/10">
                          <h5 className="font-bold text-[#15803d] mb-2 text-sm flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Package Items
                          </h5>
                          {pkg.menuItems.map((item) => (
                            <div key={item.id} className="mb-2 last:mb-0 text-sm">
                              <div className="font-medium">{item.quantity}× {item.itemName}</div>
                              <div className="pl-4 mt-1 space-y-0.5">
                                {item.variants && item.variants.map((variant) => (
                                  <div key={variant.id} className="text-xs text-[#15803d]">
                                    {variant.quantity}× {variant.variantName}
                                  </div>
                                ))}
                                {item.modifiers && item.modifiers.map((modifier) => (
                                  <div key={modifier.id} className="text-xs text-[#15803d]">
                                    +{modifier.quantity}× {modifier.modifierName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {pkg.subItems && pkg.subItems.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-[#15803d]/10">
                          <h5 className="font-bold text-[#15803d] mb-2 text-sm">Package Sub Items</h5>
                          {pkg.subItems.map((subItem) => (
                            <div key={subItem.id} className="text-sm mb-1 last:mb-0">
                              {subItem.quantity}× {subItem.itemName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split Bills */}
          {order.splitBills && order.splitBills.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#15803d] p-1.5 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-lg text-[#15803d]">Split Bill</h2>
                <span className="bg-[#15803d]/10 text-[#15803d] px-2 py-0.5 rounded-full text-xs font-semibold">
                  {order.splitBills.length}
                </span>
              </div>
              <div className="space-y-2">
                {order.splitBills.map((split) => (
                  <div key={split.id} className="bg-[#15803d]/5 border border-[#15803d]/10 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{split.mobileNumber}</div>
                        <div className="text-sm text-gray-600">{split.itemName}</div>
                        <div className="text-xs bg-[#15803d]/10 text-[#15803d] px-2 py-0.5 rounded-full inline-block mt-1">
                          {split.splitType}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#15803d]">{formatCurrency(split.price, order.currency)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#15803d] p-1.5 rounded-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-bold text-lg text-[#15803d]">Order Summary</h2>
            </div>
            <div className="bg-[#15803d]/5 rounded-xl p-4 border border-[#15803d]/10">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                  <span>Sub Total</span>
                  <span className="font-semibold">{formatCurrency(order.subTotal, order.currency)}</span>
                </div>
                {order.discountedAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                    <span>Discount Applied</span>
                    <span className="font-semibold text-[#15803d]">-{formatCurrency(order.discountedAmount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                  <span>Service Charges</span>
                  <span className="font-semibold">{formatCurrency(order.serviceCharges, order.currency)}</span>
                </div>
                {order.deliveryCharges > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                    <span>Delivery Charges</span>
                    <span className="font-semibold">{formatCurrency(order.deliveryCharges, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                  <span>Tax Amount</span>
                  <span className="font-semibold">{formatCurrency(order.taxAmount, order.currency)}</span>
                </div>
                {order.tipAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-[#15803d]/10">
                    <span>Tip</span>
                    <span className="font-semibold">{formatCurrency(order.tipAmount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 bg-[#15803d] text-white -mx-4 px-4 rounded-lg mt-4">
                  <span className="text-lg font-bold">Total Amount</span>
                  <span className="text-xl font-bold">{formatCurrency(order.totalAmount, order.currency)}</span>
                </div>
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
        .header { text-align: center; border-bottom: 2px solid #15803d; padding-bottom: 10px; margin-bottom: 15px; color: #15803d; }
        .order-info { margin-bottom: 15px; }
        .items-section { margin-bottom: 15px; }
        .item { margin-bottom: 10px; padding: 5px; border: 1px solid #15803d; border-radius: 5px; }
        .modifier { margin-left: 20px; font-size: 11px; color: #15803d; }
        .summary { border-top: 2px solid #15803d; padding-top: 10px; }
        .total { font-weight: bold; font-size: 14px; color: #15803d; }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ORDER RECEIPT</h1>
        <h2>Order #${order.orderNumber}</h2>
        <p>${formatToLocalTime(order.createdAt, 'MMM dd, yyyy • hh:mm a')}</p>
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
            <div><strong>${item.quantity}× ${item.itemName}</strong> - ${formatCurrency(item.totalPrice, order.currency)}</div>
            ${item.variantName ? `<div class="modifier">Variant: ${item.variantName}</div>` : ''}
            ${item.orderItemModifiers?.map(mod => `
              <div class="modifier">${mod.quantity}× ${mod.modifierName} (+${formatCurrency(mod.price, order.currency)})</div>
            `).join('') || ''}
          </div>
        `).join('')}
      </div>
      
      <div class="summary">
        <p>Order Amount: ${formatCurrency(order.orderAmount, order.currency)}</p>
        ${order.discountedAmount > 0 ? `<p>Discount: -${formatCurrency(order.discountedAmount, order.currency)}</p>` : ''}
        <p>Service Charges: ${formatCurrency(order.serviceCharges, order.currency)}</p>
        ${order.deliveryCharges > 0 ? `<p>Delivery Charges: ${formatCurrency(order.deliveryCharges, order.currency)}</p>` : ''}
        <p>Tax Amount: ${formatCurrency(order.taxAmount, order.currency)}</p>
        <p class="total">Total: ${formatCurrency(order.totalAmount, order.currency)}</p>
      </div>
    </body>
    </html>
  `;
}