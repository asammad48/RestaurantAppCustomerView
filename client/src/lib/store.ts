import { create } from 'zustand';
import { MenuItem, ApiMenuItem, ApiDeal } from './mock-data';
import { Branch } from '../types/branch';

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
}

interface CartStore {
  items: CartItem[];
  lastAddedItem: MenuItem | ApiMenuItem | ApiDeal | null;
  serviceType: ServiceType;
  selectedRestaurant: Restaurant | null;
  selectedBranch: Branch | null;
  userLocation: string;
  deliveryDetails: DeliveryDetails | null;
  takeawayDetails: TakeawayDetails | null;
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
  splitBillMode: 'equality' | 'items';
  addItem: (item: MenuItem | ApiMenuItem | ApiDeal, variation?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
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
  setSplitBillModalOpen: (open: boolean) => void;
  setReviewModalOpen: (open: boolean) => void;
  setOrderConfirmationOpen: (open: boolean) => void;
  setAiEstimatorModalOpen: (open: boolean) => void;
  setSplitBillMode: (mode: 'equality' | 'items') => void;
  setLastAddedItem: (item: MenuItem | ApiMenuItem | ApiDeal | null) => void;
  setServiceType: (type: ServiceType) => void;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  setSelectedBranch: (branch: Branch | null) => void;
  setUserLocation: (location: string) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  lastAddedItem: null,
  serviceType: 'qr',
  selectedRestaurant: null,
  selectedBranch: null,
  userLocation: '',
  deliveryDetails: null,
  takeawayDetails: null,
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
  splitBillMode: 'equality',
  
  addItem: (item: MenuItem | ApiMenuItem | ApiDeal, variation?: string) => {
    const itemId = 'id' in item ? item.id : 'menuItemId' in item ? item.menuItemId.toString() : item.dealId.toString();
    const existingItemIndex = get().items.findIndex(
      (cartItem) => cartItem.id === itemId && cartItem.variation === variation
    );
    
    if (existingItemIndex >= 0) {
      set((state) => ({
        items: state.items.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ),
      }));
    } else {
      set((state) => ({
        items: [...state.items, { 
          ...item, 
          id: itemId, 
          quantity: 1, 
          variation,
          price: 'price' in item ? item.price : ('variations' in item && item.variations && item.variations.length > 0) ? item.variations[0].price : 0
        } as CartItem],
      }));
    }
  },
  
  removeItem: (itemId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));
  },
  
  updateQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  },
  
  clearCart: () => {
    set({ items: [] });
  },
  
  getCartTotal: () => {
    return get().items.reduce((total, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
      return total + price * item.quantity;
    }, 0);
  },
  
  getCartCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
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
  setSplitBillModalOpen: (open: boolean) => set({ isSplitBillModalOpen: open }),
  setReviewModalOpen: (open: boolean) => set({ isReviewModalOpen: open }),
  setOrderConfirmationOpen: (open: boolean) => set({ isOrderConfirmationOpen: open }),
  setAiEstimatorModalOpen: (open: boolean) => set({ isAiEstimatorModalOpen: open }),
  setSplitBillMode: (mode: 'equality' | 'items') => set({ splitBillMode: mode }),
  setLastAddedItem: (item: MenuItem | ApiMenuItem | ApiDeal | null) => set({ lastAddedItem: item }),
  setServiceType: (type: ServiceType) => set({ serviceType: type }),
  setSelectedRestaurant: (restaurant: Restaurant | null) => set({ selectedRestaurant: restaurant }),
  setSelectedBranch: (branch: Branch | null) => set({ selectedBranch: branch }),
  setUserLocation: (location: string) => set({ userLocation: location }),
}));
