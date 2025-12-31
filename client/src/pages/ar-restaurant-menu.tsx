import * as THREE from "three";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useState, Suspense, useRef } from "react";
import { ArrowLeft, ShoppingCart, Menu, X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";
import { getImageUrl } from "@/lib/config";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

// --- Camera Feed Component ---

function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover"
      style={{ filter: "brightness(0.7)" }}
    />
  );
}

// --- 3D Object Component ---

interface Product3DProps {
  model: string;
  position: [number, number, number];
  onSelect: () => void;
}

function Product3D({ model, position, onSelect }: Product3DProps) {
  const ref = useRef<THREE.Group>(null);
  const [rotation, setRotation] = useState(0);
  const isDragging = useRef(false);
  const lastPointerX = useRef(0);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, rotation, 0.1);
    }
  });

  try {
    const gltf = useGLTF(model);
    return (
      <primitive 
        ref={ref}
        object={gltf.scene.clone()} 
        position={position} 
        onPointerDown={(e: any) => {
          e.stopPropagation();
          isDragging.current = true;
          lastPointerX.current = e.clientX;
          onSelect();
        }}
        onPointerMove={(e: any) => {
          if (isDragging.current) {
            e.stopPropagation();
            const deltaX = e.clientX - lastPointerX.current;
            setRotation(prev => prev + deltaX * 0.007);
            lastPointerX.current = e.clientX;
          }
        }}
        onPointerUp={(e: any) => {
          if (isDragging.current) {
            e.stopPropagation();
            isDragging.current = false;
          }
        }}
        onPointerOut={(e: any) => {
          if (isDragging.current) {
            e.stopPropagation();
            isDragging.current = false;
          }
        }}
      />
    );
  } catch (error) {
    console.error(`Error loading model: ${model}`, error);
    return (
      <mesh position={position} onPointerDown={onSelect}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }
}

// --- UI Components for 3D Objects ---

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
  onRemove: (id: number) => void;
}

function ObjectDetailCard({ object, setActiveObject, onRemove }: ObjectDetailCardProps) {
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
      <div className="flex gap-2">
        <Button 
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold h-12 rounded-xl"
          onClick={() => onRemove(object.menuItemId)}
        >
          Remove
        </Button>
        <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-xl">
          Add to Order
        </Button>
      </div>
    </div>
  );
}

export default function ARRestaurantMenuPage() {
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  const [activeObject, setActiveObject] = useState<number | null>(null);
  const [arItems, setArItems] = useState<ApiMenuItem[]>([]);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [, setLocation] = useLocation();

  const {
    selectedRestaurant,
    selectedBranch,
    getCartCount,
    setCartOpen,
  } = useCartStore();

  const cartTotalItems = getCartCount();

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

  const handleAddItemToAR = (item: ApiMenuItem) => {
    setArItems(prev => {
      if (prev.find(i => i.menuItemId === item.menuItemId)) return prev;
      return [...prev, item];
    });
    setCategoryExpanded(false);
  };

  const handleRemoveItemFromAR = (id: number) => {
    setArItems(prev => prev.filter(i => i.menuItemId !== id));
    setActiveObject(null);
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative font-sans text-white">
      <Navbar />
      
      <div className="flex-1 relative overflow-hidden">
        {/* AR / 3D Scene Area */}
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black">
          <CameraFeed />
          
          <Canvas
            camera={{ position: [0, 2, 6], fov: 50 }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            gl={{ alpha: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} />
            <Suspense fallback={null}>
              {arItems.map((item, index) => (
                <Product3D 
                  key={`${item.menuItemId}-${index}`}
                  model={`/models/food_${(item.menuItemId % 3) + 1}.glb`}
                  position={[(index - (arItems.length - 1) / 2) * 2.5, 0, 0]} 
                  onSelect={() => setActiveObject(item.menuItemId)} 
                />
              ))}
            </Suspense>
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              rotateSpeed={0.5}
              zoomSpeed={0.8}
              minDistance={3}
              maxDistance={10}
              enableDamping={true}
              dampingFactor={0.1}
            />
          </Canvas>

          {/* Active Detail Card Overlay */}
          {activeObject && (
            <div className="absolute inset-0 pointer-events-none z-50">
              <ObjectDetailCard 
                object={arItems.find(o => o.menuItemId === activeObject)!} 
                setActiveObject={setActiveObject} 
                onRemove={handleRemoveItemFromAR}
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
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold">Menu</p>
                      <p className="text-sm font-bold capitalize">Tap to add items</p>
                    </div>
                    {categoryExpanded ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl mt-2 p-2 max-h-[300px] overflow-y-auto w-64">
                  {apiMenuData?.menuItems?.map((item) => (
                    <button
                      key={item.menuItemId}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors text-white/70 hover:bg-white/10 flex justify-between items-center"
                      onClick={() => handleAddItemToAR(item)}
                    >
                      <span className="truncate flex-1">{item.name}</span>
                      <Plus className="h-4 w-4 text-orange-500 ml-2" />
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
    </div>
  );
}
