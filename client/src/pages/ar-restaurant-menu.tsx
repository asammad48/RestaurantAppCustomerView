import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart, Menu, X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";
import { getImageUrl } from "@/lib/config";

// --- UI Components for 3D Objects ---

interface PlusButtonProps {
  objectId: number;
  activeObject: number | null;
  setActiveObject: (id: number | null) => void;
}

function PlusButton({ objectId, activeObject, setActiveObject }: PlusButtonProps) {
  const isActive = activeObject === objectId;
  return (
    <button
      className={`absolute -top-4 -right-4 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all z-10 ${
        isActive ? 'bg-orange-600 scale-110' : 'bg-orange-500 hover:bg-orange-600'
      }`}
      onPointerDown={(e) => {
        e.stopPropagation();
        setActiveObject(isActive ? null : objectId);
      }}
      style={{ touchAction: 'manipulation' }}
    >
      <Plus className="w-5 h-5" />
    </button>
  );
}

interface CloseButtonProps {
  setActiveObject: (id: number | null) => void;
}

function CloseButton({ setActiveObject }: CloseButtonProps) {
  return (
    <button
      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors z-20"
      onPointerDown={(e) => {
        e.stopPropagation();
        setActiveObject(null);
      }}
      style={{ touchAction: 'manipulation' }}
    >
      <X className="w-5 h-5" />
    </button>
  );
}

interface ObjectDetailCardProps {
  object: ApiMenuItem;
  setActiveObject: (id: number | null) => void;
}

function ObjectDetailCard({ object, setActiveObject }: ObjectDetailCardProps) {
  const price = object.variations?.[0]?.discountedPrice || object.variations?.[0]?.price || 0;
  const discount = object.discount?.value || 0;

  return (
    <div className="absolute bottom-0 left-0 w-full bg-white text-slate-900 p-4 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
      <div className="flex justify-between items-start mb-2 pr-10">
        <h2 className="text-lg font-bold truncate leading-tight">{object.name}</h2>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl font-black text-orange-600">₹{price}</span>
        {discount > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
            -{discount}%
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
        {object.description || "Fresh and delicious menu item prepared with the finest ingredients."}
      </p>
      <CloseButton setActiveObject={setActiveObject} />
      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-xl">
        Add to Order
      </Button>
    </div>
  );
}

export default function ARRestaurantMenuPage() {
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  const [activeObject, setActiveObject] = useState<number | null>(null);

  const {
    selectedRestaurant,
    selectedBranch,
    getCartCount,
    setCartOpen,
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
    // For this UI requirement, we focus on the first 3 items as "3D objects"
    setFilteredItems(items);
  }, [selectedCategory, apiMenuData]);

  // We'll treat the first 3 items as our "3D objects" for this specific task
  const objects3D = filteredItems.slice(0, 3);

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
        {/* AR / 3D Scene Area */}
        <div className="absolute inset-0 z-0 bg-slate-900 flex flex-col items-center justify-center">
          {/* Representative 3D Scene with the 3 objects */}
          <div className="relative w-full h-full flex items-center justify-around px-10">
            {objects3D.map((obj, index) => {
              const price = getPrice(obj);
              const discount = getDiscount(obj);
              
              return (
                <div 
                  key={obj.menuItemId} 
                  className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 border-2 transition-all duration-500 flex flex-col items-center justify-center p-2 group pointer-events-auto cursor-pointer ${
                    activeObject === obj.menuItemId ? 'border-orange-500 ring-4 ring-orange-500/20 scale-110' : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ 
                    marginTop: index === 1 ? '-40px' : '40px',
                    perspective: '1000px',
                    transform: `translateZ(0) rotateX(10deg)`
                  }}
                  onPointerDown={() => setActiveObject(obj.menuItemId)}
                >
                  <img 
                    src={getImageUrl(obj.picture)} 
                    alt={obj.name}
                    className="w-full h-full object-cover rounded-xl shadow-lg"
                  />
                  
                  {/* Plus Button */}
                  <PlusButton 
                    objectId={obj.menuItemId} 
                    activeObject={activeObject} 
                    setActiveObject={setActiveObject} 
                  />

                  {/* Price & Discount Tags (Always Visible) */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center whitespace-nowrap bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                    <span className="text-xs font-black">₹{price}</span>
                    {discount > 0 && (
                      <span className="text-[10px] font-bold text-red-400">-{discount}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Detail Card Overlay */}
          {activeObject && (
            <div className="absolute inset-0 pointer-events-none z-50">
              <ObjectDetailCard 
                object={objects3D.find(o => o.menuItemId === activeObject)!} 
                setActiveObject={setActiveObject} 
              />
            </div>
          )}

          <div className="absolute bottom-40 text-center px-6 pointer-events-none">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">3D Interactive Menu</p>
          </div>
        </div>

        {/* Back and Cart Controls */}
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

        {/* Categories Bar */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-50 flex flex-col gap-4 pointer-events-none">
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
