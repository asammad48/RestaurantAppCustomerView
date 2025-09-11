// Order History API types based on the provided response structure

export interface OrderModifier {
  id: number;
  modifierId: number;
  modifierName: string;
  price: number;
  quantity: number;
}

export interface OrderCustomization {
  id: number;
  customizationId: number;
  customizationName: string;
  price: number;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  variantId: number | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  discount?: number;
  variantName: string | null;
  personServing: string | null;
  orderItemModifiers: OrderModifier[];
  orderItemCustomizations: OrderCustomization[];
  subMenuItems?: OrderSubMenuItem[];
}

export interface OrderSubMenuItem {
  id: number;
  subMenuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  discount?: number;
}

export interface OrderDeliveryDetails {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  deliveryAddress: string;
  streetAddress: string;
  apartment: string;
  deliveryInstruction: string;
  prefferedDeliveryTime: string;
  longitude: number;
  latitude: number;
}

export interface SplitBill {
  id: number;
  splitType: number;
  price: number;
  mobileNumber: string;
  itemName: string;
}

export interface OrderPackage {
  id: number;
  packageId: number;
  packageName: string;
  price: number;
  quantity: number;
  discount?: number;
  menuItems?: OrderPackageItem[];
  subItems?: OrderPackageSubItem[];
}

export interface OrderPackageItem {
  id: number;
  menuItemId: number;
  itemName: string;
  quantity: number;
  variants?: OrderPackageVariant[];
  modifiers?: OrderModifier[];
}

export interface OrderPackageSubItem {
  id: number;
  subMenuItemId: number;
  itemName: string;
  quantity: number;
}

export interface OrderPackageVariant {
  id: number;
  variantId: number;
  variantName: string;
  quantity: number;
}

export interface OrderPickupDetails {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  pickupInstruction: string;
  prefferedPickupTime: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  branchId: number;
  branchName: string;
  locationId: number | null;
  locationName?: string | null;
  userId: number | null;
  username: string;
  deviceInfo: string;
  serviceCharges: number;
  deliveryCharges: number;
  orderAmount: number;
  discountedAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  orderStatus: string;
  orderType: string;
  createdAt: string;
  orderDeliveryDetails: OrderDeliveryDetails | null;
  orderPickupDetails: OrderPickupDetails | null;
  allergens: string[] | null;
  orderItems: OrderItem[];
  orderPackages: OrderPackage[];
  splitBills: SplitBill[];
}

export interface OrderHistoryResponse {
  items: Order[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface OrderHistoryParams {
  userId?: number;
  deviceId: string;
  pageNumber?: number;
  pageSize?: number;
}

// Order status enum for better type safety
export enum OrderStatus {
  Pending = 1,
  Confirmed = 2,
  Preparing = 3,
  Ready = 4,
  Delivered = 5,
  Cancelled = 6
}

// Order type enum
export enum OrderType {
  DineIn = 1,
  Takeaway = 2,
  Delivery = 3
}

// Split bill type enum
export enum SplitType {
  Equal = 1,
  ByItem = 2,
  Custom = 3
}