import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowLeft, ShoppingCart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";

// ===== EASING FUNCTIONS =====
const easingFunctions = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
};

// ===== WEBGL SUPPORT CHECK =====
const checkWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

export default function ARRestaurantMenuPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [webglSupported] = useState(() => checkWebGLSupport());
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  const [isMobileDevice] = useState(() => window.innerWidth < 768);

  const {
    selectedRestaurant,
    selectedBranch,
    serviceType,
    addItem,
    setSelectedBranch,
    setSelectedRestaurant,
    setLastAddedItem,
    setAddToCartModalOpen,
  } = useCartStore();

  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filteredItems, setFilteredItems] = useState<ApiMenuItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const itemsRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const getUrlParams = () => new URLSearchParams(window.location.search);
  const getBranchId = () => {
    const urlParams = getUrlParams();
    const urlBranchId = urlParams.get('branchId');
    if (urlBranchId) return parseInt(urlBranchId, 10);
    return selectedBranch?.branchId || null;
  };

  const branchId = getBranchId();

  // Fetch menu data from API
  const { data: menuData, isLoading } = useQuery({
    queryKey: [`/api/customer-search/branch/${branchId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!branchId,
    staleTime: Infinity,
  });

  const apiMenuData = menuData as ApiMenuResponse;

  // Update filtered items when category or menu data changes
  useEffect(() => {
    if (!apiMenuData?.menuItems) return;
    
    const items = apiMenuData.menuItems.filter((item: ApiMenuItem) =>
      selectedCategory === "all" || item.categoryName === selectedCategory
    );
    setFilteredItems(items);
  }, [selectedCategory, apiMenuData]);

  // Get unique categories
  const categories = ["all", ...new Set(apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [])];

  // Orientation handling
  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerHeight < window.innerWidth);
      if (rendererRef.current && cameraRef.current) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        const camera = cameraRef.current as THREE.PerspectiveCamera;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  // Request camera and initialize AR scene
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        setCameraPermission("granted");
        setTimeout(() => initializeARScene(stream), 100);
      } catch (error) {
        console.error("Camera permission denied:", error);
        setCameraPermission("denied");
      }
    };

    if (webglSupported) {
      requestPermissions();
    }

    return () => {
      if (rendererRef.current) rendererRef.current.dispose();
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webglSupported]);

  const initializeARScene = async (mediaStream: MediaStream) => {
    if (!containerRef.current) return;

    // Create video element
    const video = document.createElement("video");
    videoRef.current = video;
    video.srcObject = mediaStream;
    video.play().catch((err) => console.error("Video play error:", err));
    video.playsInline = true;
    video.autoplay = true;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Canvas for video texture
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    scene.add(directionalLight);

    // Table surface
    const tableGeometry = new THREE.PlaneGeometry(3, 2.5);
    const tableMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B5A2B,
      shininess: 20,
      side: THREE.DoubleSide,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.rotation.x = -Math.PI / 2;
    table.position.set(0, -0.3, -3);
    table.receiveShadow = true;
    scene.add(table);

    // Render loop
    let animationTime = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      animationTime += 0.016;

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      itemsRef.current.forEach((item, index) => {
        const staggeredTime = animationTime + (index * 0.05);
        item.rotation.y += 0.005;
        const floatAmount = Math.sin(staggeredTime * 1.5) * 0.15;
        item.position.y = 0.5 + floatAmount;
      });

      renderer.render(scene, camera);
    };

    animate();

    rendererRef.current = renderer;
  };

  // Handle back navigation
  const handleBack = () => setLocation("/");

  if (!webglSupported) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-white text-center px-6 max-w-md">
          <div className="mb-6 text-4xl">🖥️</div>
          <div className="mb-4 text-2xl font-bold">WebGL Not Supported</div>
          <p className="text-sm text-gray-300">Your browser doesn't support AR. Please use a modern browser.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      <Navbar />

      {cameraPermission === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-center">
            <div className="mb-4 text-lg sm:text-2xl font-semibold">Requesting camera permission...</div>
            <div className="text-sm text-gray-400">Please allow camera access</div>
          </div>
        </div>
      )}

      {cameraPermission === "denied" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-center">
            <div className="mb-4 text-lg sm:text-2xl font-semibold">Camera Permission Denied</div>
            <div className="text-sm text-gray-400">Please enable camera in browser settings</div>
          </div>
        </div>
      )}

      {/* AR Canvas */}
      <div ref={containerRef} className="absolute inset-0 z-20" />

      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between z-40 ${
        isLandscape ? "p-2" : "p-4"
      } bg-gradient-to-b from-black/60 to-transparent`}>
        <Button onClick={handleBack} variant="ghost" size="sm" className="text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className={`text-white font-bold ${isLandscape ? "text-sm" : "text-lg"}`}>AR Menu</h1>
        <Button onClick={() => setShowCart(true)} variant="ghost" size="sm" className="text-white">
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </div>

      {/* Category Filter */}
      <div className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto ${
        isLandscape ? "p-2" : "p-4"
      }`}>
        <div className="flex gap-2 min-w-min">
          {categories.slice(0, 5).map((cat) => (
            <Button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className={`${isLandscape ? "text-xs px-2" : "text-sm"}`}
            >
              {cat.substring(0, 8)}
            </Button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CartModal />
      <AddToCartModal />
      <PaymentModal />
    </div>
  );
}
