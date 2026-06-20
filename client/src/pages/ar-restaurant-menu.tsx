import React, { useState, useRef, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { getImageUrl } from "@/lib/config";
import { formatBranchCurrency } from "@/lib/utils";
import {
  ArrowLeft, ShoppingCart, X, Plus, Minus, Trash2, Info, Search,
  Camera, Image as ImageIcon, Palette, RotateCw, ScanLine, Box,
  Hand, Sparkles, Utensils, ChevronRight
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
import { Input } from "@/components/ui/input";
import { useGesture } from '@use-gesture/react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import NotificationTray from "@/components/notification-tray";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";

// --- Types & Constants ---
interface ARItemState extends ApiMenuItem {
  instanceId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

const SCALE_MIN = 0.5;
const SCALE_MAX = 2.5;
const DEFAULT_PRIMARY = '#16a34a';

// Fallback 3D model applied to any dish whose API record has no threeDObject (GLB) yet.
const DEFAULT_MODEL = '/models/default-dish.glb';
useGLTF.preload(DEFAULT_MODEL);

// Returns the GLB url for a dish: its own model, or the shared default when none is set.
function modelUrlFor(item: ApiMenuItem): string {
  return item.threeDObject && item.threeDObject.trim() ? item.threeDObject : DEFAULT_MODEL;
}

const TABLE_SCENES = [
  { name: 'Modern Wood', path: '/attached_assets/stock_images/restaurant_table_top_56b7c559.jpg' },
  { name: 'Elegant Setup', path: '/attached_assets/stock_images/restaurant_table_top_a6a979fc.jpg' },
  { name: 'Rustic Table', path: '/attached_assets/stock_images/restaurant_table_top_9bd071c7.jpg' },
];

// Resolve the display price of a menu item (discounted when available)
function itemPrice(item: ApiMenuItem): number {
  const v = item.variations?.[0];
  if (!v) return 0;
  return (v.discountedPrice != null && v.discountedPrice < v.price) ? v.discountedPrice : v.price;
}

// --- Camera Feed Component ---
type CameraErrorReason = 'insecure' | 'denied' | 'notfound' | 'other';

function CameraFeed({ facingMode, onError }: { facingMode: "user" | "environment"; onError?: (reason: CameraErrorReason) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      try {
        // getUserMedia is only available in a secure context (HTTPS or localhost).
        // Over plain HTTP (e.g. a LAN IP) navigator.mediaDevices is undefined and
        // re-requesting permission can never succeed — surface that distinctly.
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          onError?.('insecure');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        activeStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        const name = err?.name;
        let reason: CameraErrorReason = 'other';
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
          reason = 'denied';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
          reason = 'notfound';
        }
        onError?.(reason);
      }
    }
    startCamera();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, onError]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover"
      style={{ filter: "brightness(0.78)" }}
    />
  );
}

