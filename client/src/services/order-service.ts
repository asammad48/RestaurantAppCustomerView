import { apiClient, OrderRequest, OrderResponse, ApiResponse } from '@/lib/api-client';
import { CartItem, ServiceType } from '@/lib/store';

export class OrderService {
  // Get order type based on service type
  private getOrderType(serviceType: ServiceType): number {
    switch (serviceType) {
      case 'delivery':
        return 1;
      case 'takeaway':
        return 2;
      case 'dine-in':
        return 3;
      default:
        return 2; // Default to takeaway
    }
  }

  // Convert cart items to order items format
  private convertCartItemsToOrderItems(cartItems: CartItem[]): any[] {
    return cartItems.map(item => {
      const orderItem: any = {
        menuItemId: parseInt(item.menuItemId?.toString() || item.id),
        quantity: item.quantity,
      };

      // Add variant ID if exists
      if (item.variations && item.variations.length > 0 && item.variation) {
        const selectedVariation = item.variations.find(v => v.name === item.variation);
        if (selectedVariation) {
          orderItem.variantId = selectedVariation.id;
        }
      }

      // Add modifiers if exists
      if (item.modifiers && item.modifiers.length > 0) {
        orderItem.modifiers = item.modifiers.map(mod => ({
          modifierId: mod.id
        }));
      }

      // Add customizations if exists
      if (item.customizations && item.customizations.length > 0 && item.customization?.selectedCustomizations) {
        orderItem.customizations = [];
        item.customizations.forEach(custom => {
          const selectedOption = item.customization?.selectedCustomizations?.[custom.name];
          if (selectedOption) {
            const option = custom.options.find(opt => opt.name === selectedOption);
            if (option) {
              orderItem.customizations.push({
                customizationId: custom.id,
                optionId: option.id
              });
            }
          }
        });
      }

      return orderItem;
    });
  }

  // Create order with dynamic configuration
  async createOrder({
    cartItems,
    serviceType,
    branchId,
    locationId,
    username,
    tipAmount = 0,
    deviceInfo = 'WEB_APP'
  }: {
    cartItems: CartItem[];
    serviceType: ServiceType;
    branchId: number;
    locationId?: number;
    username: string;
    tipAmount?: number;
    deviceInfo?: string;
  }): Promise<ApiResponse<OrderResponse>> {
    const orderData: OrderRequest = {
      branchId,
      locationId: serviceType === 'dine-in' ? (locationId || 0) : 0,
      deviceInfo,
      tipAmount,
      username,
      orderType: this.getOrderType(serviceType),
      orderItems: this.convertCartItemsToOrderItems(cartItems),
      orderPackages: [] // Can be extended for deal packages
    };

    return apiClient.createOrder(orderData);
  }
}

// Export singleton instance
export const orderService = new OrderService();