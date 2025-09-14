import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, ApiMenuItem, ApiDeal } from './mock-data';
import { Branch } from '../types/branch';
import { OrderResponse } from './api-client';

export type ServiceType = 'dine-in' | 'delivery' | 'takeaway' | 'reservation' | 'qr';

export interface DeliveryDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  apartmentUnit?: string;
  deliveryInstructions?: string;
  preferredTime?: string;
}

export interface TakeawayDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialInstructions?: string;
  preferredTime?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  minimumOrder: string;
  address: string;
  distance: string;
  isOpen: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: string | number;
  category?: string;
  categoryName?: string;
  image?: string;
  picture?: string;
  // Variant specific fields for enhanced cart support
  selectedVariantId?: number;
  variantName?: string;
  variantPrice?: number;
  menuPicture?: string;
  packagePicture?: string;
  discount?: number | { id: number; name: string; value: number; endDate: string; } | null;
  isRecommended?: boolean;
  isDeal?: boolean;
  quantity: number;
  variation?: string;
  variations?: { id: number; name: string; price: number; }[];
  modifiers?: { id: number; name: string; price: number; }[];
  customizations?: {
    id: number;
    name: string;
    options: { id: number; name: string; price: number; }[];
  }[];
  customization?: {
    toppings?: { [key: string]: number };
    flavour?: string;
    sauce?: string;
    crust?: string;
    instructions?: string;
    selectedModifiers?: { [key: string]: number };
    selectedCustomizations?: { [key: string]: string };
  };
  // Deal specific fields
  dealId?: number;
  menuItemId?: number;
  dealEndDate?: string;
  menuItems?: { menuItemId: number; name: string; }[];
  subMenuItems?: { subMenuItemId: number; name: string; quantity: number; }[];
  // Branch info for multi-branch support
  branchId: number;
  branchName?: string;
}