// --- Error boundary so a missing/broken GLB never crashes the page ---
class ModelErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow: the 3D model failed to load — we render the plated-photo fallback instead.
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Loads a GLB model and auto-fits it into a ~2 unit box
function Dish3D({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((node: any) => {
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
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const norm = 2.0 / (maxDim || 1);
    c.scale.set(norm, norm, norm);
    const center = new THREE.Vector3();
    box.getCenter(center);
    c.position.set(-center.x * norm, -center.y * norm, -center.z * norm);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

// The dish photo as a textured disc (used inside DishFallback)
function PhotoTop({ imageUrl }: { imageUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} castShadow>
      <circleGeometry args={[0.86, 48]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// Graceful 3D stand-in for dishes without a (valid) GLB: a ceramic plate + the dish photo
function DishFallback({ item, primaryColor }: { item: ARItemState; primaryColor: string }) {
  const plainDisc = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <circleGeometry args={[0.86, 48]} />
      <meshStandardMaterial color={primaryColor} roughness={0.6} />
    </mesh>
  );
  return (
    <group>
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.14, 48]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.04, 48]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.5} />
      </mesh>
      <ModelErrorBoundary fallback={plainDisc}>
        <Suspense fallback={plainDisc}>
          <PhotoTop imageUrl={getImageUrl(item.picture)} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}

// --- Product (3D dish) Component ---
interface ProductObjectProps {
  item: ARItemState;
  isSelected: boolean;
  autoRotate: boolean;
  primaryColor: string;
  onSelect: () => void;
  onInteract: () => void;
  onUpdate: (updates: Partial<ARItemState>) => void;
  onReset: () => void;
}

const ProductObject = ({
  item, isSelected, autoRotate, primaryColor, onSelect, onInteract, onUpdate, onReset,
}: ProductObjectProps) => {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera, gl, raycaster } = useThree();
  const planeRef = useRef(new THREE.Plane());
  const isInteracting = useRef(false);
  const lastTapRef = useRef(0);

  const hitTest = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycaster.setFromCamera(ndc, camera);
    return { ndc, hit: raycaster.intersectObject(groupRef.current, true).length > 0 };
  }, [camera, gl, raycaster]);

  useGesture(
    {
      onDrag: ({ active, xy: [x, y], event, first, tap }) => {
        const { ndc, hit } = hitTest(x, y);

        if (tap && hit) {
          const now = Date.now();
          if (now - lastTapRef.current < 320) onReset();
          lastTapRef.current = now;
          onSelect();
          return;
        }

        if (first) {
          isInteracting.current = hit;
          if (hit) { onSelect(); onInteract(); }
        }
        if (!isInteracting.current) return;
        if (event && 'cancelable' in event && (event as any).cancelable) (event as any)?.preventDefault?.();

        if (active) {
          const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
          const basePos = new THREE.Vector3(...item.position);
          planeRef.current.setFromNormalAndCoplanarPoint(normal, basePos);
          raycaster.setFromCamera(ndc, camera);
          const intersectPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(planeRef.current, intersectPoint)) {
            onUpdate({ position: [intersectPoint.x, intersectPoint.y, intersectPoint.z] });
          }
        }
      },
      onPinch: ({ active, offset: [s, a], event, first, origin: [ox, oy] }) => {
        if (first) {
          const { hit } = hitTest(ox, oy);
          isInteracting.current = hit;
          if (hit) { onSelect(); onInteract(); }
        }
        if (!isInteracting.current || !active) return;
        if (event && 'cancelable' in event && (event as any).cancelable) (event as any)?.preventDefault?.();
        onUpdate({
          scale: THREE.MathUtils.clamp(s, SCALE_MIN, SCALE_MAX),
          rotation: [item.rotation[0], THREE.MathUtils.degToRad(a), item.rotation[2]],
        });
      },
    },
    {
      target: gl.domElement,
      eventOptions: { passive: false },
      drag: { filterTaps: true, threshold: 5 },
      pinch: {
        from: () => [item.scale, THREE.MathUtils.radToDeg(item.rotation[1])],
        scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
      },
      enabled: true,
    }
  );

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const tPos = new THREE.Vector3(...item.position);
    g.position.lerp(tPos, 0.15);
    g.scale.lerp(new THREE.Vector3(item.scale, item.scale, item.scale), 0.15);

    if (autoRotate && isSelected) {
      g.rotation.y += delta * 0.7;
    } else {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, item.rotation[0], 0.15);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, item.rotation[1], 0.15);
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, item.rotation[2], 0.15);
    }
  });

  return (
    <group ref={groupRef} onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}>
      <ModelErrorBoundary fallback={<DishFallback item={item} primaryColor={primaryColor} />}>
        <Suspense fallback={null}>
          <Dish3D url={modelUrlFor(item)} />
        </Suspense>
      </ModelErrorBoundary>

      {isSelected && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
            <ringGeometry args={[1.15, 1.32, 48]} />
            <meshBasicMaterial color={primaryColor} transparent opacity={0.85} />
          </mesh>
          <pointLight color={primaryColor} intensity={1.6} distance={3} position={[0, 1.2, 0]} />
        </group>
      )}
    </group>
  );
};

