import React, { useState, useRef, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { 
  ArrowLeft, ShoppingCart, Menu, X, Plus, ChevronUp, ChevronDown, 
  RotateCcw, RotateCw, Trash2, Info, Sun, Moon, Layers, Eye, EyeOff, ShoppingBag, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";
import { useGesture } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Constants ---
interface ARItemState extends ApiMenuItem {
  instanceId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  depthOffset: number;
  showNutritional?: boolean;
}

const SCALE_PRESETS = {
  S: 0.8,
  M: 1.2,
  L: 1.8
};

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

// --- Product Component ---
const ProductObject = ({ 
  item, 
  isSelected, 
  onSelect,
  onUpdate,
  snapToTable,
  showNutritionalInfo,
  onRemove,
  onShowDetails,
  onAddToCart,
  showBottomUI,
  setShowBottomUI
}: { 
  item: ARItemState; 
  isSelected: boolean; 
  onSelect: () => void;
  onUpdate: (updates: Partial<ARItemState>) => void;
  snapToTable: boolean;
  showNutritionalInfo: boolean;
  onRemove: () => void;
  onShowDetails: () => void;
  onAddToCart: () => void;
  showBottomUI: boolean;
  setShowBottomUI: (val: boolean) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const modelPath = item.threeDObject;
  const { camera, size, raycaster } = useThree();
  const planeRef = useRef(new THREE.Plane());

  // Internal lerp refs
  const targetPos = useRef(new THREE.Vector3(...item.position));
  const targetRot = useRef(new THREE.Euler(...item.rotation));
  const targetScale = useRef(new THREE.Vector3(item.scale, item.scale, item.scale));

  useFrame(() => {
    if (groupRef.current) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const pos = new THREE.Vector3(...item.position);
      
      if (snapToTable) {
        pos.y = -0.6;
      }

      const depthOffsetVec = forward.multiplyScalar(-item.depthOffset);
      pos.add(depthOffsetVec);

      targetPos.current.copy(pos);
      targetRot.current.set(...item.rotation);
      targetScale.current.set(item.scale, item.scale, item.scale);

      groupRef.current.position.lerp(targetPos.current, 0.15);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRot.current.x, 0.15);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.current.y, 0.15);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRot.current.z, 0.15);
      groupRef.current.scale.lerp(targetScale.current, 0.15);
    }
  });

  const bind = useGesture(
    {
      onDrag: ({ active, xy: [x, y], event }) => {
        if (!isSelected) {
          onSelect();
          return;
        }
        
        // Prevent default behavior to avoid scrolling/zoom while interacting
        if (event && 'cancelable' in event && event.cancelable && 'preventDefault' in event) {
          (event as any).preventDefault();
        }

        if (active) {
          const ndc = new THREE.Vector2(
            (x / size.width) * 2 - 1,
            -(y / size.height) * 2 + 1
          );

          const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
          planeRef.current.setFromNormalAndCoplanarPoint(normal, groupRef.current!.position);

          raycaster.setFromCamera(ndc, camera);
          const intersectPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(planeRef.current, intersectPoint)) {
            onUpdate({ position: [intersectPoint.x, intersectPoint.y, intersectPoint.z] });
          }
        }
      },
      onPinch: ({ active, offset: [d], event }) => {
        if (!isSelected) return;
        if (event && 'cancelable' in event && event.cancelable && 'preventDefault' in event) {
          (event as any).preventDefault();
        }
        
        if (active) {
          // Clamp scale to 0.5 (min) and 2.5 (max)
          // Pinch gesture offset for scale usually starts from 1.0 or the initial scale
          const newScale = Math.max(0.5, Math.min(2.5, d));
          onUpdate({ scale: newScale });
        }
      }
    },
    {
      drag: { filterTaps: true, threshold: 5 },
      pinch: { scaleBounds: { min: 0.5, max: 2.5 }, from: () => [item.scale, 0] },
      enabled: isSelected
    }
  );

  const { scene } = useGLTF(modelPath || '/models/food_1.glb');
  const clonedScene = useMemo(() => {
    if (scene) {
      const cloned = scene.clone();
      cloned.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.depthWrite = true;
            node.material.transparent = false;
            node.material.side = THREE.DoubleSide;
          }
        }
      });
      
      const box = new THREE.Box3().setFromObject(cloned);
      const sizeVec = new THREE.Vector3();
      box.getSize(sizeVec);
      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      const scale = 2.0 / (maxDim || 1);
      cloned.scale.set(scale, scale, scale);
      
      const center = new THREE.Vector3();
      box.getCenter(center);
      cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      
      return cloned;
    }
    return null;
  }, [scene]);

  return (
    <group 
      ref={groupRef}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <group {...(bind() as any)}>
        {clonedScene ? (
          <primitive object={clonedScene} />
        ) : (
          <mesh>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.2} />
          </mesh>
        )}
      </group>

      {isSelected && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
            <ringGeometry args={[1.2, 1.3, 32]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
          </mesh>
          <pointLight color="#f97316" intensity={2} distance={3} position={[0, 1, 0]} />
        </group>
      )}

      {/* Item-top Buttons */}
      <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'auto' }}>
        <AnimatePresence>
          {isSelected && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
                <Button 
                  size="icon" variant="ghost" 
                  className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/20"
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" variant="ghost" 
                  className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" variant="ghost" 
                  className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowBottomUI(!showBottomUI); 
                  }}
                >
                  {showBottomUI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  size="icon" variant="ghost" 
                  className="h-8 w-8 rounded-full text-orange-500 hover:bg-orange-500/20"
                  onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                >
                  <ShoppingBag className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Html>
    </group>
  );
};

