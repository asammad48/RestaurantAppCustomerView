import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
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
import { useGesture } from '@use-gesture/react';

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

// --- Gesture Enabled Product Component ---
const ProductObject = ({ 
  item, 
  index,
  total,
  isSelected, 
  onSelect,
}: { 
  item: ApiMenuItem; 
  index: number;
  total: number;
  isSelected: boolean; 
  onSelect: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const modelPath = `/models/food_${(item.menuItemId % 3) + 1}.glb`;
  const { size, viewport } = useThree();
  
  // Ref-based state for smooth lerping in useFrame
  const targetPos = useRef(new THREE.Vector3((index - (total - 1) / 2) * 2.5, 0, 0));
  const targetRot = useRef(new THREE.Euler(0, 0, 0));
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  // Handle frame-based smoothing (lerp)
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPos.current, 0.2);
      
      // Smooth rotation
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRot.current.x, 0.2);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.current.y, 0.2);
      
      groupRef.current.scale.lerp(targetScale.current, 0.2);
    }
  });

  // Reset function
  const reset = () => {
    targetPos.current.set((index - (total - 1) / 2) * 2.5, 0, 0);
    targetRot.current.set(0, 0, 0);
    targetScale.current.set(1, 1, 1);
  };

  // Bind gestures
  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], event }) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (!isSelected) {
          onSelect();
        }

        const sensitivity = 0.05; 
        targetPos.current.x += dx * sensitivity;
        targetPos.current.y -= dy * sensitivity;
      },
      onPinch: ({ offset: [d], event }) => {
        event.preventDefault();
        event.stopPropagation();
        const s = Math.max(0.5, Math.min(3, 1 + d / 200));
        targetScale.current.set(s, s, s);
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        event.stopPropagation();
        const s = Math.max(0.3, Math.min(4, targetScale.current.x - dy * 0.002));
        targetScale.current.set(s, s, s);
      },
      onDoubleClick: ({ event }) => {
        event.preventDefault();
        event.stopPropagation();
        reset();
      }
    },
    { 
      drag: { filterTaps: true, threshold: 0 },
      enabled: true,
      eventOptions: { passive: false }
    }
  );

  let gltf: any;
  try {
    gltf = useGLTF(modelPath);
  } catch (err) {}

  const clonedScene = useMemo(() => {
    if (gltf?.scene) return gltf.scene.clone();
    return null;
  }, [gltf?.scene]);

  const price = item.variations?.[0]?.discountedPrice || item.variations?.[0]?.price || 0;
  const discount = item.discount?.value || 0;

  return (
    <group 
      ref={groupRef}
      {...(bind() as any)}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {clonedScene ? (
        <primitive object={clonedScene} />
      ) : (
        <mesh>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color={["#ff4d4d", "#4d79ff", "#4dff88"][item.menuItemId % 3]} />
        </mesh>
      )}
      
      <Html position={[0.6, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
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

      {isSelected && (
        <mesh position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1, 1.2, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};

// --- Main Page Component ---
export default function ARRestaurantMenuPage() {
  const [activeObjectId, setActiveObjectId] = useState<number | null>(null);
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

  const handleRemoveItemFromAR = (id: number) => {
    setArItems(prev => prev.filter(i => i.menuItemId !== id));
    if (activeObjectId === id) setActiveObjectId(null);
  };

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
            
            <gridHelper args={[20, 20, 0xffffff, 0x444444]} position={[0, -1, 0]}>
              <meshBasicMaterial attach="material" transparent opacity={0.2} />
            </gridHelper>

            <Suspense fallback={<mesh position={[0, 0, 0]}><boxGeometry /><meshStandardMaterial color="gray" /></mesh>}>
              {arItems.map((item, index) => (
                <ProductObject 
                  key={item.menuItemId}
                  item={item}
                  index={index}
                  total={arItems.length}
                  isSelected={activeObjectId === item.menuItemId}
                  onSelect={() => setActiveObjectId(activeObjectId === item.menuItemId ? null : item.menuItemId)}
                />
              ))}
            </Suspense>

            <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={15} blur={2.5} far={2} />
          </Canvas>

          {/* Scale UI Controls */}
          {activeObjectId !== null && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto z-50">
              <button 
                className="w-14 h-14 rounded-full bg-red-500/80 backdrop-blur-lg border border-red-400/20 flex items-center justify-center text-white hover:bg-red-500 active:scale-90 transition-all shadow-2xl"
                onClick={() => handleRemoveItemFromAR(activeObjectId)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}

          {!activeObjectId && arItems.length > 0 && (
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
