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
import { getImageUrl } from "@/lib/config";

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

  // Create and render 3D menu items in AR scene
  useEffect(() => {
    if (!sceneRef.current || filteredItems.length === 0) return;

    // Remove old items from scene
    itemsRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material && Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: THREE.Material) => mat.dispose());
      } else if (mesh.material) {
        (mesh.material as THREE.Material).dispose();
      }
    });
    itemsRef.current = [];

    // Helper function to load image texture using THREE.TextureLoader
    const loadImageTexture = (menuItem: ApiMenuItem): Promise<THREE.Texture> => {
      return new Promise((resolve) => {
        if (!menuItem.picture) {
          console.warn(`🖼️ No picture for ${menuItem.name}, using text fallback`);
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ddd';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#666';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(menuItem.name, 128, 128);
          }
          const fallbackTexture = new THREE.CanvasTexture(canvas);
          fallbackTexture.colorSpace = THREE.SRGBColorSpace;
          fallbackTexture.needsUpdate = true;
          resolve(fallbackTexture);
          return;
        }

        const imageUrl = getImageUrl(menuItem.picture);
        console.log(`📸 Loading image for ${menuItem.name}: ${imageUrl}`);
        
        // Use THREE.TextureLoader to handle CORS properly
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
          imageUrl,
          (texture) => {
            console.log(`✅ Image loaded for ${menuItem.name} using TextureLoader`);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve(texture);
          },
          undefined,
          (error) => {
            console.error(`❌ Failed to load image for ${menuItem.name} from ${imageUrl}:`, error);
            // Fallback if image fails to load
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ff6b6b';
              ctx.fillRect(0, 0, 256, 256);
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 14px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(menuItem.name, 128, 120);
              ctx.font = 'bold 10px Arial';
              ctx.fillText('(Image failed)', 128, 140);
            }
            const errorTexture = new THREE.CanvasTexture(canvas);
            errorTexture.colorSpace = THREE.SRGBColorSpace;
            errorTexture.needsUpdate = true;
            resolve(errorTexture);
          }
        );
      });
    };

    // Create new items
    const itemsPerRow = 3;
    const itemWidth = 0.8;
    const itemHeight = 0.8;
    const spacing = 0.2;
    const rowHeight = itemHeight + spacing;
    const totalWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing;
    const startX = -totalWidth / 2 + itemWidth / 2;

    // Load all textures and create meshes
    console.log(`🎨 Loading textures for ${filteredItems.length} items`);
    Promise.all(filteredItems.slice(0, 9).map((item) => loadImageTexture(item))).then((textures) => {
      console.log(`✨ All textures loaded, creating meshes...`);
      filteredItems.slice(0, 9).forEach((menuItem, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        
        // Create a box for each menu item
        const geometry = new THREE.BoxGeometry(itemWidth, itemHeight, 0.2);
        
        // Create color based on item
        const hue = (index % 12) / 12;
        const itemColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
        
        // Get the texture for this item
        const texture = textures[index];
        
        // Create array of materials (6 faces) - apply texture to all visible faces
        const materials = [
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Right
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Left
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Top
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Bottom
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Front (image)
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 }), // Back
        ];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Position items in a grid on the table
        const x = startX + col * (itemWidth + spacing);
        const z = -3 + row * rowHeight;
        mesh.position.set(x, 0.5, z);
        
        // Store item data on the mesh for click handling
        (mesh as any).menuItem = menuItem;
        (mesh as any).itemIndex = index;

        if (sceneRef.current) {
          sceneRef.current.add(mesh);
          itemsRef.current.push(mesh);
        }
      });
      console.log(`🎯 Created ${filteredItems.slice(0, 9).length} menu item meshes with textures`);
    });
  }, [filteredItems, sceneRef]);

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

    // Create and style video element as background
    const video = document.createElement("video");
    videoRef.current = video;
    video.srcObject = mediaStream;
    video.play().catch((err) => console.error("Video play error:", err));
    video.playsInline = true;
    video.autoplay = true;
    video.muted = true;
    
    // Style video as full-screen background
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.zIndex = "10";

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer setup with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.shadowMap.enabled = true;

    // Clear container and add video first (behind), then renderer (on top)
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(video);
    
    // Make renderer canvas overlay on top
    const rendererCanvas = renderer.domElement;
    rendererCanvas.style.position = "absolute";
    rendererCanvas.style.top = "0";
    rendererCanvas.style.left = "0";
    rendererCanvas.style.zIndex = "20";
    containerRef.current.appendChild(rendererCanvas);

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

    // Handle clicks on menu items
    const onCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(itemsRef.current);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as any;
        if (clickedMesh.menuItem) {
          console.log("📦 Clicked menu item:", clickedMesh.menuItem);
          setLastAddedItem(clickedMesh.menuItem);
          setAddToCartModalOpen(true);
        }
      }
    };

    renderer.domElement.addEventListener("click", onCanvasClick);

    // Render loop
    let animationTime = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      animationTime += 0.016;

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

    return () => {
      renderer.domElement.removeEventListener("click", onCanvasClick);
    };
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
