import { ShoppingCart, Utensils, Home, User, LogOut, History, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useCartStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { Link, useLocation } from "wouter";
import { getImageUrl, getProfilePictureUrl } from "@/lib/config";
import NotificationTray from "./notification-tray";
import UpdateProfileModal from "./modals/update-profile-modal";
import { useState } from "react";

export default function Navbar() {
  const { setCartOpen, items, selectedBranch } = useCartStore();
  const { 
    isAuthenticated, 
    user, 
    setLoginModalOpen, 
    setPreviousPath,
    logout 
  } = useAuthStore();
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);
  const [location] = useLocation();
  const [isUpdateProfileModalOpen, setIsUpdateProfileModalOpen] = useState(false);

  const handleLoginClick = () => {
    setPreviousPath(location);
    setLoginModalOpen(true);
  };

  // Determine if this is a branch-specific page
  const isBranchSpecificPage = location === '/reservation-detail' || location === '/restaurant-menu' || location === '/orders';
  
  // Show branch details only on branch-specific pages
  const showBranchDetails = isBranchSpecificPage && selectedBranch;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              {showBranchDetails && selectedBranch?.branchLogo ? (
                <img 
                  src={getImageUrl(selectedBranch.branchLogo)} 
                  alt="Branch Logo" 
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 configurable-primary rounded-lg flex items-center justify-center">
                  <Utensils className="text-white" size={20} />
                </div>
              )}
              <span className="text-lg sm:text-xl font-bold configurable-text-primary truncate max-w-[150px] sm:max-w-none">
                {showBranchDetails ? selectedBranch?.branchName : "LA PIZZA POPOLARE"}
              </span>
            </div>
          </Link>
          
          {/* Right side - Cart, Notifications, and Authentication grouped together */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Button 
              onClick={() => setCartOpen(true)}
              className="flex items-center space-x-1 sm:space-x-2 configurable-primary text-white hover:configurable-primary-hover relative px-2 sm:px-3 md:px-4"
              size="sm"
            >
              <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 configurable-error text-white min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] flex items-center justify-center text-xs rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </Button>

            {/* Notification Tray - Only show when authenticated */}
            {isAuthenticated && <NotificationTray />}

            {/* Authentication Section */}
            {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100 px-2 sm:px-3 md:px-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    {user?.profilePicture ? (
                      getProfilePictureUrl(user.profilePicture)?.startsWith('http') ? (
                        <img 
                          src={getProfilePictureUrl(user.profilePicture)!} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{user.profilePicture}</span>
                      )
                    ) : (
                      <User size={16} className="text-white" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user?.name || user?.fullName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href="/order-history">
                  <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
                    <History size={16} />
                    <span>Order History</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/reservations">
                  <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer" data-testid="link-reservations">
                    <Calendar size={16} />
                    <span>Reservations</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem 
                  onClick={() => setIsUpdateProfileModalOpen(true)}
                  className="flex items-center space-x-2 cursor-pointer"
                  data-testid="button-update-profile"
                >
                  <Settings size={16} />
                  <span>Update Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={logout}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={handleLoginClick}
              variant="outline" 
              className="flex items-center space-x-2 px-2 sm:px-3 md:px-4"
            >
              <User size={16} />
              <span className="hidden sm:inline">Login</span>
            </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Update Profile Modal */}
      <UpdateProfileModal 
        isOpen={isUpdateProfileModalOpen}
        onClose={() => setIsUpdateProfileModalOpen(false)}
      />
    </nav>
  );
}
