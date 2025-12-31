import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment, ContactShadows, useGLTF } from '@react-three/drei';
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

/* ---------------- CAMERA FEED ---------------- */

function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(console.error);
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      style={{ filter: "brightness(0.7)" }}
    />
  );
}

/* ---------------- CAMERA CONTROLLER (FIXED) ---------------- */

function CameraController({
  targetPos,
  activeObjectId
}: {
  targetPos: THREE.Vector3;
  activeObjectId: number | null;
}) {
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.lerp(targetPos, 0.12);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableZoom
      enableRotate={activeObjectId === null} // 🔥 FIX
      minDistance={3}
      maxDistance={15}
      dampingFactor={0.05}
    />
  );
}

/* ---------------- PRODUCT OBJECT ---------------- */

const ProductObject = ({
  item,
  index,
  total,
  isSelected,
  onSelect,
  scale
}: {
  item: ApiMenuItem;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  scale: number;
}) => {
  const modelPath = `/models/food_${(item.menuItemId % 3) + 1}.glb`;
  const position: [number, number, number] = [
    (index - (total - 1) / 2) * 2.5,
    0,
    0
  ];

  let gltf: any;
  try {
    gltf = useGLTF(modelPath);
  } catch {}

  const clonedScene = useMemo(
    () => (gltf?.scene ? gltf.scene.clone() : null),
    [gltf?.scene]
  );

  const price =
    item.variations?.[0]?.discountedPrice ||
    item.variations?.[0]?.price ||
    0;

  const discount = item.discount?.value || 0;

  return (
    <group
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {clonedScene ? (
        <primitive object={clonedScene} scale={scale} />
      ) : (
        <mesh scale={scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff884d" />
        </mesh>
      )}

      {/* PRICE TAG */}
      <Html position={[0.6, 1.2, 0]} center>
        <div className="flex flex-col gap-1 pointer-events-none">
          <span className="bg-black/80 text-white text-[11px] px-2 py-1 rounded-full">
            ₹{price}
          </span>
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[11px] px-2 py-1 rounded-full font-bold">
              {discount}% OFF
            </span>
          )}
        </div>
      </Html>

      {/* SELECTION RING */}
      {isSelected && (
        <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

/* ---------------- MAIN PAGE ---------------- */

export default function ARRestaurantMenuPage() {
  const [activeObjectId, setActiveObjectId] = useState<number | null>(null);
  const [arItems, setArItems] = useState<ApiMenuItem[]>([]);
  const [scales, setScales] = useState<Record<number, number>>({});
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [, setLocation] = useLocation();

  const { selectedRestaurant, selectedBranch, getCartCount, setCartOpen } =
    useCartStore();

  const cartTotalItems = getCartCount();
  const branchId = selectedBranch?.branchId;

  const { data: menuData } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId
  });

  const apiMenuData = menuData as ApiMenuResponse;

  const handleUpdateScale = (id: number, delta: number) => {
    setScales(prev => ({
      ...prev,
      [id]: Math.min(Math.max(0.5, (prev[id] || 1) + delta), 2.5)
    }));
  };

  const selectedPos = useMemo(() => {
    if (activeObjectId === null) return new THREE.Vector3(0, 0, 0);
    const index = arItems.findIndex(i => i.menuItemId === activeObjectId);
    if (index === -1) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3((index - (arItems.length - 1) / 2) * 2.5, 0, 0);
  }, [activeObjectId, arItems]);

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      <Navbar />
      <CameraFeed />

      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ambientLight intensity={0.7} />
        <Environment preset="city" />

        <Suspense fallback={null}>
          {arItems.map((item, index) => (
            <ProductObject
              key={item.menuItemId}
              item={item}
              index={index}
              total={arItems.length}
              isSelected={activeObjectId === item.menuItemId}
              onSelect={() =>
                setActiveObjectId(
                  activeObjectId === item.menuItemId ? null : item.menuItemId
                )
              }
              scale={scales[item.menuItemId] || 1}
            />
          ))}
        </Suspense>

        <ContactShadows
          position={[0, -0.6, 0]}
          opacity={0.4}
          scale={15}
          blur={2.5}
          far={2}
        />

        <CameraController
          targetPos={selectedPos}
          activeObjectId={activeObjectId}
        />
      </Canvas>

      <CartModal />
      <AddToCartModal />
      <PaymentModal />
    </div>
  );
}