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

export default function ARRestaurantMenuPage() {
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  const [isMobileDevice] = useState(() => window.innerWidth < 768);

  const {
    selectedRestaurant,
    selectedBranch,
    addItem,
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
  const [, setLocation] = useLocation();

  const getUrlParams = () => new URLSearchParams(window.location.search);
  const getBranchId = () => {
    const urlParams = getUrlParams();
    const urlBranchId = urlParams.get('branchId');
    if (urlBranchId) return parseInt(urlBranchId, 10);
    return selectedBranch?.branchId || null;
  };

  const branchId = getBranchId();

  const { data: menuData, isLoading } = useQuery({
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

  const categoryList = apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [];
  const categories = ["all", ...Array.from(new Set(categoryList))];

  const getPrice = (item: ApiMenuItem) => {
    if (item.variations && item.variations.length > 0) {
      return item.variations[0].discountedPrice || item.variations[0].price;
    }
    return 0;
  };

  const getDiscount = (item: ApiMenuItem) => {
    if (item.discount?.value) {
      return item.discount.value;
    }
    const variations = item.variations || [];
    const variation = variations[0];
    if (variation?.discountedPrice && variation?.price && variation.price > variation.discountedPrice) {
      return Math.round(((variation.price - variation.discountedPrice) / variation.price) * 100);
    }
    return 0;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerHeight < window.innerWidth);
    };
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
        {cameraPermission === "granted" ? (
          <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center p-6">
              <p className="text-xl font-medium mb-2">Camera active (Placeholder)</p>
              <p className="text-slate-400">AR functionality would render here.</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 p-6 text-center">
            {cameraPermission === "requesting" ? (
              <p className="text-xl">Requesting camera access...</p>
            ) : (
              <div>
                <p className="text-xl text-red-400 mb-4">Camera access denied</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}
          </div>
        )}

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
                className="flex-shrink-0 w-32 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                onClick={() => {
                  setDetailItem(item);
                  setIsDetailModalOpen(true);
                }}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-800">
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
                <Button 
                  size="icon" 
                  className="h-6 w-6 rounded-lg bg-green-500 hover:bg-green-600 border-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLastAddedItem(item);
                    setAddToCartModalOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
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