interface CartStore {
  items: CartItem[];
  cartBranchId: number | null; // Track which restaurant's items are in cart
  lastAddedItem: MenuItem | ApiMenuItem | ApiDeal | null;
  serviceType: ServiceType;
  selectedRestaurant: Restaurant | null;
  selectedBranch: Branch | null;
  branchCurrency: string; // Current branch currency code
  userLocation: string;
  deliveryDetails: DeliveryDetails | null;
  takeawayDetails: TakeawayDetails | null;
  specialInstructions: string;
  selectedAllergens: number[]; // Array of selected allergen IDs
  isCartOpen: boolean;
  isServiceModalOpen: boolean;
  isServiceSelectionOpen: boolean;
  initialServiceOpen: boolean;
  isAddToCartModalOpen: boolean;
  isDeliveryDetailsModalOpen: boolean;
  isTakeawayDetailsModalOpen: boolean;
  isPaymentModalOpen: boolean;
  isSplitBillModalOpen: boolean;
  isReviewModalOpen: boolean;
  isOrderConfirmationOpen: boolean;
  isAiEstimatorModalOpen: boolean;
  orderResponse: OrderResponse | null;
  splitBillMode: 'equality' | 'items';
  addItem: (item: MenuItem | ApiMenuItem | ApiDeal, variation?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  clearCartForBranch: (branchId: number) => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getItemsForBranch: (branchId: number) => CartItem[];
  getBranchSummary: () => { branchId: number; branchName: string; count: number; total: number; }[];
  getUniqueBranchCount: () => number;
  setCartOpen: (open: boolean) => void;
  setServiceModalOpen: (open: boolean) => void;
  setServiceSelectionOpen: (open: boolean) => void;
  setInitialServiceOpen: (open: boolean) => void;
  setAddToCartModalOpen: (open: boolean) => void;
  setDeliveryDetailsModalOpen: (open: boolean) => void;
  setTakeawayDetailsModalOpen: (open: boolean) => void;
  setPaymentModalOpen: (open: boolean) => void;
  setDeliveryDetails: (details: DeliveryDetails | null) => void;
  setTakeawayDetails: (details: TakeawayDetails | null) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSelectedAllergens: (allergens: number[]) => void;
  setSplitBillModalOpen: (open: boolean) => void;
  setReviewModalOpen: (open: boolean) => void;
  setOrderConfirmationOpen: (open: boolean) => void;
  setAiEstimatorModalOpen: (open: boolean) => void;
  setSplitBillMode: (mode: 'equality' | 'items') => void;
  setLastAddedItem: (item: MenuItem | ApiMenuItem | ApiDeal | null) => void;
  setServiceType: (type: ServiceType) => void;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  setSelectedBranch: (branch: Branch | null) => void;
  setBranchCurrency: (currency: string) => void;
  setUserLocation: (location: string) => void;
  setOrderResponse: (response: OrderResponse | null) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartBranchId: null,
      lastAddedItem: null,
      serviceType: 'qr',
      selectedRestaurant: null,
      selectedBranch: null,
      branchCurrency: 'PKR',
      userLocation: '',
      deliveryDetails: null,
      takeawayDetails: null,
      specialInstructions: '',
      selectedAllergens: [],
      isCartOpen: false,
      isServiceModalOpen: false,
      isServiceSelectionOpen: false,
      initialServiceOpen: false,
      isAddToCartModalOpen: false,
      isDeliveryDetailsModalOpen: false,
      isTakeawayDetailsModalOpen: false,
      isPaymentModalOpen: false,
      isSplitBillModalOpen: false,
      isReviewModalOpen: false,
      isOrderConfirmationOpen: false,
      isAiEstimatorModalOpen: false,
      orderResponse: null,
      splitBillMode: 'equality',
  
  addItem: (item: MenuItem | ApiMenuItem | ApiDeal, variation?: string) => {
    const state = get();
    const itemId = 'id' in item ? item.id : 'menuItemId' in item ? item.menuItemId.toString() : item.dealId.toString();
    
    console.debug('🛒 Cart Debug: Adding item to cart', {
      itemName: item.name,
      itemId,
      variation,
      hasVariantInfo: 'selectedVariantId' in item,
      itemDetails: item
    });
    
    // No longer clear cart - allow multiple branches
    if (state.selectedBranch && state.cartBranchId === null) {
      // Set cart branch ID when adding first item
      console.debug('🛒 Cart Debug: Setting cart branch ID', state.selectedBranch.branchId);
      set({ cartBranchId: state.selectedBranch.branchId });
    }
    
    // Create a unique key that includes variant information and branch
    const currentBranchId = state.selectedBranch?.branchId;
    if (!currentBranchId) {
      console.error('No branch selected when adding item to cart');
      return;
    }
    
    const itemVariantKey = `${itemId}-${variation || 'default'}-${currentBranchId}`;
    const existingItemIndex = state.items.findIndex(
      (cartItem) => {
        const cartVariantKey = `${cartItem.id}-${cartItem.variation || 'default'}-${cartItem.branchId}`;
        return cartVariantKey === itemVariantKey;
      }
    );
    
    if (existingItemIndex >= 0) {
      console.debug('🛒 Cart Debug: Item exists, incrementing quantity', {
        existingIndex: existingItemIndex,
        currentQuantity: state.items[existingItemIndex].quantity
      });
      set((state) => ({
        items: state.items.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ),
      }));
    } else {
      // Create cart item with variant details if available
      const cartItem: CartItem = {
        ...item,
        id: itemId,
        quantity: 1,
        variation,
        branchId: currentBranchId,
        branchName: state.selectedBranch?.branchName,
        // Use variant price if available, otherwise fall back to base price
        price: ('selectedVariantId' in item && 'variantPrice' in item && item.variantPrice) 
          ? item.variantPrice 
          : 'price' in item ? item.price 
          : ('variations' in item && item.variations && item.variations.length > 0) 
            ? item.variations[0].price 
            : 0,
        // Include variant details if present
        ...(('selectedVariantId' in item && 'variantName' in item && 'variantPrice' in item) && {
          selectedVariantId: item.selectedVariantId,
          variantName: item.variantName,
          variantPrice: item.variantPrice,
        }),
        // Include image details
        ...(('menuPicture' in item) && { menuPicture: item.menuPicture }),
        ...(('packagePicture' in item) && { packagePicture: item.packagePicture })
      } as CartItem;
      
      console.debug('🛒 Cart Debug: Adding new item to cart', {
        cartItem: {
          name: cartItem.name,
          price: cartItem.price,
          variantName: cartItem.variantName,
          variantPrice: cartItem.variantPrice,
          selectedVariantId: cartItem.selectedVariantId
        }
      });
      
      set((state) => ({
        items: [...state.items, cartItem],
      }));
    }
    
    // Debug current cart state after adding
    const newState = get();
    console.debug('🛒 Cart Debug: Cart state after adding item', {
      totalItems: newState.items.length,
      totalCost: newState.getCartTotal(),
      items: newState.items.map(i => ({ 
        name: i.name, 
        quantity: i.quantity, 
        price: i.price,
        variation: i.variation,
        variantName: i.variantName
      }))
    });
  },
  
  removeItem: (itemId: string) => {
    set((state) => ({
      items: state.items.filter((item) => {
        // Support both simple ID and composite key
        const itemCompositeKey = `${item.id}-${item.variation || 'default'}-${item.branchId}`;
        return item.id !== itemId && itemCompositeKey !== itemId;
      }),
    }));
  },
  
  updateQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    
    set((state) => ({
      items: state.items.map((item) => {
        // Support both simple ID and composite key
        const itemCompositeKey = `${item.id}-${item.variation || 'default'}-${item.branchId}`;
        return (item.id === itemId || itemCompositeKey === itemId) 
          ? { ...item, quantity } 
          : item;
      }),
    }));
  },
  
  clearCart: () => {
    set({ items: [], cartBranchId: null, selectedAllergens: [] });
  },

  clearCartForBranch: (branchId: number) => {
    set((state) => ({
      items: state.items.filter(item => item.branchId !== branchId)
    }));
  },
  
  getCartTotal: () => {
    return get().items.reduce((total, item) => {
      const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
      
      // Calculate modifier price
      let modifierPrice = 0;
      if (item.customization?.selectedModifiers && item.modifiers) {
        modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
          const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
          return modTotal + (modifier ? modifier.price * qty : 0);
        }, 0);
      }
      
      return total + (basePrice + modifierPrice) * item.quantity;
    }, 0);
  },
  
  getCartCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },

  getItemsForBranch: (branchId: number) => {
    return get().items.filter(item => item.branchId === branchId);
  },

  getBranchSummary: () => {
    const items = get().items;
    const branches = new Map<number, { branchId: number; branchName: string; count: number; total: number; }>();
    
    items.forEach(item => {
      const branchId = item.branchId;
      const branchName = item.branchName || 'Unknown Branch';
      
      if (!branches.has(branchId)) {
        branches.set(branchId, { branchId, branchName, count: 0, total: 0 });
      }
      
      const branch = branches.get(branchId)!;
      branch.count += item.quantity;
      
      const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
      let modifierPrice = 0;
      if (item.customization?.selectedModifiers && item.modifiers) {
        modifierPrice = Object.entries(item.customization.selectedModifiers).reduce((modTotal, [modifierId, qty]) => {
          const modifier = item.modifiers?.find(mod => mod.id.toString() === modifierId);
          return modTotal + (modifier ? modifier.price * qty : 0);
        }, 0);
      }
      
      branch.total += (basePrice + modifierPrice) * item.quantity;
    });
    
    return Array.from(branches.values());
  },

  getUniqueBranchCount: () => {
    const branchIds = new Set(get().items.map(item => item.branchId));
    return branchIds.size;
  },
  
  setCartOpen: (open: boolean) => set({ isCartOpen: open }),
  setServiceModalOpen: (open: boolean) => set({ isServiceModalOpen: open }),
  setServiceSelectionOpen: (open: boolean) => set({ isServiceSelectionOpen: open }),
  setInitialServiceOpen: (open: boolean) => set({ initialServiceOpen: open }),
  setAddToCartModalOpen: (open: boolean) => set({ isAddToCartModalOpen: open }),
  setDeliveryDetailsModalOpen: (open: boolean) => set({ isDeliveryDetailsModalOpen: open }),
  setTakeawayDetailsModalOpen: (open: boolean) => set({ isTakeawayDetailsModalOpen: open }),
  setPaymentModalOpen: (open: boolean) => set({ isPaymentModalOpen: open }),
  setDeliveryDetails: (details: DeliveryDetails | null) => set({ deliveryDetails: details }),
  setTakeawayDetails: (details: TakeawayDetails | null) => set({ takeawayDetails: details }),
  setSpecialInstructions: (instructions: string) => set({ specialInstructions: instructions }),
  setSelectedAllergens: (allergens: number[]) => set({ selectedAllergens: allergens }),
  setSplitBillModalOpen: (open: boolean) => set({ isSplitBillModalOpen: open }),
  setReviewModalOpen: (open: boolean) => set({ isReviewModalOpen: open }),
  setOrderConfirmationOpen: (open: boolean) => set({ isOrderConfirmationOpen: open }),
  setAiEstimatorModalOpen: (open: boolean) => set({ isAiEstimatorModalOpen: open }),
  setSplitBillMode: (mode: 'equality' | 'items') => set({ splitBillMode: mode }),
  setLastAddedItem: (item: MenuItem | ApiMenuItem | ApiDeal | null) => set({ lastAddedItem: item }),
  setServiceType: (type: ServiceType) => set({ serviceType: type }),
  setSelectedRestaurant: (restaurant: Restaurant | null) => set({ selectedRestaurant: restaurant }),
  setSelectedBranch: (branch: Branch | null) => set({ selectedBranch: branch }),
  setBranchCurrency: (currency: string) => set({ branchCurrency: currency }),
  setUserLocation: (location: string) => set({ userLocation: location }),
  setOrderResponse: (response: OrderResponse | null) => set({ orderResponse: response }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        cartBranchId: state.cartBranchId,
        serviceType: state.serviceType,
        selectedRestaurant: state.selectedRestaurant,
        selectedBranch: state.selectedBranch,
        userLocation: state.userLocation,
        deliveryDetails: state.deliveryDetails,
        takeawayDetails: state.takeawayDetails,
        specialInstructions: state.specialInstructions,
        selectedAllergens: state.selectedAllergens,
      }),
    }
  )
);
