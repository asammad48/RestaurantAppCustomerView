import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useCartStore } from "@/lib/store";
import { ApiMenuItem, ApiMenuResponse } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowLeft, ShoppingCart, Menu, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Navbar from "@/components/navbar";
import CartModal from "@/components/modals/cart-modal";
import AddToCartModal from "@/components/modals/add-to-cart-modal";
import PaymentModal from "@/components/modals/payment-modal";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";
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
  const [selectedItemsFor3D, setSelectedItemsFor3D] = useState<ApiMenuItem[]>([]);
  const [detailItem, setDetailItem] = useState<ApiMenuItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
  const dragItemRef = useRef<THREE.Object3D | null>(null);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5));
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());

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

  // Create and render 3D menu items in AR scene - trigger only when items change
  useEffect(() => {
    if (!sceneRef.current || selectedItemsFor3D.length === 0) return;

    // Remove old items
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

    const loadImageTexture = (menuItem: ApiMenuItem): Promise<THREE.Texture> => {
      return new Promise((resolve) => {
        if (!menuItem.picture) {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#fff';
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
        new THREE.TextureLoader().load(
          imageUrl,
          (texture) => {
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            resolve(texture);
          },
          undefined,
          () => {
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
            }
            const errorTexture = new THREE.CanvasTexture(canvas);
            errorTexture.colorSpace = THREE.SRGBColorSpace;
            errorTexture.needsUpdate = true;
            resolve(errorTexture);
          }
        );
      });
    };

    const itemsPerRow = 3;
    const itemWidth = 0.8;
    const itemHeight = 0.8;
    const spacing = 0.2;
    const rowHeight = itemHeight + spacing;
    const totalWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * spacing;
    const startX = -totalWidth / 2 + itemWidth / 2;

    const createTextCanvas = (text: string, bgColor: string, fontSize: number = 40): THREE.Texture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.roundRect(10, 10, 492, 108, 20);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    Promise.all(selectedItemsFor3D.slice(0, 9).map((item) => loadImageTexture(item))).then((textures) => {
      if (!sceneRef.current) return;
      
      console.log(`🖼️ Rendering ${selectedItemsFor3D.length} items in 3D AR view`);
      
      selectedItemsFor3D.slice(0, 9).forEach((menuItem, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        
        const geometry = new THREE.BoxGeometry(itemWidth, itemHeight, 0.2);
        const texture = textures[index];
        
        const materials = Array(6).fill(null).map(() => 
          new THREE.MeshPhongMaterial({ map: texture, shininess: 100 })
        );

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        const x = startX + col * (itemWidth + spacing);
        const z = -3 + row * rowHeight;
        mesh.position.set(x, 0.5, z);
        mesh.userData.baseX = x;
        mesh.userData.baseZ = z;
        
        (mesh as any).menuItem = menuItem;
        (mesh as any).itemIndex = index;

        // Add Price Tag (Hanging)
        const priceTagGroup = new THREE.Group();
        
        // Hanging String
        const stringGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -0.2, 0)
        ]);
        const stringMat = new THREE.LineBasicMaterial({ color: 0xcccccc });
        const hangingString = new THREE.Line(stringGeo, stringMat);
        priceTagGroup.add(hangingString);

        const priceTagGeo = new THREE.PlaneGeometry(0.6, 0.15);
        const priceTexture = createTextCanvas(`₹${getPrice(menuItem)}`, '#f97316');
        const priceTagMat = new THREE.MeshBasicMaterial({ map: priceTexture, transparent: true, side: THREE.DoubleSide });
        const priceTag = new THREE.Mesh(priceTagGeo, priceTagMat);
        priceTag.position.set(0, -0.275, 0.05);
        priceTagGroup.add(priceTag);
        
        priceTagGroup.position.set(0.2, -0.4, 0);
        mesh.add(priceTagGroup);

        // Add Discount Tag (Hanging) if exists
        const discount = getDiscount(menuItem);
        if (discount > 0) {
          const discTagGroup = new THREE.Group();
          
          const dStringGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0.2, 0)
          ]);
          const dHangingString = new THREE.Line(dStringGeo, stringMat);
          discTagGroup.add(dHangingString);

          const discTagGeo = new THREE.PlaneGeometry(0.5, 0.15);
          const discTexture = createTextCanvas(`${discount}% OFF`, '#ef4444', 36);
          const discTagMat = new THREE.MeshBasicMaterial({ map: discTexture, transparent: true, side: THREE.DoubleSide });
          const discTag = new THREE.Mesh(discTagGeo, discTagMat);
          discTag.position.set(0, 0.275, 0.05);
          discTagGroup.add(discTag);
          
          discTagGroup.position.set(-0.2, 0.4, 0);
          mesh.add(discTagGroup);
        }

        // Add 3D "+" Button
        const plusButtonGeo = new THREE.CircleGeometry(0.12, 32);
        const plusTexture = createTextCanvas('+', '#22c55e', 80);
        const plusButtonMat = new THREE.MeshBasicMaterial({ map: plusTexture, transparent: true, side: THREE.DoubleSide });
        const plusButton = new THREE.Mesh(plusButtonGeo, plusButtonMat);
        plusButton.position.set(0.35, 0.35, 0.11);
        plusButton.userData.isPlusButton = true;
        plusButton.userData.menuItem = menuItem;
        mesh.add(plusButton);

        sceneRef.current!.add(mesh);
        itemsRef.current.push(mesh);

        // Log dimensions and position
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log(`📦 3D Item Rendered [${menuItem.name}]:`, {
          id: menuItem.menuItemId,
          dimensions: {
            width: size.x.toFixed(3),
            height: size.y.toFixed(3),
            depth: size.z.toFixed(3)
          },
          position: { x: x.toFixed(2), y: 0.5, z: z.toFixed(2) }
        });
      });
    });
  }, [selectedItemsFor3D]);

  // Get unique categories
  const categories = ["all", ...new Set(apiMenuData?.menuItems?.map((item: ApiMenuItem) => item.categoryName) || [])];

    // Calculate discount percentage if applicable
  const getDiscount = (item: ApiMenuItem) => {
    if (item.discount?.value) {
      return item.discount.value;
    }
    const variations = item.variations || [];
    const variation = variations[0];
    if (variation?.discountedPrice && variation?.price && variation.price > variation.discountedPrice) {
      return Math.round(((variation.price - variation.discountedPrice) / variation.price) * 100);
    }
    return 0;
  };

  const getPrice = (item: ApiMenuItem) => {
    if (item.variations && item.variations.length > 0) {
      return item.variations[0].discountedPrice || item.variations[0].price;
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

    // Handle clicks and drags on menu items
    const handleStart = (clientX: number, clientY: number) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.x = x;
      mouseRef.current.y = y;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current!.children, true);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        
        // Check if plus button was clicked
        if (intersectedObject.userData.isPlusButton) {
          console.log("➕ 3D Plus Button Clicked:", intersectedObject.userData.menuItem?.name);
          setDetailItem(intersectedObject.userData.menuItem);
          setIsDetailModalOpen(true);
          dragItemRef.current = null; // Don't drag if plus button clicked
          return;
        }

        // Fallback to item drag/click logic (search up parents for menu item data)
        let clickedMesh: any = intersectedObject;
        while (clickedMesh && !clickedMesh.menuItem && clickedMesh.parent) {
          clickedMesh = clickedMesh.parent;
        }

        if (clickedMesh && clickedMesh.menuItem) {
          console.log("🖱️ Drag Start / Click:", clickedMesh.menuItem?.name);
          dragItemRef.current = clickedMesh;
          
          // Setup drag offset
          const intersectPoint = new THREE.Vector3();
          raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint);
          dragOffsetRef.current.copy(clickedMesh.position).sub(intersectPoint);
          
          // Set drag timeout to distinguish between click and drag
          (clickedMesh as any).clickStartTime = Date.now();
        }
      }
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragItemRef.current || !rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersectPoint = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint)) {
        dragItemRef.current.position.copy(intersectPoint.add(dragOffsetRef.current));
        // Keep height fixed at table level
        dragItemRef.current.position.y = 0.5;
        // Update base positions to prevent drift from orientation updates
        dragItemRef.current.userData.baseX = dragItemRef.current.position.x;
        dragItemRef.current.userData.baseZ = dragItemRef.current.position.z;
      }
    };

    const handleEnd = () => {
      if (dragItemRef.current) {
        const duration = Date.now() - ((dragItemRef.current as any).clickStartTime || 0);
        if (duration < 200) {
          // It was a short click, not a long drag
          const item = (dragItemRef.current as any).menuItem;
          if (item) {
            console.log("✨ Item Clicked:", item.name);
            setLastAddedItem(item);
            setAddToCartModalOpen(true);
          }
        }
        console.log("🖱️ Drag End");
        dragItemRef.current = null;
      }
    };

    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleEnd();

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    // Pinch zoom handler
    const handlePinchMove = (event: TouchEvent) => {
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

    const handlePinchEnd = () => {
      lastPinchDistanceRef.current = 0;
    };

    renderer.domElement.addEventListener("touchmove", handlePinchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", handlePinchEnd);

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
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("touchmove", handlePinchMove);
      renderer.domElement.removeEventListener("touchend", handlePinchEnd);
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

      {/* Category Filter - Advanced Dropdown with Item Management */}
      <div className={`absolute bottom-0 left-0 right-0 z-40 max-h-screen flex flex-col ${
        isLandscape ? "p-2" : "p-4"
      }`} style={{background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7), transparent)'}}>
        <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              className={`w-full relative overflow-hidden group text-white font-bold border-0 shadow-2xl transition-all duration-300 ${
                isLandscape ? "text-xs py-2 px-3" : "text-base py-4 px-4"
              }`}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #b91c1c 100%)',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(249, 115, 22, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
            >
              <span className="flex-1 flex items-center gap-3 justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-xl animate-bounce">🍽️</span>
                  <span className="hidden sm:inline">Browse</span> {selectedCategory === "all" ? "All Items" : selectedCategory}
                </span>
                <span className={`transition-transform duration-300 ${categoryExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown className={`w-5 h-5`} />
                </span>
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent 
            className={`mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-96 overflow-y-auto flex flex-col gap-4`}
            style={{
              background: 'linear-gradient(135deg, rgba(23, 23, 23, 0.98), rgba(31, 31, 31, 0.95))',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(249, 115, 22, 0.1)',
              padding: isLandscape ? '12px' : '16px'
            }}
          >
            {/* Categories Grid */}
            <div>
              <div className="text-white/60 text-xs font-semibold uppercase mb-2 px-2">Categories</div>
              <div className={`grid gap-3 ${
                isLandscape ? "grid-cols-3" : "grid-cols-2"
              }`}>
                  {categories.map((cat) => {
                  const categoryItems = apiMenuData?.menuItems?.filter(item => item.categoryName === cat) || [];
                  const count = cat === "all" 
                    ? filteredItems.length 
                    : categoryItems.length;
                  const isSelected = selectedCategory === cat;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryExpanded(false);
                      }}
                      className={`relative group overflow-hidden rounded-xl transition-all duration-300 transform ${
                        isLandscape ? "text-xs p-2" : "text-sm p-3"
                      }`}
                      style={{
                        background: isSelected 
                          ? 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                        border: isSelected
                          ? '1.5px solid rgba(249, 115, 22, 0.6)'
                          : '1.5px solid rgba(255,255,255,0.15)',
                        boxShadow: isSelected
                          ? '0 6px 20px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                          : '0 4px 12px rgba(0, 0, 0, 0.3)',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div className="relative z-10 capitalize flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{cat === "all" ? "🍽️" : "✨"}</span>
                          <span className="font-semibold flex-1">{cat}</span>
                          {count > 0 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-white/30 text-white'
                                : 'bg-orange-500/30 text-orange-300'
                            }`}>
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 rounded-xl" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items List for Selected Category */}
            {filteredItems.length > 0 && (
              <div className="border-t border-white/10 pt-3">
                <div className="text-white/60 text-xs font-semibold uppercase mb-2 px-2 flex items-center gap-2">
                  <span>📦 Items ({filteredItems.length})</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 px-2">
                  {filteredItems.map((item) => {
                    const discount = getDiscount(item);
                    return (
                      <div
                        key={item.menuItemId}
                        className="w-full flex items-center bg-white/5 hover:bg-white/15 rounded-lg p-2.5 transition-all duration-200 border border-white/5 hover:border-orange-500/50 active:bg-orange-500/20 group"
                      >
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setSelectedItemsFor3D((prevItems) => {
                              const isSelected = prevItems.some(i => i.menuItemId === item.menuItemId);
                              if (isSelected) {
                                console.log(`➖ Removing item from 3D view: ${item.name}`);
                                return prevItems.filter(i => i.menuItemId !== item.menuItemId);
                              } else {
                                console.log(`➕ Adding item to 3D view: ${item.name}`);
                                return [...prevItems, item];
                              }
                            });
                            setCategoryExpanded(false);
                          }}
                        >
                          <p className="text-white text-xs font-medium truncate group-hover:text-orange-300 transition-colors">{item.name}</p>
                          {item.description && (
                            <p className="text-white/50 text-xs truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="flex flex-col items-end mr-1">
                            {discount > 0 && (
                              <span className="bg-red-500/80 text-white text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap mb-0.5">
                                -{discount}%
                              </span>
                            )}
                            <span className="font-bold text-orange-400 text-xs whitespace-nowrap">₹{getPrice(item)}</span>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex-shrink-0 transition-transform active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailItem(item);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="text-white/50 text-xs text-center py-4">
                      No items in this category
                    </div>
                  )}
                </div>
              </div>
            )}
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
                    <div key={item.menuItemId} className="flex items-center justify-between text-xs text-white/80 hover:text-white transition-colors">
                    <span className="truncate flex-1">{item.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      {discount > 0 && (
                        <span className="text-red-400 font-bold">-{discount}%</span>
                      )}
                      <span className="text-orange-400 font-bold">₹{getPrice(item)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CartModal open={showCart} onOpenChange={setShowCart} />
      <AddToCartModal />
      <PaymentModal />
      {detailItem && (
        <MenuItemDetailModal 
          item={detailItem}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </div>
  );
}
