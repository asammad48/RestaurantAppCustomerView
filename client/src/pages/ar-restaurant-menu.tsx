import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart, Menu, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";
import { getImageUrl } from "@/lib/config";

// --- Components ---

interface PlusButtonProps {
  itemId: number;
  setActiveItem: (id: number | null) => void;
  activeItem: number | null;
}

function PlusButton({ itemId, setActiveItem, activeItem }: PlusButtonProps) {
  const isActive = activeItem === itemId;
  return (
    <Button
      size="icon"
      className={`h-6 w-6 rounded-lg border-none transition-all ${
        isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        setActiveItem(isActive ? null : itemId);
      }}
    >
      <Plus className="h-3 w-3 text-white" />
    </Button>
  );
}

interface CloseButtonProps {
  setActiveItem: (id: number | null) => void;
}

function CloseButton({ setActiveItem }: CloseButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/20 hover:bg-black/40 text-white"
      onPointerDown={(e) => {
        e.stopPropagation();
        setActiveItem(null);
      }}
    >
      <X className="h-3 w-3" />
    </Button>
  );
}

interface ItemDetailCardProps {
  item: ApiMenuItem;
  setActiveItem: (id: number | null) => void;
  onAddToCart: () => void;
}

function ItemDetailCard({ item, setActiveItem, onAddToCart }: ItemDetailCardProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md rounded-2xl p-3 flex flex-col justify-between border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <CloseButton setActiveItem={setActiveItem} />
      <div className="overflow-hidden">
        <h2 className="text-sm font-bold leading-tight mb-1 pr-6 truncate">{item.name}</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-400 font-bold text-sm">₹{item.variations?.[0]?.discountedPrice || item.variations?.[0]?.price}</span>
          {(item.discount?.value || 0) > 0 && (
            <span className="text-[10px] bg-red-500 px-1 rounded font-bold">-{item.discount?.value}%</span>
          )}
        </div>
        <p className="text-[10px] text-white/60 line-clamp-2 leading-tight">
          {item.description || "Delicious menu item prepared fresh for you."}
        </p>
      </div>
      <Button 
        size="sm" 
        className="w-full bg-green-500 hover:bg-green-600 text-xs h-7"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart();
        }}
      >
        Add to Cart
      </Button>
    </div>
  );
}

// --- Main Page Component ---

export default function ARRestaurantMenuPage() {
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  
  const {
    selectedRestaurant,
    selectedBranch,
    getCartCount,
    setCartOpen,
    setLastAddedItem,
    setAddToCartModalOpen,
  } = useCartStore();

  const cartTotalItems = getCartCount();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filteredItems, setFilteredItems] = useState<ApiMenuItem[]>([]);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [detailItem, setDetailItem] = useState<ApiMenuItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const getUrlParams = () => new URLSearchParams(window.location.search);
  const getBranchId = () => {
    const urlParams = getUrlParams();
    const urlBranchId = urlParams.get('branchId');
    if (urlBranchId) return parseInt(urlBranchId, 10);
    return selectedBranch?.branchId || null;
  };

  const branchId = getBranchId();

  const { data: menuData } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
    staleTime: Infinity,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  useEffect(() => {
    if (!apiMenuData?.menuItems) return;
    
    const items = apiMenuData.menuItems.filter((item: ApiMenuItem) =>
      selectedCategory === "all" || item.categoryName === selectedCategory
    );
    setFilteredItems(items);
  }, [selectedCategory, apiMenuData]);

  const categories = ["all", ...Array.from(new Set(apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || []))];

  const getPrice = (item: ApiMenuItem) => {
    if (item.variations && item.variations.length > 0) {
      return item.variations[0].discountedPrice || item.variations[0].price;
    }
    return 0;
  };

  const getDiscount = (item: ApiMenuItem) => {
    if (item.discount?.value) return item.discount.value;
    const variations = item.variations || [];
    const variation = variations[0];
    if (variation?.discountedPrice && variation?.price && variation.price > variation.discountedPrice) {
      return Math.round(((variation.price - variation.discountedPrice) / variation.price) * 100);
    }
    return 0;
  };

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerHeight < window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setCameraPermission("granted");
      } catch (error) {
        console.error("Camera permission denied:", error);
        setCameraPermission("denied");
      }
    };
    requestPermissions();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative font-sans text-white">
      <Navbar />
      
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-slate-900 flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-white/60">AR Placeholder View</p>
          <p className="text-[10px] text-white/40 mt-1">Interactive menu system active</p>
        </div>

        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <h1 className="text-sm font-semibold truncate max-w-[150px]">
              {selectedRestaurant?.name || "Menu"}
            </h1>
          </div>
        </div>

        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {cartTotalItems}
              </span>
            )}
          </Button>
        </div>

        <div className="absolute bottom-24 left-0 right-0 px-4 z-50 flex flex-col gap-4 pointer-events-none">
          <div className="flex justify-between items-end">
            <div className="pointer-events-auto">
              <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="bg-black/60 backdrop-blur-md text-white border border-white/10 rounded-2xl px-4 py-6 flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-lg">
                      <Menu className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold">Categories</p>
                      <p className="text-sm font-bold capitalize">{selectedCategory}</p>
                    </div>
                    {categoryExpanded ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl mt-2 p-2 max-h-[300px] overflow-y-auto w-48">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        selectedCategory === cat ? "bg-orange-500 text-white" : "text-white/70 hover:bg-white/10"
                      }`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryExpanded(false);
                      }}
                    >
                      <span className="capitalize">{cat}</span>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar pointer-events-auto">
            {filteredItems.map((item) => (
              <div 
                key={item.menuItemId}
                className="relative flex-shrink-0 w-32 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col items-center gap-2 group transition-all"
              >
                {activeItem === item.menuItemId && (
                  <ItemDetailCard 
                    item={item} 
                    setActiveItem={setActiveItem} 
                    onAddToCart={() => {
                      setLastAddedItem(item);
                      setAddToCartModalOpen(true);
                    }}
                  />
                )}

                <div 
                  className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-800 cursor-pointer"
                  onClick={() => {
                    setDetailItem(item);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <img 
                    src={getImageUrl(item.picture)} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {getDiscount(item) > 0 && (
                    <div className="absolute top-1 left-1 bg-red-500 text-[8px] font-bold px-1.5 py-0.5 rounded">
                      {getDiscount(item)}% OFF
                    </div>
                  )}
                </div>
                <div className="w-full text-center px-1">
                  <p className="text-[10px] font-bold truncate mb-1">{item.name}</p>
                  <p className="text-[10px] font-bold text-orange-400">₹{getPrice(item)}</p>
                </div>
                
                <PlusButton 
                  itemId={item.menuItemId} 
                  activeItem={activeItem} 
                  setActiveItem={setActiveItem} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <CartModal />
      <AddToCartModal />
      <PaymentModal />
      {detailItem && (
        <MenuItemDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          item={detailItem}
        />
      )}
    </div>
  );
}
