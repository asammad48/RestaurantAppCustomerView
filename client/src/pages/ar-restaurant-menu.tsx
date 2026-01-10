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
  RotateCcw, RotateCw, Trash2, Info, Sun, Moon, Layers, Eye, EyeOff, ShoppingBag, Search, Minus, Camera, RefreshCcw, Image as ImageIcon, Palette
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
function CameraFeed({ facingMode }: { facingMode: "user" | "environment" }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [facingMode]);

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
  setShowBottomUI,
  primaryColor
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
  primaryColor?: string;
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const modelPath = item.threeDObject;
  const { camera, gl, raycaster } = useThree();
  const planeRef = useRef(new THREE.Plane());

  const bind = useGesture(
    {
      onDrag: ({ active, xy: [x, y], event }) => {
        if (!isSelected) onSelect();
        
        if (event && 'cancelable' in event && event.cancelable) {
          event.preventDefault();
        }

        if (active) {
          const rect = gl.domElement.getBoundingClientRect();
          const ndc = new THREE.Vector2(
            ((x - rect.left) / rect.width) * 2 - 1,
            -(((y - rect.top) / rect.height) * 2 - 1)
          );

          const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
          const basePos = new THREE.Vector3(...item.position);
          if (snapToTable) basePos.y = -0.6;
          
          planeRef.current.setFromNormalAndCoplanarPoint(normal, basePos);

          raycaster.setFromCamera(ndc, camera);
          const intersectPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(planeRef.current, intersectPoint)) {
            onUpdate({ position: [intersectPoint.x, intersectPoint.y, intersectPoint.z] });
          }
        }
      },
      onPinch: ({ active, offset: [s], event }) => {
        if (!active) return;
        if (!isSelected) onSelect();
        if (event && 'cancelable' in event && event.cancelable) {
          event.preventDefault();
        }
        
        const newScale = THREE.MathUtils.clamp(s, 0.5, 2.5);
        onUpdate({ scale: newScale });
      }
    },
    {
      target: gl.domElement,
      eventOptions: { passive: false },
      drag: { filterTaps: true, threshold: 5 },
      pinch: { from: () => [item.scale, 0], scaleBounds: { min: 0.5, max: 2.5 } },
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

  useFrame(() => {
    if (groupRef.current) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const pos = new THREE.Vector3(...item.position);
      
      if (snapToTable) {
        pos.y = -0.6;
      }

      const depthOffsetVec = forward.multiplyScalar(-item.depthOffset);
      pos.add(depthOffsetVec);

      const tPos = new THREE.Vector3(...item.position);
      const tRot = new THREE.Euler(...item.rotation);
      const tScale = new THREE.Vector3(item.scale, item.scale, item.scale);

      groupRef.current.position.lerp(pos, 0.15);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tRot.x, 0.15);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, tRot.y, 0.15);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, tRot.z, 0.15);
      groupRef.current.scale.lerp(tScale, 0.15);
    }
  });

  return (
    <group 
      ref={groupRef}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <group>
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
            <meshBasicMaterial color={primaryColor || "#16a34a"} transparent opacity={0.8} />
          </mesh>
          <pointLight color={primaryColor || "#16a34a"} intensity={2} distance={3} position={[0, 1, 0]} />
        </group>
      )}

      {/* Item-top Buttons */}
      <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <AnimatePresence>
          {isSelected && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
              style={{ pointerEvents: 'auto' }}
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowBottomUI(!showBottomUI); 
                  }}
                >
                  {showBottomUI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  size="icon" variant="ghost" 
                  className="h-8 w-8 rounded-full hover:bg-white/20"
                  style={{ color: primaryColor || '#16a34a' }}
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [bgConfig, setBgConfig] = useState<{ type: 'camera' | 'color' | 'image', value: string }>({ type: 'camera', value: 'environment' });
  
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
          {bgConfig.type === 'camera' ? (
            <CameraFeed facingMode={bgConfig.value as "user" | "environment"} />
          ) : bgConfig.type === 'color' ? (
            <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: bgConfig.value }} />
          ) : (
            <img src={bgConfig.value} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
          )}
          
        <div 
          className="absolute inset-0"
          style={{
            touchAction: "none",
            overscrollBehavior: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
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
                  primaryColor={selectedBranch?.primaryColor}
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
        </div>

          {/* Controls UI Overlay */}
          <AnimatePresence>
            {activeObjectId && selectedItem && showBottomUI && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute bottom-32 left-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto overflow-hidden"
              >
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl space-y-3 max-w-sm mx-auto w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Arrangement</span>
                    <Button 
                      size="icon" variant="ghost" className="h-5 w-5 text-white/40 hover:text-white"
                      onClick={() => setShowBottomUI(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Scale</span>
                        <span className="text-[8px] font-mono text-white/60">{selectedItem.scale.toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" size="sm" 
                          className="flex-1 bg-white/5 border-white/10 text-white h-7 text-[9px]"
                          onClick={() => updateSelectedItem({ scale: Math.max(0.1, selectedItem.scale - 0.1) })}
                        >
                          <Minus className="h-2.5 w-2.5 mr-1" /> SHRINK
                        </Button>
                        <Button 
                          variant="outline" size="sm" 
                          className="flex-1 bg-white/5 border-white/10 text-white h-7 text-[9px]"
                          onClick={() => updateSelectedItem({ scale: Math.min(3, selectedItem.scale + 0.1) })}
                        >
                          <Plus className="h-2.5 w-2.5 mr-1" /> ENLARGE
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Rotation</span>
                        <div className="flex gap-1">
                          <span className="text-[8px] font-mono text-white/40">Y:{(selectedItem.rotation[1] * 180 / Math.PI).toFixed(0)}°</span>
                          <span className="text-[8px] font-mono text-white/40">X:{(selectedItem.rotation[0] * 180 / Math.PI).toFixed(0)}°</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" size="icon" 
                            className="h-6 flex-1 bg-white/5 border-white/10 text-white p-0"
                            onClick={() => updateSelectedItem({ rotation: [selectedItem.rotation[0], selectedItem.rotation[1] - 0.2, selectedItem.rotation[2]] })}
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="outline" size="icon" 
                            className="h-6 flex-1 bg-white/5 border-white/10 text-white p-0"
                            onClick={() => updateSelectedItem({ rotation: [selectedItem.rotation[0], selectedItem.rotation[1] + 0.2, selectedItem.rotation[2]] })}
                          >
                            <RotateCw className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" size="icon" 
                            className="h-6 flex-1 bg-white/5 border-white/10 text-white p-0"
                            onClick={() => updateSelectedItem({ rotation: [selectedItem.rotation[0] + 0.2, selectedItem.rotation[1], selectedItem.rotation[2]] })}
                          >
                            <ChevronUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button 
                            variant="outline" size="icon" 
                            className="h-6 flex-1 bg-white/5 border-white/10 text-white p-0"
                            onClick={() => updateSelectedItem({ rotation: [selectedItem.rotation[0] - 0.2, selectedItem.rotation[1], selectedItem.rotation[2]] })}
                          >
                            <ChevronDown className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Button 
                      variant="outline" size="sm" 
                      className="bg-white/5 border-white/10 text-[8px] h-6 px-1"
                      onClick={() => updateSelectedItem({ rotation: [0, 0, 0], scale: 1, depthOffset: 0 })}
                    >
                      RESET
                    </Button>
                    <Button 
                      variant="outline" size="sm" 
                      className={`bg-white/5 border-white/10 text-[8px] h-6 px-1 ${snapToTable ? 'text-white' : ''}`}
                      style={snapToTable ? { backgroundColor: selectedBranch?.primaryColor || '#16a34a' } : {}}
                      onClick={() => setSnapToTable(!snapToTable)}
                    >
                      TABLE
                    </Button>
                    <Button 
                      variant="outline" size="sm" 
                      className="bg-white/5 border-white/10 text-[8px] h-6 px-1"
                      onClick={handleAutoArrange}
                    >
                      ARRANGE
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Presets</span>
                      <div className="flex gap-1">
                        {Object.entries(SCALE_PRESETS).map(([label, val]) => (
                          <Button 
                            key={label}
                            variant="outline" size="sm" 
                            className={`bg-white/5 border-white/10 text-[8px] h-5 w-5 p-0 ${Math.abs(selectedItem.scale - val) < 0.1 ? 'text-white' : 'text-white/60'}`}
                            style={Math.abs(selectedItem.scale - val) < 0.1 ? { backgroundColor: selectedBranch?.primaryColor || '#16a34a', borderColor: selectedBranch?.primaryColor || '#16a34a' } : {}}
                            onClick={() => updateSelectedItem({ scale: val })}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="outline" size="sm" 
                        className="bg-white/5 border-white/10 text-[8px] h-5 px-1.5"
                        onClick={() => setLightingMode(lightingMode === 'day' ? 'night' : 'day')}
                      >
                        {lightingMode === 'day' ? <Sun className="h-2.5 w-2.5 mr-1" /> : <Moon className="h-2.5 w-2.5 mr-1" />}
                        {lightingMode.toUpperCase()}
                      </Button>
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

        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" size="icon" 
                className="bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 h-12 w-12 shadow-xl hover:bg-black/80 transition-all"
              >
                {bgConfig.type === 'camera' ? <Camera className="h-6 w-6" /> : bgConfig.type === 'color' ? <Palette className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 text-white w-56 p-2 rounded-2xl shadow-2xl">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Environment</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBgConfig({ type: 'camera', value: 'environment' })} className="rounded-lg gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <Camera className="h-4 w-4" /> Back Camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBgConfig({ type: 'camera', value: 'user' })} className="rounded-lg gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <Camera className="h-4 w-4 rotate-180" /> Front Camera
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Solid Colors</DropdownMenuLabel>
              <div className="grid grid-cols-4 gap-1 p-1">
                {['#1a1a1a', '#2e2e2e', '#3d3d3d', selectedBranch?.primaryColor || '#16a34a'].map(color => (
                  <button 
                    key={color}
                    className="h-8 rounded-md border border-white/10 transition-transform active:scale-90"
                    style={{ backgroundColor: color }}
                    onClick={() => setBgConfig({ type: 'color', value: color })}
                  />
                ))}
              </div>

              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Table Scenes</DropdownMenuLabel>
              <div className="grid grid-cols-1 gap-1 p-1">
                {[
                  { name: 'Modern Wood', path: '/attached_assets/stock_images/restaurant_table_top_56b7c559.jpg' },
                  { name: 'Elegant Setup', path: '/attached_assets/stock_images/restaurant_table_top_a6a979fc.jpg' },
                  { name: 'Rustic Table', path: '/attached_assets/stock_images/restaurant_table_top_9bd071c7.jpg' }
                ].map(table => (
                  <button 
                    key={table.path}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 text-xs transition-colors group"
                    onClick={() => setBgConfig({ type: 'image', value: table.path })}
                  >
                    <div className="h-10 w-16 rounded border border-white/10 overflow-hidden">
                      <img src={table.path} className="h-full w-full object-cover" alt={table.name} />
                    </div>
                    <span className="group-hover:text-white text-white/70">{table.name}</span>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" size="icon" 
            className="bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 h-12 w-12 shadow-xl hover:bg-black/80 transition-all"
            onClick={() => {
              setArItems([]);
              setActiveObjectId(null);
            }}
          >
            <RefreshCcw className="h-6 w-6" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-4 z-50 flex flex-col gap-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md mx-auto w-full">
            <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
              <CollapsibleTrigger asChild>
                <Button className="w-full bg-black/40 backdrop-blur-md text-white border border-white/10 rounded-2xl h-14 flex items-center justify-between px-6 shadow-xl hover:bg-black/60 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-1.5 rounded-lg shadow-lg" style={{ backgroundColor: selectedBranch?.primaryColor || '#16a34a' }}>
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-white transition-colors" />
                  <Input 
                    placeholder="Search dishes..." 
                    className="bg-white/5 border-white/10 pl-10 h-10 rounded-xl text-white placeholder:text-white/20 focus-visible:ring-white/20"
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
                          ? "text-white shadow-lg" 
                          : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                      }`}
                      style={selectedCategory === cat ? { backgroundColor: selectedBranch?.primaryColor || '#16a34a', borderColor: selectedBranch?.primaryColor || '#16a34a' } : {}}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 pointer-events-auto">
                  {filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => (
                      <button
                        key={item.menuItemId}
                        className="w-full text-left px-4 py-4 rounded-xl text-sm font-bold transition-all text-white/70 bg-white/[0.02] hover:bg-white/10 hover:text-white flex justify-between items-center group active:scale-[0.98] border border-transparent hover:border-white/5"
                        onClick={() => handleAddItemToAR(item)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="text-[10px] text-white/40 font-medium">{item.categoryName}</span>
                        </div>
                        <Plus className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: selectedBranch?.primaryColor || '#16a34a' }} />
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center text-white/30 text-sm">
                      No dishes found
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