// --- Gesture Coach Overlay ---
function GestureCoach({ primaryColor, onDismiss }: { primaryColor: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const tips = [
    { icon: <Hand className="h-5 w-5" />, label: 'Drag to move' },
    { icon: <Sparkles className="h-5 w-5" />, label: 'Pinch to resize' },
    { icon: <RotateCw className="h-5 w-5" />, label: 'Twist to rotate' },
    { icon: <ScanLine className="h-5 w-5" />, label: 'Double-tap to reset' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/55 backdrop-blur-[2px] px-6 pointer-events-auto"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
            <Box className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">Build your table</h3>
            <p className="text-white/50 text-xs">Add dishes and arrange them in your space</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {tips.map((t) => (
            <div key={t.label} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-3 py-3">
              <div className="text-white/80 shrink-0" style={{ color: primaryColor }}>{t.icon}</div>
              <span className="text-white/80 text-xs font-semibold leading-tight">{t.label}</span>
            </div>
          ))}
        </div>
        <Button
          className="w-full h-12 rounded-2xl text-white font-bold text-base"
          style={{ backgroundColor: primaryColor }}
          onClick={onDismiss}
        >
          Got it
        </Button>
      </motion.div>
    </motion.div>
  );
}

// --- Main Page Component ---
export default function ARRestaurantMenuPage() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  const [viewMode, setViewMode] = useState<'ar' | '3d'>('ar');
  const [arItems, setArItems] = useState<ARItemState[]>([]);
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [bgConfig, setBgConfig] = useState<{ type: 'camera' | 'color' | 'image'; value: string }>({ type: 'camera', value: 'environment' });
  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorReason | null>(null);
  const [cameraHintDismissed, setCameraHintDismissed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showCoach, setShowCoach] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeItemDetails, setActiveItemDetails] = useState<ARItemState | null>(null);
  const sheetDragControls = useDragControls();

  const {
    selectedBranch,
    getCartCount,
    getCartTotal,
    setCartOpen,
    setLastAddedItem,
    setAddToCartModalOpen,
    branchCurrency,
  } = useCartStore();

  const primaryColor = selectedBranch?.primaryColor || DEFAULT_PRIMARY;
  const branchId = selectedBranch?.branchId;

  const { data: menuData } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  const uniqueCategories = useMemo(() => {
    if (!apiMenuData?.menuItems) return ["all"];
    return ["all", ...Array.from(new Set(apiMenuData.menuItems.map(i => i.categoryName)))];
  }, [apiMenuData?.menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (!apiMenuData?.menuItems) return [];
    return apiMenuData.menuItems.filter(item => {
      const matchesCategory = selectedCategory === "all" || item.categoryName === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [apiMenuData?.menuItems, selectedCategory, searchTerm]);

  const selectedItem = useMemo(
    () => arItems.find(i => i.instanceId === activeObjectId),
    [arItems, activeObjectId]
  );

  const handleAddItemToAR = (menuItem: ApiMenuItem) => {
    const newItem: ARItemState = {
      ...menuItem,
      instanceId: Math.random().toString(36).slice(2, 11),
      position: [arItems.length > 0 ? (arItems.length % 2 === 0 ? 1 : -1) * Math.ceil(arItems.length / 2) * 1.6 : 0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    };
    setArItems(prev => [...prev, newItem]);
    setActiveObjectId(newItem.instanceId);
    setAutoRotate(true);
  };

  const updateSelectedItem = useCallback((updates: Partial<ARItemState>) => {
    setArItems(prev => prev.map(item =>
      item.instanceId === activeObjectId ? { ...item, ...updates } : item
    ));
  }, [activeObjectId]);

  const removeItem = useCallback((id: string) => {
    setArItems(prev => prev.filter(i => i.instanceId !== id));
    setActiveObjectId(prev => (prev === id ? null : prev));
  }, []);

  const handleAddToCart = (item: ARItemState) => {
    setLastAddedItem(item);
    setAddToCartModalOpen(true);
  };

  const cartCount = getCartCount();
  const cartTotal = getCartTotal();

  // --- Empty state: no branch in store (page reads branch from persisted store) ---
  if (!selectedBranch) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-zinc-950 text-white px-8 text-center">
        <div className="h-16 w-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
          <Utensils className="h-7 w-7 text-white/40" />
        </div>
        <h2 className="text-xl font-bold mb-2">No restaurant selected</h2>
        <p className="text-white/50 text-sm max-w-xs mb-6">
          Open the AR menu from a restaurant page to preview its dishes in 3D and AR.
        </p>
        <Button
          className="h-12 px-6 rounded-2xl text-white font-bold"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setLocation('/restaurant-menu')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to menu
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-zinc-950 overflow-hidden font-sans text-white select-none">
      {/* ===== Layer 0: Background ===== */}
      <div className="absolute inset-0 z-0">
        {viewMode === '3d' ? (
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 38%, #2a2a3e 0%, #16161f 55%, #0a0a0f 100%)' }}
          />
        ) : bgConfig.type === 'camera' && !cameraDenied ? (
          <CameraFeed
            facingMode={bgConfig.value as "user" | "environment"}
            onError={(reason) => { setCameraDenied(true); setCameraError(reason); setCameraHintDismissed(false); }}
          />
        ) : bgConfig.type === 'color' ? (
          <div className="absolute inset-0" style={{ backgroundColor: bgConfig.value }} />
        ) : bgConfig.type === 'image' ? (
          <img src={bgConfig.value} className="absolute inset-0 w-full h-full object-cover" alt="Background" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 38%, #2a2a3e 0%, #16161f 55%, #0a0a0f 100%)' }}
          />
        )}
      </div>

      {/* ===== Layer 1: 3D Canvas ===== */}
      <div
        className="absolute inset-0 z-10"
        style={{ touchAction: "none", overscrollBehavior: "none", userSelect: "none" }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: isMobile ? [0, 2, 12] : [0, 2, 8], fov: isMobile ? 60 : 50 }}
          gl={{ alpha: true, antialias: true }}
          onPointerMissed={() => setActiveObjectId(null)}
        >
          <ambientLight intensity={viewMode === '3d' ? 0.85 : 0.7} />
          <spotLight
            position={[8, 12, 8]}
            angle={0.25}
            penumbra={1}
            intensity={viewMode === '3d' ? 2.4 : 2}
            castShadow
          />
          {viewMode === '3d' && (
            <spotLight position={[-6, 4, -6]} angle={0.3} penumbra={1} intensity={0.9} color="#6688ff" />
          )}
          <Environment preset={viewMode === '3d' ? "studio" : "city"} />

          <Suspense fallback={null}>
            {arItems.map((item) => (
              <ProductObject
                key={item.instanceId}
                item={item}
                isSelected={activeObjectId === item.instanceId}
                autoRotate={autoRotate}
                primaryColor={primaryColor}
                onSelect={() => setActiveObjectId(item.instanceId)}
                onInteract={() => setAutoRotate(false)}
                onUpdate={updateSelectedItem}
                onReset={() => updateSelectedItem({ rotation: [0, 0, 0], scale: 1 })}
              />
            ))}
          </Suspense>

          <ContactShadows position={[0, -0.6, 0]} opacity={0.55} scale={20} blur={2.2} far={4} />
        </Canvas>
      </div>

      {/* ===== Layer 2: Top bar ===== */}
      <div className="absolute top-0 inset-x-0 z-40 pointer-events-none">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 max-w-3xl mx-auto">
          <button
            onClick={() => setLocation('/restaurant-menu')}
            className="pointer-events-auto h-11 w-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/65 transition-all active:scale-95 shadow-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="pointer-events-auto flex items-center gap-2.5 bg-black/45 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-4 h-11 shadow-lg max-w-[55%]">
            {selectedBranch.branchLogo ? (
              <img src={getImageUrl(selectedBranch.branchLogo)} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                <Utensils className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <p className="text-[9px] uppercase tracking-widest text-white/45 font-bold">AR Menu</p>
              <p className="text-xs font-bold truncate">{selectedBranch.branchName}</p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <div className="h-11 w-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg">
              <NotificationTray />
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative h-11 w-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/65 transition-all active:scale-95 shadow-lg"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Layer 3: Mode toggle (AR | 3D) ===== */}
      <div className="absolute top-[68px] inset-x-0 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-black/45 backdrop-blur-xl border border-white/10 rounded-full p-1 flex items-center shadow-lg">
          {(['ar', '3d'] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`relative h-9 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${active ? 'text-white' : 'text-white/50'}`}
              >
                {active && (
                  <motion.div
                    layoutId="modePill"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {mode === 'ar' ? <Camera className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
                  {mode === 'ar' ? 'AR' : '3D'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Layer 4: Secondary controls (top-right) ===== */}
      <div className="absolute top-[116px] right-3 z-40 flex flex-col gap-2">
        {viewMode === 'ar' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-11 w-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/65 transition-all active:scale-95 shadow-lg">
                {bgConfig.type === 'camera' ? <Camera className="h-5 w-5" /> : bgConfig.type === 'color' ? <Palette className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white w-56 p-2 rounded-2xl shadow-2xl">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Camera</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setCameraDenied(false); setCameraError(null); setCameraHintDismissed(false); setBgConfig({ type: 'camera', value: 'environment' }); }} className="rounded-lg gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <Camera className="h-4 w-4" /> Back Camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCameraDenied(false); setCameraError(null); setCameraHintDismissed(false); setBgConfig({ type: 'camera', value: 'user' }); }} className="rounded-lg gap-2 cursor-pointer focus:bg-white/10 focus:text-white">
                <Camera className="h-4 w-4 rotate-180" /> Front Camera
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Backdrop Color</DropdownMenuLabel>
              <div className="grid grid-cols-4 gap-1.5 p-1">
                {['#1a1a1a', '#2e2e2e', '#3d3d3d', primaryColor].map(color => (
                  <button
                    key={color}
                    className="h-8 rounded-lg border border-white/10 transition-transform active:scale-90"
                    style={{ backgroundColor: color }}
                    onClick={() => setBgConfig({ type: 'color', value: color })}
                  />
                ))}
              </div>

              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-white/40 px-2 py-1.5">Table Scenes</DropdownMenuLabel>
              <div className="grid grid-cols-1 gap-1 p-1">
                {TABLE_SCENES.map(table => (
                  <button
                    key={table.path}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 text-xs transition-colors group"
                    onClick={() => setBgConfig({ type: 'image', value: table.path })}
                  >
                    <div className="h-9 w-14 rounded border border-white/10 overflow-hidden shrink-0">
                      <img src={table.path} className="h-full w-full object-cover" alt={table.name} />
                    </div>
                    <span className="group-hover:text-white text-white/70">{table.name}</span>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {arItems.length > 0 && (
          <button
            onClick={() => { setArItems([]); setActiveObjectId(null); }}
            className="h-11 w-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-95 shadow-lg"
            title="Clear table"
          >
            <Trash2 className="h-5 w-5 text-red-400" />
          </button>
        )}
      </div>

      {/* Camera-unavailable card (actionable) */}
      {viewMode === 'ar' && cameraDenied && bgConfig.type === 'camera' && !cameraHintDismissed && (() => {
        const info = {
          insecure: {
            title: 'Camera needs a secure (HTTPS) connection',
            message: "Browsers only allow the live camera on HTTPS or localhost. You're on an http:// address, so the camera can't start — we're showing a studio backdrop instead. Open this site over HTTPS to use AR with your camera.",
          },
          denied: {
            title: 'Camera access is blocked',
            message: "Allow camera access to place dishes in your space. If you blocked it before, enable the camera for this site in your browser settings, then tap Enable Camera.",
          },
          notfound: {
            title: 'No camera found',
            message: "We couldn't find a camera on this device. Showing a studio backdrop instead.",
          },
          other: {
            title: 'Camera unavailable',
            message: "We couldn't start the camera. You can retry, or keep the studio backdrop.",
          },
        }[cameraError ?? 'other'];

        return (
          <div className="absolute top-[108px] left-1/2 -translate-x-1/2 z-30 w-[calc(100%-32px)] max-w-sm pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Camera className="h-[18px] w-[18px] text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug">{info.title}</p>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{info.message}</p>
                </div>
                <button
                  onClick={() => setCameraHintDismissed(true)}
                  className="shrink-0 -mt-1 -mr-1 h-7 w-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                {cameraError !== 'insecure' && (
                  <button
                    onClick={() => { setCameraDenied(false); setCameraError(null); setCameraHintDismissed(false); }}
                    className="flex-1 h-9 rounded-full bg-white text-black text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {cameraError === 'denied' ? 'Enable Camera' : 'Retry'}
                  </button>
                )}
                <button
                  onClick={() => setCameraHintDismissed(true)}
                  className={`${cameraError === 'insecure' ? 'flex-1' : ''} h-9 px-4 rounded-full bg-white/10 text-white/80 text-xs font-semibold inline-flex items-center justify-center active:scale-95 transition-transform`}
                >
                  Use studio backdrop
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Idle hint when items exist but none selected */}
      {!activeObjectId && arItems.length > 0 && !showCoach && (
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center px-6 pointer-events-none">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest animate-pulse">Tap a dish to interact</p>
        </div>
      )}

      {/* ===== Layer 5: Bottom stack (selection toolbar + Your Table + Browse) ===== */}
      <div className="absolute bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 flex flex-col gap-2.5 pointer-events-none">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-2.5">

          {/* Selection toolbar */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                key="sel-toolbar"
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="pointer-events-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-3xl p-2.5 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5 px-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{selectedItem.name}</p>
                    <p className="text-[11px] text-white/50">{formatBranchCurrency(itemPrice(selectedItem), branchCurrency)}</p>
                  </div>
                  <button
                    onClick={() => { setActiveItemDetails(selectedItem); setShowDetailsModal(true); }}
                    className="shrink-0 h-9 px-3 rounded-full bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs font-semibold hover:bg-white/15 transition-colors active:scale-95"
                  >
                    <Info className="h-3.5 w-3.5" /> Details
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Scale stepper */}
                  <div className="flex items-center bg-white/8 border border-white/10 rounded-full h-12">
                    <button
                      onClick={() => { setAutoRotate(false); updateSelectedItem({ scale: Math.max(SCALE_MIN, +(selectedItem.scale - 0.15).toFixed(2)) }); }}
                      className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-9 text-center text-xs font-mono text-white/70">{selectedItem.scale.toFixed(1)}×</span>
                    <button
                      onClick={() => { setAutoRotate(false); updateSelectedItem({ scale: Math.min(SCALE_MAX, +(selectedItem.scale + 0.15).toFixed(2)) }); }}
                      className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Rotate (auto-spin) toggle */}
                  <button
                    onClick={() => setAutoRotate(v => !v)}
                    className="h-12 w-12 shrink-0 rounded-full border flex items-center justify-center transition-all active:scale-90"
                    style={autoRotate
                      ? { backgroundColor: primaryColor, borderColor: 'transparent' }
                      : { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }}
                    title="Spin"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(selectedItem.instanceId)}
                    className="h-12 w-12 shrink-0 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-90"
                    title="Remove"
                  >
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </button>

                  {/* Add to cart (primary) */}
                  <button
                    onClick={() => handleAddToCart(selectedItem)}
                    className="flex-1 h-12 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ShoppingCart className="h-5 w-5" /> Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Your Table tray */}
          {arItems.length > 0 && (
            <div className="pointer-events-auto bg-black/45 backdrop-blur-xl border border-white/10 rounded-3xl p-2.5 shadow-xl">
              <div className="flex items-center justify-between px-1.5 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Your Table · {arItems.length}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {arItems.map((item) => {
                  const active = item.instanceId === activeObjectId;
                  return (
                    <div key={item.instanceId} className="relative shrink-0">
                      <button
                        onClick={() => setActiveObjectId(item.instanceId)}
                        className="h-16 w-16 rounded-2xl overflow-hidden border-2 transition-all active:scale-95"
                        style={{ borderColor: active ? primaryColor : 'rgba(255,255,255,0.1)' }}
                      >
                        <img src={getImageUrl(item.picture)} alt={item.name} className="h-full w-full object-cover" />
                      </button>
                      <button
                        onClick={() => removeItem(item.instanceId)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 border-2 border-zinc-950 flex items-center justify-center active:scale-90"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Browse Menu + cart summary */}
          <div className="pointer-events-auto flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 h-14 rounded-3xl text-white font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-xl"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="h-5 w-5" /> Browse Menu
            </button>
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="h-14 px-4 rounded-3xl bg-black/55 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-[10px] text-white/50 font-semibold leading-none mb-0.5">{cartCount} in cart</span>
                <span className="text-xs font-bold leading-none">{formatBranchCurrency(cartTotal, branchCurrency)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Layer 6: Dish browser bottom sheet ===== */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              drag="y"
              dragListener={false}
              dragControls={sheetDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setDrawerOpen(false); }}
              className="absolute bottom-0 inset-x-0 z-[61] max-h-[72vh] bg-zinc-900/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col"
            >
              {/* Grabber strip — the only drag initiator (keeps inputs/list usable) */}
              <div
                className="shrink-0 px-4 pt-2.5 pb-2 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => sheetDragControls.start(e)}
              >
                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              {/* Header content (not draggable) */}
              <div className="shrink-0 px-4 pb-3">
                <div className="flex items-center justify-between mb-3 max-w-2xl mx-auto w-full">
                  <h3 className="text-lg font-bold">Browse Menu</h3>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors active:scale-95"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-w-2xl mx-auto w-full">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      placeholder="Search dishes..."
                      className="bg-white/5 border-white/10 pl-10 h-11 rounded-2xl text-white placeholder:text-white/30 focus-visible:ring-white/20"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {uniqueCategories.map((cat) => {
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'text-white' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                          style={active ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dish list */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
                <div className="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredMenuItems.length > 0 ? filteredMenuItems.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="flex items-center gap-3 bg-white/[0.04] border border-white/5 rounded-2xl p-2.5 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-white/5 relative">
                        <img src={getImageUrl(item.picture)} alt={item.name} className="h-full w-full object-cover" />
                        {item.threeDObject && (
                          <div className="absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Box className="h-2.5 w-2.5" style={{ color: primaryColor }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.name}</p>
                        <p className="text-[11px] text-white/40 truncate">{item.categoryName}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                          {formatBranchCurrency(itemPrice(item), branchCurrency)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddItemToAR(item)}
                        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                        title={`Add ${item.name}`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 text-center text-white/30 text-sm">No dishes found</div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Layer 7: Gesture coach ===== */}
      <AnimatePresence>
        {showCoach && (
          <GestureCoach primaryColor={primaryColor} onDismiss={() => setShowCoach(false)} />
        )}
      </AnimatePresence>

      {/* Modals (preserved cart flow) */}
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