// --- Main Page Component ---
export default function ARRestaurantMenuPage() {
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [arItems, setArItems] = useState<ARItemState[]>([]);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [snapToTable, setSnapToTable] = useState(false);
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeItemDetails, setActiveItemDetails] = useState<ARItemState | null>(null);
  const [showBottomUI, setShowBottomUI] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [, setLocation] = useLocation();
  const { 
    selectedRestaurant, 
    selectedBranch, 
    getCartCount, 
    setCartOpen,
    setLastAddedItem,
    setAddToCartModalOpen
  } = useCartStore();

  const branchId = selectedBranch?.branchId;
  const { data: menuData, isLoading } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  const uniqueCategories = useMemo(() => {
    if (!apiMenuData?.menuItems) return ["all"];
    const cats = apiMenuData.menuItems.map(item => item.categoryName);
    return ["all", ...Array.from(new Set(cats))];
  }, [apiMenuData?.menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (!apiMenuData?.menuItems) return [];
    return apiMenuData.menuItems.filter(item => {
      const matchesCategory = selectedCategory === "all" || item.categoryName === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [apiMenuData?.menuItems, selectedCategory, searchTerm]);

  const handleAddItemToAR = (menuItem: ApiMenuItem) => {
    const newItem: ARItemState = {
      ...menuItem,
      instanceId: Math.random().toString(36).substr(2, 9),
      position: [(arItems.length * 1.5) - 3, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      depthOffset: 0,
    };
    setArItems(prev => [...prev, newItem]);
    setActiveObjectId(newItem.instanceId);
    setCategoryExpanded(false);
  };

  const updateSelectedItem = useCallback((updates: Partial<ARItemState>) => {
    setArItems(prev => prev.map(item => 
      item.instanceId === activeObjectId ? { ...item, ...updates } : item
    ));
  }, [activeObjectId]);

  const handleAutoArrange = () => {
    setArItems(prev => prev.map((item, i) => ({
      ...item,
      position: [(i - (prev.length - 1) / 2) * 2.5, 0, 0],
      rotation: [0, 0, 0],
      depthOffset: 0
    })));
  };

  const selectedItem = useMemo(() => 
    arItems.find(i => i.instanceId === activeObjectId), 
    [arItems, activeObjectId]
  );

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative font-sans text-white select-none">
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
            <ambientLight intensity={lightingMode === 'day' ? 0.7 : 0.2} />
            <spotLight 
              position={[10, 10, 10]} 
              angle={0.15} 
              penumbra={1} 
              intensity={lightingMode === 'day' ? 2 : 5} 
              color={lightingMode === 'day' ? "#ffffff" : "#ffaa44"}
              castShadow 
            />
            <Environment preset={lightingMode === 'day' ? "city" : "apartment"} />
            
            <Suspense fallback={null}>
              {arItems.map((item) => (
                <ProductObject 
                  key={item.instanceId}
                  item={item}
                  isSelected={activeObjectId === item.instanceId}
                  onSelect={() => setActiveObjectId(item.instanceId)}
                  onUpdate={updateSelectedItem}
                  snapToTable={snapToTable}
                  showNutritionalInfo={!!item.showNutritional}
                  showBottomUI={showBottomUI}
                  setShowBottomUI={setShowBottomUI}
                  onRemove={() => {
                    setArItems(prev => prev.filter(i => i.instanceId !== item.instanceId));
                    setActiveObjectId(null);
                  }}
                  onShowDetails={() => {
                    setActiveItemDetails(item);
                    setShowDetailsModal(true);
                  }}
                  onAddToCart={() => {
                    setLastAddedItem(item);
                    setAddToCartModalOpen(true);
                  }}
                />
              ))}
            </Suspense>

            <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={20} blur={2} far={4} />
          </Canvas>

          {/* Controls UI Overlay */}
          <AnimatePresence>
            {activeObjectId && selectedItem && showBottomUI && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute bottom-32 left-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto overflow-hidden"
              >
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-white/40">Arrangement</span>
                    <Button 
                      size="icon" variant="ghost" className="h-6 w-6 text-white/40 hover:text-white"
                      onClick={() => setShowBottomUI(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <Layers className="h-4 w-4 text-white/40" />
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold text-white/40 min-w-[40px]">Depth</span>
                      <Slider 
                        value={[selectedItem.depthOffset]}
                        min={-5} max={5} step={0.1}
                        onValueChange={([v]) => updateSelectedItem({ depthOffset: v })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      variant="outline" size="sm" 
                      className="bg-white/5 border-white/10 text-[10px] h-8"
                      onClick={() => updateSelectedItem({ rotation: [0, 0, 0], scale: 1, depthOffset: 0 })}
                    >
                      RESET
                    </Button>
                    <Button 
                      variant="outline" size="sm" 
                      className={`bg-white/5 border-white/10 text-[10px] h-8 ${snapToTable ? 'bg-orange-500 text-white' : ''}`}
                      onClick={() => setSnapToTable(!snapToTable)}
                    >
                      TABLE
                    </Button>
                    <Button 
                      variant="outline" size="sm" 
                      className="bg-white/5 border-white/10 text-[10px] h-8"
                      onClick={handleAutoArrange}
                    >
                      ARRANGE
                    </Button>
                    <Button 
                      variant="outline" size="sm" 
                      className="bg-white/5 border-white/10 text-[10px] h-8"
                      onClick={() => setLightingMode(lightingMode === 'day' ? 'night' : 'day')}
                    >
                      {lightingMode === 'day' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/40">Scale Presets</span>
                    <div className="flex gap-2">
                      {Object.entries(SCALE_PRESETS).map(([label, val]) => (
                        <button
                          key={label}
                          onClick={() => updateSelectedItem({ scale: val })}
                          className={`w-8 h-8 rounded-lg text-[10px] font-bold border transition-all ${
                            Math.abs(selectedItem.scale - val) < 0.1 
                              ? 'bg-orange-500 border-orange-400 text-white' 
                              : 'bg-white/5 border-white/10 text-white/60'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!activeObjectId && arItems.length > 0 && (
            <div className="absolute bottom-40 text-center px-6 pointer-events-none animate-pulse">
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Tap an item to interact</p>
            </div>
          )}
        </div>

        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <Button 
            variant="ghost" size="icon" 
            className="bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 h-12 w-12 shadow-xl"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-4 z-50 flex flex-col gap-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto w-full">
            <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
              <CollapsibleTrigger asChild>
                <Button className="w-full bg-black/40 backdrop-blur-md text-white border border-white/10 rounded-2xl h-14 flex items-center justify-between px-6 shadow-xl hover:bg-black/60 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500 p-1.5 rounded-lg shadow-lg">
                      <Menu className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-bold">Menu</p>
                      <p className="text-xs font-bold">Add 3D Dishes</p>
                    </div>
                  </div>
                  {categoryExpanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronUp className="h-4 w-4 text-white/40" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl mt-3 p-4 max-h-[50vh] overflow-y-auto shadow-2xl overflow-x-hidden custom-scrollbar flex flex-col gap-4">
                <div className="relative group pointer-events-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-orange-500 transition-colors" />
                  <Input 
                    placeholder="Search dishes..." 
                    className="bg-white/5 border-white/10 pl-10 h-10 rounded-xl text-white placeholder:text-white/20 focus-visible:ring-orange-500/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar pointer-events-auto">
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        selectedCategory === cat 
                          ? "bg-orange-500 border-orange-400 text-white" 
                          : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 pointer-events-auto">
                  {filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => {
                      const price = item.variations?.[0]?.discountedPrice || item.variations?.[0]?.price || 0;
                      return (
                        <button
                          key={item.menuItemId}
                          className="w-full text-left px-5 py-5 rounded-2xl transition-all text-white/80 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white flex flex-col gap-2 group active:scale-[0.98] border border-white/5 hover:border-white/10"
                          onClick={() => handleAddItemToAR(item)}
                        >
                          <div className="flex justify-between items-start w-full">
                            <div className="flex flex-col gap-1 flex-1 pr-4">
                              <span className="text-sm font-bold leading-tight line-clamp-1 group-hover:text-orange-500 transition-colors">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                {item.categoryName}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-black text-orange-500">₹{price}</span>
                              <div className="bg-orange-500/20 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                <Plus className="h-4 w-4 text-orange-500" />
                              </div>
                            </div>
                          </div>
                          
                          {item.description && (
                            <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 font-medium italic">
                              {item.description}
                            </p>
                          )}

                          {item.allergens && item.allergens.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.allergens.map((allergen, idx) => (
                                <span key={idx} className="text-[9px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase tracking-tighter">
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-white/20 gap-3 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                      <Search className="h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium tracking-wide">No matching dishes found</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      <CartModal />
      <AddToCartModal />
      <PaymentModal />
      {activeItemDetails && (
        <MenuItemDetailModal 
          item={activeItemDetails}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
