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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 -mx-6 -mt-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Receipt className="h-6 w-6" />
                </div>
                Order #{order.orderNumber}
              </h1>
              <div className="flex items-center gap-6 mt-3 text-blue-100">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(new Date(order.createdAt), 'hh:mm a')}
                </div>
              </div>
            </div>
            <div className="text-right space-y-3">
              <Badge className={`${getStatusColor(order.orderStatus)} border-0 shadow-lg text-sm px-4 py-2`}>
                {getOrderStatusText(order.orderStatus)}
              </Badge>
              <div>
                <Button 
                  onClick={handlePrint} 
                  variant="secondary" 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-lg"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-8">
          {/* Order Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Info Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 p-2 rounded-xl">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-xl text-gray-800">Order Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Order Type</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{getOrderTypeText(order.orderType)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Branch</span>
                  <span className="font-semibold text-gray-800">{order.branchName}</span>
                </div>
                {order.locationName && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Location</span>
                    <span className="font-semibold text-gray-800">{order.locationName}</span>
                  </div>
                )}
                {order.username && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Customer</span>
                    <span className="font-semibold text-gray-800">{order.username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Details Card */}
            {order.orderDeliveryDetails && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-500 p-2 rounded-xl">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-800">Delivery Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-semibold text-gray-800">{order.orderDeliveryDetails.fullName}</div>
                      <div className="text-sm text-gray-600">Customer Name</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-semibold text-gray-800">{order.orderDeliveryDetails.phoneNumber}</div>
                      <div className="text-sm text-gray-600">Phone Number</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                    <Home className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{order.orderDeliveryDetails.deliveryAddress}</div>
                      <div className="text-sm text-gray-600 mt-1">{order.orderDeliveryDetails.streetAddress}</div>
                      {order.orderDeliveryDetails.apartment && (
                        <div className="text-sm text-gray-600">Apt: {order.orderDeliveryDetails.apartment}</div>
                      )}
                    </div>
                  </div>
                  {order.orderDeliveryDetails.deliveryInstruction && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="font-semibold text-yellow-800 mb-1">Special Instructions</div>
                      <div className="text-yellow-700">{order.orderDeliveryDetails.deliveryInstruction}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

          {/* Order Items */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-bold text-2xl text-gray-800">Order Items</h2>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid gap-4">
              {order.orderItems.map((item, index) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-orange-100 text-orange-800 text-sm font-bold px-3 py-1 rounded-full">
                          {index + 1}
                        </span>
                        <h4 className="font-bold text-lg text-gray-800">{item.itemName}</h4>
                      </div>
                      <div className="space-y-1">
                        {item.variantName && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <span className="text-sm text-blue-700 font-medium">Variant: {item.variantName}</span>
                          </div>
                        )}
                        {item.personServing && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                            <span className="text-sm text-purple-700 font-medium">Serving: {item.personServing}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right bg-gray-50 p-4 rounded-xl">
                      <div className="font-bold text-lg text-gray-800">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(item.totalPrice)}
                      </div>
                      {item.discount && item.discount > 0 && (
                        <div className="text-sm text-green-600 font-semibold mt-1">
                          Saved: {formatCurrency(item.discount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {item.orderItemModifiers && item.orderItemModifiers.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                      <h5 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Modifiers
                      </h5>
                      <div className="grid gap-2">
                        {item.orderItemModifiers.map((modifier) => (
                          <div key={modifier.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                            <span className="font-medium text-gray-800">{modifier.quantity}× {modifier.modifierName}</span>
                            <span className="font-bold text-blue-600">+{formatCurrency(modifier.price * modifier.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customizations */}
                  {item.orderItemCustomizations && item.orderItemCustomizations.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
                      <h5 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Customizations
                      </h5>
                      <div className="grid gap-2">
                        {item.orderItemCustomizations.map((customization) => (
                          <div key={customization.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                            <span className="font-medium text-gray-800">{customization.customizationName}</span>
                            <span className="font-bold text-green-600">+{formatCurrency(customization.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub Menu Items */}
                  {item.subMenuItems && item.subMenuItems.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <h5 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Sub Items
                      </h5>
                      <div className="grid gap-2">
                        {item.subMenuItems.map((subItem) => (
                          <div key={subItem.id} className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{subItem.quantity}× {subItem.itemName}</span>
                              <span className="font-bold text-purple-600">{formatCurrency(subItem.totalPrice)}</span>
                            </div>
                            {subItem.discount && subItem.discount > 0 && (
                              <div className="text-sm text-green-600 font-semibold mt-1">
                                Discount: -{formatCurrency(subItem.discount)}
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
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 p-2 rounded-xl">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="font-bold text-2xl text-gray-800">Menu Packages</h2>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {order.orderPackages.length} package{order.orderPackages.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-4">
                  {order.orderPackages.map((pkg) => (
                    <div key={pkg.id} className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-xl text-gray-800">{pkg.packageName}</h4>
                        </div>
                        <div className="text-right bg-white p-4 rounded-xl shadow-sm">
                          <div className="font-bold text-lg text-gray-800">
                            {pkg.quantity} × {formatCurrency(pkg.price)}
                          </div>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(pkg.price * pkg.quantity)}
                          </div>
                          {pkg.discount && pkg.discount > 0 && (
                            <div className="text-sm text-green-600 font-semibold mt-1">
                              Package Discount: -{formatCurrency(pkg.discount)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Package Items & Sub Items in a grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Package Items */}
                        {pkg.menuItems && pkg.menuItems.length > 0 && (
                          <div className="bg-white p-4 rounded-xl border border-orange-300">
                            <h5 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Package Items
                            </h5>
                            {pkg.menuItems.map((item) => (
                              <div key={item.id} className="mb-3 last:mb-0">
                                <div className="font-medium text-gray-800">{item.quantity}× {item.itemName}</div>
                                {/* Package Item Variants & Modifiers */}
                                <div className="pl-4 mt-1 space-y-1">
                                  {item.variants && item.variants.map((variant) => (
                                    <div key={variant.id} className="text-sm text-blue-600">
                                      {variant.quantity}× {variant.variantName}
                                    </div>
                                  ))}
                                  {item.modifiers && item.modifiers.map((modifier) => (
                                    <div key={modifier.id} className="text-sm text-green-600">
                                      +{modifier.quantity}× {modifier.modifierName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Package Sub Items */}
                        {pkg.subItems && pkg.subItems.length > 0 && (
                          <div className="bg-white p-4 rounded-xl border border-yellow-300">
                            <h5 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Package Sub Items
                            </h5>
                            {pkg.subItems.map((subItem) => (
                              <div key={subItem.id} className="font-medium text-gray-800 mb-2 last:mb-0">
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
            </>
          )}

          {/* Split Bills */}
          {order.splitBills && order.splitBills.length > 0 && (
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500 p-2 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="font-bold text-2xl text-gray-800">Split Bill Details</h2>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {order.splitBills.length} person{order.splitBills.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.splitBills.map((split) => (
                    <div key={split.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-bold text-lg text-gray-800">{split.mobileNumber}</div>
                          <div className="text-sm text-gray-600 mt-1">{split.itemName}</div>
                          <div className="text-xs text-blue-600 mt-1 bg-blue-100 px-2 py-1 rounded-full inline-block">
                            Split Type: {split.splitType}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(split.price)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-xl">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-bold text-2xl text-gray-800">Order Summary</h2>
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-300">
                  <span className="text-lg text-gray-700">Order Amount</span>
                  <span className="text-lg font-semibold text-gray-800">{formatCurrency(order.orderAmount)}</span>
                </div>
                {order.discountedAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-300">
                    <span className="text-lg text-green-700">Discount Applied</span>
                    <span className="text-lg font-semibold text-green-600">-{formatCurrency(order.discountedAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-gray-300">
                  <span className="text-lg text-gray-700">Service Charges</span>
                  <span className="text-lg font-semibold text-gray-800">{formatCurrency(order.serviceCharges)}</span>
                </div>
                {order.deliveryCharges > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-300">
                    <span className="text-lg text-gray-700">Delivery Charges</span>
                    <span className="text-lg font-semibold text-gray-800">{formatCurrency(order.deliveryCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-gray-300">
                  <span className="text-lg text-gray-700">Tax Amount</span>
                  <span className="text-lg font-semibold text-gray-800">{formatCurrency(order.taxAmount)}</span>
                </div>
                {order.tipAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-300">
                    <span className="text-lg text-gray-700">Tip</span>
                    <span className="text-lg font-semibold text-gray-800">{formatCurrency(order.tipAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-4 bg-green-100 -mx-6 px-6 rounded-xl">
                  <span className="text-2xl font-bold text-gray-800">Total Amount</span>
                  <span className="text-3xl font-bold text-green-600">{formatCurrency(order.totalAmount)}</span>
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