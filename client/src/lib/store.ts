import { create } from 'zustand';
import { MenuItem } from './mock-data';

export type ServiceType = 'dine-in' | 'delivery' | 'takeaway' | 'reservation';

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

export interface CartItem extends MenuItem {
  quantity: number;
  variation?: string;
  customization?: {
    toppings?: { [key: string]: number };
    flavour?: string;
    sauce?: string;
    crust?: string;
    instructions?: string;
  };
}

interface CartStore {
  items: CartItem[];
  lastAddedItem: MenuItem | null;
  serviceType: ServiceType;
  selectedRestaurant: Restaurant | null;
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
  splitBillMode: 'equality' | 'items';
  addItem: (item: MenuItem, variation?: string) => void;
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
  setSplitBillMode: (mode: 'equality' | 'items') => void;
  setLastAddedItem: (item: MenuItem | null) => void;
  setServiceType: (type: ServiceType) => void;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  setUserLocation: (location: string) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  lastAddedItem: null,
  serviceType: 'dine-in',
  selectedRestaurant: null,
  userLocation: '',
  deliveryDetails: null,
  takeawayDetails: null,
  isCartOpen: false,
  isServiceModalOpen: false,
  isServiceSelectionOpen: false,
  initialServiceOpen: true,
  isAddToCartModalOpen: false,
  isDeliveryDetailsModalOpen: false,
  isTakeawayDetailsModalOpen: false,
  isPaymentModalOpen: false,
  isSplitBillModalOpen: false,
  isReviewModalOpen: false,
  isOrderConfirmationOpen: false,
  splitBillMode: 'equality',
  
  addItem: (item: MenuItem, variation?: string) => {
    const existingItemIndex = get().items.findIndex(
      (cartItem) => cartItem.id === item.id && cartItem.variation === variation
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
        items: [...state.items, { ...item, quantity: 1, variation }],
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
      return total + parseFloat(item.price) * item.quantity;
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
  setSplitBillMode: (mode: 'equality' | 'items') => set({ splitBillMode: mode }),
  setLastAddedItem: (item: MenuItem | null) => set({ lastAddedItem: item }),
  setServiceType: (type: ServiceType) => set({ serviceType: type }),
  setSelectedRestaurant: (restaurant: Restaurant | null) => set({ selectedRestaurant: restaurant }),
  setUserLocation: (location: string) => set({ userLocation: location }),
}));
