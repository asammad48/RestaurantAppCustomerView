import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Utensils, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import FoodCard from "@/components/food-card";
import Footer from "@/components/footer";
import FloatingButtons from "@/components/floating-buttons";
import ThemeSwitcher from "@/components/theme-switcher";
import { Order, MenuItem } from "@shared/schema";
import { useCartStore } from "@/lib/store";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import CartModal from "@/components/modals/cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import SplitBillModal from "@/components/modals/split-bill-modal";
import ReviewModal from "@/components/modals/review-modal";
import ServiceRequestModal from "@/components/modals/service-request-modal";
import OrderConfirmationModal from "@/components/modals/order-confirmation-modal";
import { Link } from "wouter";

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const { setCartOpen, setPaymentModalOpen } = useCartStore();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const liveOrders = orders.filter(order => order.status !== 'completed');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const recommendedItems = menuItems.filter(item => item.isRecommended || (item.discount && item.discount > 0)).slice(0, 4);

  // Live orders data
  const mockOrders = [
    {
      id: '1',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'pending',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    },
    {
      id: '2',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'pending',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    },
    {
      id: '3',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'pending',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    }
  ];

  // History orders data
  const historyOrders = [
    {
      id: 'h1',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'completed',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    },
    {
      id: 'h2',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'completed',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    },
    {
      id: 'h3',
      orderNumber: '#1247',
      time: 'Today, 2:30 PM',
      status: 'completed',
      items: [
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' },
        { name: '1 pasta', quantity: 2, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=80&h=80&fit=crop&crop=center', price: 'Rs.18.00' }
      ],
      grandTotal: '$30.00'
    }
  ];



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Food Banner */}
      <div className="relative">
        <div className="h-32 configurable-primary relative overflow-hidden">
          <div className="absolute inset-0 flex">
            <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop&crop=center" alt="Pizza slice" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=300&h=200&fit=crop&crop=center" alt="Pasta dish" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=200&fit=crop&crop=center" alt="Salad bowl" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop&crop=center" alt="Pancakes" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=200&fit=crop&crop=center" alt="Burger" className="w-1/6 h-full object-cover opacity-80" />
            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&crop=center" alt="Salad" className="w-1/6 h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 configurable-primary/70"></div>
        </div>
        
        {/* Table Indicator */}
        <div className="absolute bottom-0 left-0 right-0 configurable-primary text-white py-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Utensils size={20} />
            <span className="font-medium">You're at: TABLE #5</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Orders Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-6">My Orders</h2>
          
          {/* Order Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-6 py-3 font-medium border-b-2 ${
                activeTab === 'live' 
                  ? 'border-black text-black' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Order
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium border-b-2 ${
                activeTab === 'history' 
                  ? 'border-black text-black' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </div>

          {/* Live Orders */}
          {activeTab === 'live' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {mockOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">{order.time}</p>
                      <p className="font-semibold text-gray-900">Order {order.orderNumber}</p>
                    </div>
                    <Badge className="configurable-secondary configurable-primary-text px-3 py-1 rounded-full text-sm">
                      {order.status}
                    </Badge>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-10 h-10 object-cover rounded-lg" 
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{item.price}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mb-4 text-right">
                    <p className="font-bold text-gray-900">Total: {order.grandTotal}</p>
                  </div>

                  {/* Order Progress Stepper */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center w-full">
                        {/* Order Placed - Active */}
                        <div className="w-8 h-8 configurable-primary rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 h-0.5 configurable-primary mx-2"></div>
                        
                        {/* Preparing - Active */}
                        <div className="w-8 h-8 configurable-primary rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                        
                        {/* Ready - Inactive */}
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                        
                        {/* Delivered - Inactive */}
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span className="text-center">Order Placed</span>
                      <span className="text-center">Preparing</span>
                      <span className="text-center">Ready</span>
                      <span className="text-center">Delivered</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full configurable-primary text-white hover:configurable-primary-hover rounded-full py-3"
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    Proceed to payment
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {historyOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">{order.time}</p>
                      <p className="font-semibold text-gray-900">Order {order.orderNumber}</p>
                    </div>
                    <Badge className="configurable-secondary configurable-primary-text px-3 py-1 rounded-full text-sm">
                      preparing
                    </Badge>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-10 h-10 object-cover rounded-lg" 
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{item.price}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mb-4 text-right">
                    <p className="font-bold text-gray-900">Total: {order.grandTotal}</p>
                  </div>

                  {/* Order Completed Status */}
                  <div className="configurable-secondary border configurable-border rounded-lg p-4 text-center">
                    <p className="configurable-primary-text font-medium text-lg">Order Completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended For You */}
        {recommendedItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-6">Recommended For You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedItems.slice(0, 4).map((item) => (
                <FoodCard key={item.id} item={item} variant="grid" />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <FloatingButtons />
      <ThemeSwitcher />
      
      {/* Modals */}
      <AddToCartModal />
      <CartModal />
      <PaymentModal />
      <SplitBillModal />
      <ReviewModal />
      <ServiceRequestModal />
      <OrderConfirmationModal />
    </div>
  );
}
