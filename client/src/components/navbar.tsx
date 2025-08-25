import { ShoppingCart, Receipt, Utensils, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const { setCartOpen, items } = useCartStore();
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);
  const [location] = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 configurable-primary rounded-lg flex items-center justify-center">
                <Utensils className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold configurable-text-primary">LA PIZZA POPOLARE</span>
            </div>
          </Link>
          
          <div className="flex items-center space-x-3">
            {location === "/orders" ? (
              <Link href="/">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Home size={20} />
                  <span className="hidden sm:inline">Main Page</span>
                </Button>
              </Link>
            ) : (
              <Link href="/orders">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Receipt size={20} />
                  <span className="hidden sm:inline">Orders</span>
                </Button>
              </Link>
            )}
            <Button 
              onClick={() => setCartOpen(true)}
              className="flex items-center space-x-2 configurable-primary text-white hover:configurable-primary-hover relative"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 configurable-error text-white min-w-[20px] h-5 flex items-center justify-center text-xs rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
