import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowLeft, ShoppingCart, Menu, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const itemsRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const deviceOrientationRef = useRef({ beta: 0, gamma: 0 }); // Phone tilt angles
  const scaleRef = useRef(1); // AR item zoom scale
  const lastPinchDistanceRef = useRef(0);

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
        
        // Store base position for device orientation offsetting
        mesh.userData.baseX = x;
        mesh.userData.baseZ = z;
        
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

  // Calculate discount percentage if applicable
  const getDiscount = (item: ApiMenuItem) => {
    if (item.originalPrice && item.price && item.originalPrice > item.price) {
      return Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
    }
    return 0;
  };

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

    // Pinch zoom handler
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        
        // Calculate distance between two fingers
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (lastPinchDistanceRef.current > 0) {
          // Calculate scale change
          const scaleChange = currentDistance / lastPinchDistanceRef.current;
          scaleRef.current *= scaleChange;
          
          // Clamp scale between 0.5 and 3
          scaleRef.current = Math.max(0.5, Math.min(3, scaleRef.current));
          console.log(`🔍 Pinch zoom scale: ${scaleRef.current.toFixed(2)}`);
        }
        
        lastPinchDistanceRef.current = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistanceRef.current = 0;
    };

    renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", handleTouchEnd);

    // Device orientation listener
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      deviceOrientationRef.current.beta = event.beta || 0;  // Forward/backward tilt (-90 to 90)
      deviceOrientationRef.current.gamma = event.gamma || 0; // Left/right tilt (-90 to 90)
      console.log(`📱 Device orientation - Beta: ${deviceOrientationRef.current.beta.toFixed(1)}, Gamma: ${deviceOrientationRef.current.gamma.toFixed(1)}`);
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && (DeviceOrientationEvent as any).requestPermission) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        })
        .catch(console.error);
    } else {
      // For non-iOS devices
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    // Render loop
    let animationTime = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      animationTime += 0.016;

      const { beta, gamma } = deviceOrientationRef.current;
      // Convert device angles to position offsets (scaled for visual effect)
      const xOffset = (gamma / 90) * 2;  // Left/right movement
      const zOffset = (beta / 90) * 1.5; // Forward/backward movement

      itemsRef.current.forEach((item, index) => {
        // Apply device orientation to position
        const baseX = item.userData.baseX || item.position.x;
        const baseZ = item.userData.baseZ || item.position.z;
        
        item.position.x = baseX + xOffset;
        item.position.z = baseZ + zOffset;
        item.position.y = 0.5;
        
        // Apply pinch zoom scale
        item.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
      });

      renderer.render(scene, camera);
    };

    animate();

    rendererRef.current = renderer;

    return () => {
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      renderer.domElement.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
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

      {/* Category Filter - Enhanced Dropdown */}
      <div className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/70 to-transparent ${
        isLandscape ? "p-2" : "p-4"
      }`}>
        <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className={`w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                isLandscape ? "text-xs py-2" : "text-sm py-3"
              }`}
            >
              <span className="flex-1 flex items-center gap-2">
                <span className="text-lg">📋</span>
                Browse {selectedCategory === "all" ? "All Items" : selectedCategory}
              </span>
              <span className="transition-transform duration-300 transform">
                {categoryExpanded ? (
                  <ChevronUp className="w-5 h-5 ml-2" />
                ) : (
                  <ChevronDown className="w-5 h-5 ml-2" />
                )}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className={`mt-3 space-y-2 max-h-48 overflow-y-auto ${
            isLandscape ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"
          }`}>
            {categories.map((cat) => {
              const count = cat === "all" 
                ? filteredItems.length 
                : filteredItems.filter(item => item.categoryName === cat).length;
              return (
                <Button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCategoryExpanded(false);
                  }}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  className={`relative overflow-hidden group transition-all duration-300 transform hover:scale-105 ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 shadow-md"
                      : "bg-white/10 text-white border border-white/30 hover:bg-white/20"
                  } ${isLandscape ? "text-xs px-2 py-1" : "text-sm px-3 py-2"}`}
                >
                  <span className="relative z-10 capitalize flex items-center gap-2">
                    {cat === "all" ? "🍽️" : "✨"}
                    {cat} 
                    {count > 0 && <span className="text-xs bg-white/30 rounded-full px-2">({count})</span>}
                  </span>
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Price & Item Info Overlay - Shows on item hover/selection */}
      {filteredItems.length > 0 && (
        <div className={`absolute top-20 right-4 z-30 max-w-xs ${isLandscape ? "hidden" : "block"}`}>
          <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-4 shadow-lg">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">💰</span>
              Category Items
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredItems.slice(0, 5).map((item) => {
                const discount = getDiscount(item);
                return (
                  <div key={item.itemId} className="flex items-center justify-between text-xs text-white/80 hover:text-white transition-colors">
                    <span className="truncate flex-1">{item.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      {discount > 0 && (
                        <span className="bg-red-500/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          -{discount}%
                        </span>
                      )}
                      <span className="font-bold text-orange-400">₹{item.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CartModal />
      <AddToCartModal />
      <PaymentModal />
    </div>
  );
}
