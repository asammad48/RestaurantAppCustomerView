import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { ArrowLeft, ShoppingCart, Menu, X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";

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

// --- Independent Product Component ---
const ProductObject = ({ 
  item, 
  index,
  total,
  isSelected, 
  onSelect 
}: { 
  item: ApiMenuItem; 
  index: number;
  total: number;
  isSelected: boolean; 
  onSelect: () => void;
}) => {
  const meshRef = useRef<THREE.Group>(null!);
  const [scale, setScale] = useState(1);
  const modelPath = `/models/food_${(item.menuItemId % 3) + 1}.glb`;
  
  // Calculate fixed position in world space
  const position: [number, number, number] = [(index - (total - 1) / 2) * 2.5, 0, 0];

  // Independent rotation in game loop
  useFrame((_state, delta) => {
    if (isSelected && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
  };

  const handleWheel = (e: any) => {
    if (isSelected && e.ctrlKey) {
      e.stopPropagation();
      const delta = e.deltaY * -0.001;
      setScale(prev => Math.min(Math.max(0.5, prev + delta), 2.5));
    }
  };

  const gltf = useGLTF(modelPath);
  const clonedScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  const price = item.variations?.[0]?.discountedPrice || item.variations?.[0]?.price || 0;
  const discount = item.discount?.value || 0;

  return (
    <group 
      position={position} 
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
    >
      <primitive 
        ref={meshRef} 
        object={clonedScene}
        scale={scale}
      />
      
      {/* UI Tags attached to object */}
      <Html position={[0.6, 1.2, 0]} center>
        <div className="flex flex-col gap-1 pointer-events-none select-none">
          <span className="bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10">
            ₹{price}
          </span>
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
              {discount}% OFF
            </span>
          )}
        </div>
      </Html>

      {/* Independent Scale Controls */}
      {isSelected && (
        <Html position={[0, -1.2, 0]} center>
          <div className="flex gap-2 pointer-events-auto">
            <button 
              className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center text-black text-xl font-bold hover:bg-gray-100 transition-transform active:scale-95"
              onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.2, 2.5)); }}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              className="w-10 h-10 rounded-full bg-red-500 shadow-xl flex items-center justify-center text-white text-xl font-bold hover:bg-red-600 transition-transform active:scale-95"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Main Page Component ---
export default function ARRestaurantMenuPage() {
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
  const branchId = selectedBranch?.branchId;

  const { data: menuData } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  const handleAddItemToAR = (item: ApiMenuItem) => {
    setArItems(prev => {
      if (prev.find(i => i.menuItemId === item.menuItemId)) return prev;
      return [...prev, item];
    });
    setCategoryExpanded(false);
  };

  const selectedPos = useMemo(() => {
    if (activeObject === null) return new THREE.Vector3(0, 0, 0);
    const index = arItems.findIndex(i => i.menuItemId === activeObject);
    if (index === -1) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3((index - (arItems.length - 1) / 2) * 2.5, 0, 0);
  }, [activeObject, arItems]);

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative font-sans text-white">
      <Navbar />
      
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black">
          <CameraFeed />
          
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 2, 8], fov: 50 }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            gl={{ alpha: true, antialias: true }}
          >
            <ambientLight intensity={0.7} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={1} />
            <Environment preset="city" />

            <Suspense fallback={null}>
              {arItems.map((item, index) => (
                <ProductObject 
                  key={item.menuItemId}
                  item={item}
                  index={index}
                  total={arItems.length}
                  isSelected={activeObject === item.menuItemId}
                  onSelect={() => setActiveObject(activeObject === item.menuItemId ? null : item.menuItemId)}
                />
              ))}
            </Suspense>

            <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={15} blur={2.5} far={2} />

            <OrbitControls
              makeDefault
              target={selectedPos}
              enablePan={false}
              minDistance={3}
              maxDistance={15}
              dampingFactor={0.05}
              autoRotate={!activeObject}
              autoRotateSpeed={0.5}
            />
          </Canvas>

          {/* Interaction Instructions */}
          {!activeObject && arItems.length > 0 && (
            <div className="absolute bottom-40 text-center px-6 pointer-events-none animate-pulse">
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Tap an item to interact</p>
            </div>
          )}
        </div>

        {/* Top Controls */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 h-12 w-12"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 h-12 flex items-center">
            <h1 className="text-sm font-semibold truncate max-w-[150px]">
              {selectedRestaurant?.name || "AR Menu"}
            </h1>
          </div>
        </div>

        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 h-12 w-12 relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-6 w-6" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-black/40">
                {cartTotalItems}
              </span>
            )}
          </Button>
        </div>

        {/* Menu Picker */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-50 flex flex-col gap-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto w-full">
            <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
              <CollapsibleTrigger asChild>
                <Button className="w-full bg-black/60 backdrop-blur-md text-white border border-white/10 rounded-2xl h-16 flex items-center justify-between px-6 shadow-2xl">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500 p-2 rounded-xl">
                      <Menu className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold">Virtual Menu</p>
                      <p className="text-sm font-bold">Add dishes to see in 3D</p>
                    </div>
                  </div>
                  {categoryExpanded ? <ChevronDown className="h-5 w-5 text-white/40" /> : <ChevronUp className="h-5 w-5 text-white/40" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl mt-3 p-3 max-h-[40vh] overflow-y-auto shadow-2xl overflow-x-hidden">
                <div className="grid grid-cols-1 gap-2">
                  {apiMenuData?.menuItems?.map((item) => (
                    <button
                      key={item.menuItemId}
                      className="w-full text-left px-4 py-4 rounded-xl text-sm font-bold transition-all text-white/70 hover:bg-white/10 hover:text-white flex justify-between items-center group active:scale-[0.98]"
                      onClick={() => handleAddItemToAR(item)}
                    >
                      <span className="truncate flex-1">{item.name}</span>
                      <Plus className="h-5 w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      <CartModal />
      <AddToCartModal />
      <PaymentModal />
    </div>
  );
}
