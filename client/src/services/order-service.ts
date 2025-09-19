import { apiClient, OrderRequest, OrderResponse, ApiResponse, DeliveryDetails, SplitBill } from '@/lib/api-client';
import { CartItem, ServiceType, DeliveryDetails as StoreDeliveryDetails, TakeawayDetails as StoreTakeawayDetails } from '@/lib/store';
import { getDeviceId } from '@/lib/device-id';

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

  // Convert cart items to order items format (only regular menu items)
  private convertCartItemsToOrderItems(cartItems: CartItem[]): any[] {
    // Filter out deals and packages - only process regular menu items
    const regularItems = cartItems.filter(item => !item.dealId && !item.isDeal);
    
    return regularItems.map(item => {
      const orderItem: any = {
        menuItemId: parseInt(item.menuItemId?.toString() || item.id),
        quantity: item.quantity,
      };

      // Add variant ID if exists - prefer stored selectedVariantId
      if (item.selectedVariantId) {
        orderItem.variantId = item.selectedVariantId;
      } else if (item.variations && item.variations.length > 0 && item.variation) {
        // Fallback to lookup by name if selectedVariantId is not available
        const selectedVariation = item.variations.find(v => v.name === item.variation);
        if (selectedVariation) {
          orderItem.variantId = selectedVariation.id;
        }
      }

      // Add modifiers if exists and selected with quantity > 0
      if (item.customization?.selectedModifiers) {
        const selectedModifiers = Object.entries(item.customization.selectedModifiers)
          .filter(([modifierId, quantity]) => quantity > 0)
          .map(([modifierId, quantity]) => ({
            modifierId: parseInt(modifierId),
            quantity: quantity
          }));
        
        if (selectedModifiers.length > 0) {
          orderItem.modifiers = selectedModifiers;
        }
      }

      // Add customizations if exists and selected
      if (item.customization?.selectedCustomizations) {
        const selectedCustomizations = Object.entries(item.customization.selectedCustomizations)
          .map(([customizationId, optionId]) => ({
            customizationId: parseInt(customizationId),
            optionId: parseInt(optionId)
          }));
        
        if (selectedCustomizations.length > 0) {
          orderItem.customizations = selectedCustomizations;
        }
      }

      return orderItem;
    });
  }

  // Convert cart items to order packages format (only deals and menu packages)
  private convertCartItemsToOrderPackages(cartItems: CartItem[]): any[] {
    // Filter to only get deals and packages
    const dealItems = cartItems.filter(item => item.dealId || item.isDeal);
    
    return dealItems.map(item => {
      const orderPackage: any = {
        menuPackageId: parseInt(item.dealId?.toString() || item.id),
        quantity: item.quantity,
      };

      return orderPackage;
    });
  }

  // Convert store delivery details to API format
  private convertDeliveryDetails(storeDetails: StoreDeliveryDetails | null): DeliveryDetails | null {
    if (!storeDetails) return null;
    
    return {
      fullName: storeDetails.customerName,
      email: storeDetails.customerEmail,
      phoneNumber: storeDetails.customerPhone,
      deliveryAddress: storeDetails.deliveryAddress,
      streetAddress: storeDetails.deliveryAddress, // Using same as deliveryAddress
      apartment: storeDetails.apartmentUnit || '',
      deliveryInstruction: storeDetails.deliveryInstructions || '',
      prefferedDeliveryTime: storeDetails.preferredTime ? 
        new Date(storeDetails.preferredTime).toISOString() : 
        new Date().toISOString(),
      longitude: 0, // This should be set from location picker
      latitude: 0   // This should be set from location picker
    };
  }

  // Convert store takeaway details to API pickup details format
  private convertPickupDetails(storeDetails: StoreTakeawayDetails | null): any | null {
    if (!storeDetails) return null;
    
    return {
      name: storeDetails.customerName,
      email: storeDetails.customerEmail,
      phoneNumber: storeDetails.customerPhone,
      pickupInstruction: storeDetails.specialInstructions || '',
      preferredPickupTime: storeDetails.preferredTime ? 
        new Date(storeDetails.preferredTime).toISOString() : 
        new Date().toISOString()
    };
  }

  // Create order with dynamic configuration
  async createOrder({
    cartItems,
    serviceType,
    branchId,
    locationId,
    username,
    tipAmount = 0,
    deliveryDetails = null,
    takeawayDetails = null,
    splitBills = null,
    specialInstruction = '',
    allergenIds = [],
    token = null
  }: {
    cartItems: CartItem[];
    serviceType: ServiceType;
    branchId: number;
    locationId?: number;
    username: string;
    tipAmount?: number;
    deliveryDetails?: StoreDeliveryDetails | null;
    takeawayDetails?: StoreTakeawayDetails | null;
    splitBills?: SplitBill[] | null;
    specialInstruction?: string;
    allergenIds?: number[] | null;
    token?: string | null;
  }): Promise<ApiResponse<OrderResponse>> {
    // Use proper device ID instead of hardcoded 'WEB_APP'
    const deviceId = getDeviceId();
    
    const orderData: OrderRequest = {
      branchId,
      locationId: serviceType === 'dine-in' ? (locationId || 0) : 0,
      deviceInfo: deviceId,
      tipAmount,
      username,
      orderType: this.getOrderType(serviceType),
      orderItems: this.convertCartItemsToOrderItems(cartItems),
      orderPackages: this.convertCartItemsToOrderPackages(cartItems),
      deliveryDetails: serviceType === 'delivery' ? this.convertDeliveryDetails(deliveryDetails) : null,
      pickupDetails: serviceType === 'takeaway' ? this.convertPickupDetails(takeawayDetails) : null,
      splitBills: splitBills || null,
      specialInstruction: specialInstruction || '',
      allergenIds: allergenIds && allergenIds.length > 0 ? allergenIds : null
    };

    // Use authenticated request if token is provided
    if (token) {
      return apiClient.createOrderWithAuth(orderData, token);
    } else {
      return apiClient.createOrder(orderData);
    }
  }
}

// Export singleton instance
export const orderService = new OrderService();