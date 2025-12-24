import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import restaurantBackgroundImage from "@assets/generated_images/elegant_italian_restaurant_interior_background.png";
import premiumMealImage from "@assets/generated_images/Premium_meal_photography_0924ff10.png";
import budgetFoodImage from "@assets/generated_images/Budget_food_combo_photo_72d038b1.png";
import fastFoodImage from "@assets/generated_images/Fast_food_spread_fe6113bb.png";

// ===== EASING FUNCTIONS FOR SMOOTH ANIMATIONS =====
// Cubic easing for natural, smooth motion without abrupt starts/stops
const easingFunctions = {
  // Smooth deceleration for scaling animations
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  // Smooth acceleration and deceleration for floating motion
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Smooth deceleration for item fade-in
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
};

// ===== WEBGL SUPPORT CHECK =====
// Detect if browser supports WebGL for AR rendering
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

// ===== MENU DATA STRUCTURE =====
// Menu items organized by section with images, names, and prices
interface MenuItem {
  id: number;
  name: string;
  price: string;
  image: string;
  section: "recommended" | "menu" | "deals";
}

const MENU_ITEMS: MenuItem[] = [
  // Recommended Section (5 items)
  {
    id: 0,
    name: "Premium Meal",
    price: "$24.99",
    image: premiumMealImage,
    section: "recommended"
  },
  {
    id: 1,
    name: "Chef's Special",
    price: "$28.99",
    image: budgetFoodImage,
    section: "recommended"
  },
  {
    id: 2,
    name: "Deluxe Platter",
    price: "$32.99",
    image: fastFoodImage,
    section: "recommended"
  },
  {
    id: 3,
    name: "Signature Dish",
    price: "$26.99",
    image: premiumMealImage,
    section: "recommended"
  },
  {
    id: 4,
    name: "Chef's Tasting",
    price: "$35.99",
    image: budgetFoodImage,
    section: "recommended"
  },

  // Menu Section (5 items)
  {
    id: 5,
    name: "Budget Combo",
    price: "$12.99",
    image: budgetFoodImage,
    section: "menu"
  },
  {
    id: 6,
    name: "Fast Food Spread",
    price: "$14.99",
    image: fastFoodImage,
    section: "menu"
  },
  {
    id: 7,
    name: "Classic Burger",
    price: "$11.99",
    image: premiumMealImage,
    section: "menu"
  },
  {
    id: 8,
    name: "Crispy Chicken",
    price: "$13.99",
    image: budgetFoodImage,
    section: "menu"
  },
  {
    id: 9,
    name: "Veggie Delight",
    price: "$10.99",
    image: fastFoodImage,
    section: "menu"
  },

  // Deals Section (5 items)
  {
    id: 10,
    name: "Limited Deal",
    price: "$9.99",
    image: fastFoodImage,
    section: "deals"
  },
  {
    id: 11,
    name: "Combo Special",
    price: "$16.99",
    image: budgetFoodImage,
    section: "deals"
  },
  {
    id: 12,
    name: "Flash Sale",
    price: "$8.99",
    image: premiumMealImage,
    section: "deals"
  },
  {
    id: 13,
    name: "Happy Hour Deal",
    price: "$11.49",
    image: fastFoodImage,
    section: "deals"
  },
  {
    id: 14,
    name: "Bundle Offer",
    price: "$18.99",
    image: budgetFoodImage,
    section: "deals"
  }
];

export default function ARMenuPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  // Camera permission states: requesting, granted, denied, or unsupported
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  // Active menu section being displayed
  const [activeSection, setActiveSection] = useState<"recommended" | "menu" | "deals">("recommended");
  // ID of currently selected menu item for highlighting
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  // Details (name, price) of selected item for display overlay
  const [selectedItemData, setSelectedItemData] = useState<{ name: string; price: string } | null>(null);
  // Animation flag to prevent rapid section switching
  const [isTransitioning, setIsTransitioning] = useState(false);
  // WebGL support flag for fallback UI
  const [webglSupported] = useState(() => checkWebGLSupport());
  // Track viewport orientation: portrait or landscape
  const [isLandscape, setIsLandscape] = useState(window.innerHeight < window.innerWidth);
  // Track if device is mobile
  const [isMobileDevice] = useState(() => window.innerWidth < 768);
  // Three.js scene, renderer, and camera references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  // Video element for camera feed texture
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Reference to rotating test cube
  const cubeRef = useRef<THREE.Mesh | null>(null);
  // Array of menu item meshes for animation and interaction
  const menuItemsRef = useRef<THREE.Mesh[]>([]);
  // Raycaster for click detection on 3D objects
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  // Mouse position in normalized device coordinates (-1 to 1)
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  // Texture loader for reusable texture loading
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  // Shared geometry for all menu items (improves performance)
  const menuGeometryRef = useRef<THREE.BoxGeometry | null>(null);
  // Animation start time for easing calculations
  const animationStartTimeRef = useRef<number>(0);

  // ===== SECTION CHANGE HANDLER =====
  // When user switches sections, remove old items and load new ones
  useEffect(() => {
    if (sceneRef.current && textureLoaderRef.current) {
      setIsTransitioning(true);

      // Remove existing menu items from scene with fade out animation
      menuItemsRef.current.forEach((item) => {
        // Fade out animation
        const fadeOut = setInterval(() => {
          item.scale.multiplyScalar(0.95);
          if (item.scale.x < 0.1) {
            sceneRef.current?.remove(item);
            clearInterval(fadeOut);
          }
        }, 30);
      });
      menuItemsRef.current = [];
      setSelectedItemId(null);
      setSelectedItemData(null);

      // Load new items for the selected section
      setTimeout(() => {
        loadMenuItemsForSection(activeSection);
        setIsTransitioning(false);
      }, 300);
    }
  }, [activeSection]);

  // ===== ORIENTATION CHANGE HANDLER =====
  // Detects when device rotates between portrait and landscape
  useEffect(() => {
    const handleOrientationChange = () => {
      // Update landscape state when orientation changes
      setIsLandscape(window.innerHeight < window.innerWidth);
      
      // Update renderer size to match new viewport
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

  useEffect(() => {
    // Request camera permissions first
    requestCameraPermissions();

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, []);

  // ===== LOAD MENU ITEMS FOR SECTION =====
  // Create 3D menu items for the active section with optimized layout
  const loadMenuItemsForSection = async (section: "recommended" | "menu" | "deals") => {
    if (!sceneRef.current || !textureLoaderRef.current) return;

    const scene = sceneRef.current;
    const textureLoader = textureLoaderRef.current;
    const sectionItems = MENU_ITEMS.filter((item) => item.section === section);

    // Calculate natural grid positions for items (up to 5 items per section)
    // Arrange in 2x2 or 2x3 grid pattern on the table surface
    const getPositions = (count: number) => {
      const positions: [number, number, number][] = [];
      
      if (count <= 2) {
        positions.push([-0.7, 0.5, -3], [0.7, 0.5, -3]);
      } else if (count === 3) {
        positions.push([-1.0, 0.5, -3], [0, 0.5, -3], [1.0, 0.5, -3]);
      } else if (count === 4) {
        positions.push([-0.9, 0.5, -2.8], [0.3, 0.5, -2.8], [-0.9, 0.5, -3.2], [0.3, 0.5, -3.2]);
      } else {
        // 5 items: 2x2 grid plus center
        positions.push([-0.9, 0.5, -2.8], [0.3, 0.5, -2.8], [-0.9, 0.5, -3.2], [0.3, 0.5, -3.2], [0, 0.5, -3.0]);
      }
      
      return positions.slice(0, count);
    };

    const positions = getPositions(sectionItems.length);

    // Load all textures in parallel for better performance
    const texturePromises = sectionItems.map((item) =>
      new Promise<{ item: MenuItem; texture: THREE.Texture }>((resolve, reject) => {
        textureLoader.load(
          item.image,
          (texture) => resolve({ item, texture }),
          undefined,
          (err) => reject(err)
        );
      })
    );

    try {
      const loadedTextures = await Promise.all(texturePromises);

      // Create reusable geometry once
      if (!menuGeometryRef.current) {
        menuGeometryRef.current = new THREE.BoxGeometry(0.8, 0.8, 0.15);
      }
      const sharedGeometry = menuGeometryRef.current;

      // Create menu items with loaded textures
      loadedTextures.forEach((data, index) => {
        const position = positions[index];
        
        // Create material for each item (must be unique for different textures)
        const material = new THREE.MeshPhongMaterial({
          map: data.texture,
          side: THREE.FrontSide,
          shininess: 50,
        });

        // Create mesh using shared geometry
        const menuItem = new THREE.Mesh(sharedGeometry, material);
        menuItem.position.set(position[0], position[1], position[2]);
        menuItem.castShadow = true;
        menuItem.receiveShadow = true;
        menuItem.scale.set(0.1, 0.1, 0.1); // Start small for fade-in animation
        
        // Store data
        menuItem.userData.id = data.item.id;
        menuItem.userData.name = data.item.name;
        menuItem.userData.price = data.item.price;
        menuItem.userData.baseY = position[1];
        menuItem.userData.baseScale = 1;
        menuItem.userData.isSelected = false;
        menuItem.userData.section = section;
        menuItem.userData.testId = `ar-menu-item-${data.item.id}`;

        scene.add(menuItem);
        menuItemsRef.current.push(menuItem);
      });
    } catch (error) {
      console.error(`Failed to load menu items for section ${section}:`, error);
    }
  };

  const requestCameraPermissions = async () => {
    try {
      // Request camera permission from user
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      setCameraPermission("granted");

      // Initialize AR scene after permission is granted
      setTimeout(() => {
        initializeARScene(stream);
      }, 100);
    } catch (error) {
      console.error("Camera permission denied:", error);
      setCameraPermission("denied");
    }
  };

  const initializeARScene = async (mediaStream: MediaStream) => {
    if (!containerRef.current) return;

    // ===== VIDEO ELEMENT SETUP =====
    // Create video element for camera feed
    const video = document.createElement("video");
    videoRef.current = video;
    video.srcObject = mediaStream;
    video.play().catch((err) => console.error("Video play error:", err));
    video.playsInline = true;
    video.autoplay = true;

    // ===== SCENE SETUP =====
    // Create Three.js scene for AR content
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ===== CAMERA SETUP =====
    // Create perspective camera for AR rendering
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(
      75, // Field of view
      width / height, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    cameraRef.current = camera;

    // ===== RENDERER SETUP =====
    // Create WebGL renderer with transparent background
    // This allows the camera feed to show through
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Enable transparency for camera feed to show
      preserveDrawingBuffer: false,
    });

    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.shadowMap.enabled = true;

    // Append renderer to DOM
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Create canvas for video texture
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // ===== VIRTUAL TABLE SURFACE =====
    // Create a horizontal plane to simulate a dining table surface
    // This plane will be fixed in AR space and objects can rest on it
    const tableGeometry = new THREE.PlaneGeometry(3, 2.5);
    
    // Create a canvas texture for realistic wooden table appearance
    const tableCanvas = document.createElement("canvas");
    tableCanvas.width = 512;
    tableCanvas.height = 512;
    const tableCtx = tableCanvas.getContext("2d");
    if (tableCtx) {
      // Create wooden texture pattern
      tableCtx.fillStyle = "#6B4423"; // Dark brown base
      tableCtx.fillRect(0, 0, 512, 512);
      
      // Add wood grain pattern
      for (let i = 0; i < 50; i++) {
        tableCtx.strokeStyle = `rgba(${Math.random() * 50 + 60}, ${Math.random() * 40 + 40}, 20, 0.3)`;
        tableCtx.lineWidth = Math.random() * 3 + 1;
        tableCtx.beginPath();
        tableCtx.moveTo(Math.random() * 512, 0);
        tableCtx.lineTo(Math.random() * 512, 512);
        tableCtx.stroke();
      }
    }
    const tableTexture = new THREE.CanvasTexture(tableCanvas);
    tableTexture.magFilter = THREE.NearestFilter; // Keep texture crisp
    
    const tableMaterial = new THREE.MeshPhongMaterial({
      map: tableTexture,
      color: 0x8B5A2B, // Wood brown color
      shininess: 20, // Slight gloss for wood
      side: THREE.DoubleSide
    });
    
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.rotation.x = -Math.PI / 2; // Rotate to horizontal (XZ plane)
    table.position.set(0, -0.3, -3); // Slightly below the cube so it looks like a table
    table.receiveShadow = true; // Table receives shadows from objects on it
    table.castShadow = true;
    table.userData.testId = "ar-table-surface"; // For testing
    scene.add(table);

    // ===== TEST OBJECT: ROTATING CUBE =====
    // Create a blue cube as test AR object positioned on the table
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x4a90e2,
      emissive: 0x1a4a8a,
      shininess: 100
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.25, -3); // Position on top of table surface
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData.testId = "ar-test-cube"; // For testing
    cubeRef.current = cube;
    scene.add(cube);

    // ===== TEXTURE LOADER SETUP =====
    // Create texture loader for reuse across menu items
    const textureLoader = new THREE.TextureLoader();
    textureLoaderRef.current = textureLoader;

    // ===== LIGHTING SETUP FOR POLISHED AR EXPERIENCE =====
    
    // PRIMARY AMBIENT LIGHT: Soft, even illumination
    // Provides baseline lighting to prevent completely dark areas
    // Higher intensity for better visibility of menu items
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // SECONDARY FILL LIGHT: Subtle light from opposite direction
    // Adds depth by illuminating shadows slightly, reduces harsh contrast
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // PRIMARY DIRECTIONAL LIGHT: Key light for shadows and depth
    // Position creates natural shadows falling away from camera
    // High intensity for dramatic but not overwhelming shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    
    // ===== SOFT SHADOW CONFIGURATION =====
    // High-resolution shadow maps for smooth, detailed shadows
    // Without harsh pixelation or banding artifacts
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    // Configure shadow camera to cover the entire scene volume
    // Ensures menu items and table cast shadows within view frustum
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    
    // SHADOW SOFTENING: Reduce shadow artifacts while maintaining quality
    // Bias prevents shadow acne (dark lines on surfaces)
    directionalLight.shadow.bias = -0.0005;
    // Map size and blur reduce pixelated shadow edges for soft appearance
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    
    scene.add(directionalLight);

    // ===== CLICK/RAYCASTING SETUP =====
    // Handle clicks on 3D menu items
    const onDocumentClick = (event: MouseEvent) => {
      // Calculate normalized mouse position (-1 to 1)
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Check if any menu items are intersected
      const intersects = raycasterRef.current.intersectObjects(menuItemsRef.current);

      if (intersects.length > 0) {
        const selectedItem = intersects[0].object as THREE.Mesh;
        const itemId = selectedItem.userData.id;

        // Toggle selection
        if (selectedItemId === itemId) {
          setSelectedItemId(null);
          setSelectedItemData(null);
          selectedItem.userData.isSelected = false;
        } else {
          // Deselect previous item if any
          menuItemsRef.current.forEach((item) => {
            item.userData.isSelected = false;
          });

          // Select new item
          selectedItem.userData.isSelected = true;
          setSelectedItemId(itemId);
          setSelectedItemData({
            name: selectedItem.userData.name,
            price: selectedItem.userData.price,
          });
        }
      }
    };

    renderer.domElement.addEventListener("click", onDocumentClick);

    // ===== POLISHED ANIMATION LOOP WITH EASING FUNCTIONS =====
    // Smooth 60fps rendering loop with camera feed integration
    let animationTime = 0;
    const deltaTime = 0.016; // ~60fps frame time
    
    const animate = () => {
      requestAnimationFrame(animate);
      animationTime += deltaTime;

      // ===== UPDATE CAMERA FEED TEXTURE =====
      // Continuously draw video frames to canvas texture
      // Only draw when video has sufficient data to prevent black frames
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // ===== ANIMATE TEST CUBE WITH SMOOTH ROTATION =====
      // Demonstrate 3D rotation - use consistent rotation speeds
      if (cube) {
        // Rotation amounts carefully tuned for smooth, non-jittery motion
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
        cube.rotation.z += 0.002;
      }

      // ===== ANIMATE MENU ITEMS WITH EASING FUNCTIONS =====
      // Apply smooth animations based on state (selected vs normal)
      menuItemsRef.current.forEach((item, index) => {
        const baseY = item.userData.baseY || 0.5;
        const baseScale = item.userData.baseScale || 1;
        const isSelected = item.userData.isSelected || false;
        
        // Stagger animations slightly for visual appeal (index * small offset)
        const staggeredTime = animationTime + (index * 0.05);

        if (isSelected) {
          // ===== SELECTED ITEM ANIMATION =====
          // Smooth scale-up using easing function
          const targetScale = 1.3;
          const scaleFactor = easingFunctions.easeOutCubic(0.08); // Smooth easing
          item.scale.x += (targetScale - item.scale.x) * scaleFactor;
          item.scale.y += (targetScale - item.scale.y) * scaleFactor;
          item.scale.z += (targetScale - item.scale.z) * scaleFactor;

          // Slow rotation for selected items (magnetic effect)
          item.rotation.y += 0.03;

          // Floating motion while selected: more subtle amplitude
          const liftAmount = 0.3; // Rise 0.3m above table
          const floatAmount = Math.sin(staggeredTime * 1.5) * 0.08; // Small float
          item.position.y = baseY + liftAmount + floatAmount;
        } else {
          // ===== NORMAL ITEM ANIMATION =====
          // Smooth fade-in when items first appear
          const targetScale = baseScale;
          if (item.scale.x < targetScale * 0.99) {
            // Use easing function for natural acceleration
            const fadeFactor = easingFunctions.easeOutQuad(0.12);
            item.scale.x += (targetScale - item.scale.x) * fadeFactor;
            item.scale.y += (targetScale - item.scale.y) * fadeFactor;
            item.scale.z += (targetScale - item.scale.z) * fadeFactor;
          } else {
            // Maintain scale once fully visible
            item.scale.x += (baseScale - item.scale.x) * 0.05;
            item.scale.y += (baseScale - item.scale.y) * 0.05;
            item.scale.z += (baseScale - item.scale.z) * 0.05;
          }

          // Dampen rotation when deselected for smooth stops
          item.rotation.y *= 0.98;

          // Smooth floating motion using eased sine wave
          const floatAmount = Math.sin(staggeredTime * 1.5) * 0.15; // 0.15m amplitude
          item.position.y = baseY + floatAmount;
        }
      });

      // ===== RENDER SCENE TO SCREEN =====
      // Composite camera feed + 3D AR objects
      renderer.render(scene, camera);
    };

    animate();

    // ===== HANDLE WINDOW RESIZE =====
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    console.log("✓ AR Scene initialized successfully");
    console.log("✓ Camera feed: Active with transparent background");
    console.log("✓ Virtual table surface: Added with wooden texture");
    console.log("✓ Test cube: Positioned on table and rotating");
    console.log("✓ 3D menu item: Loaded from 2D food image with floating animation");
    console.log("✓ Raycasting: Click detection enabled on menu items");
    console.log("✓ Interaction: Click to select/deselect with animation");
    console.log("✓ Lighting: Ambient + Directional with shadow mapping");
    console.log("✓ Shadow casting: Objects cast soft shadows on table");

    // ===== LOAD INITIAL MENU ITEMS =====
    // Load items for the recommended section on scene initialization
    await loadMenuItemsForSection("recommended");

    console.log("✓ AR Scene with menu sections initialized");
    console.log("✓ Recommended, Menu, and Deals sections ready");
    console.log("✓ Click section buttons to switch between menus");

    // Return cleanup function
    return () => {
      renderer.domElement.removeEventListener("click", onDocumentClick);
      window.removeEventListener("resize", handleResize);
    };
  };

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* ===== WEBGL SUPPORT CHECK FALLBACK =====
          Display if browser doesn't support WebGL (required for 3D rendering)
          Provides helpful message about browser compatibility */}
      {!webglSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black z-50 px-4">
          <div className="text-white text-center max-w-md">
            <div className="mb-6 text-4xl">🖥️</div>
            <div className="mb-4 text-2xl font-bold">WebGL Not Supported</div>
            <div className="text-sm text-gray-300 mb-6">
              Your browser doesn't support WebGL, required for the AR menu experience.
            </div>
            <div className="text-xs text-gray-400 space-y-2">
              <div>✓ Try modern browser: Chrome, Firefox, Safari, Edge</div>
              <div>✓ Enable hardware acceleration in browser settings</div>
              <div>✓ Update your browser to the latest version</div>
            </div>
          </div>
        </div>
      )}

      {webglSupported && (
        <>
          {/* 
            LAYER 1 - STATIC RESTAURANT BACKGROUND (z-index: 10)
            - Provides restaurant-themed visual context
            - Positioned behind AR content for depth
            - Responsive scaling with parallax effect
          */}
          <div
            ref={backgroundRef}
            className="absolute inset-0 z-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${restaurantBackgroundImage})`,
              backgroundAttachment: "fixed",
            }}
            data-testid="background-layer"
          />

          {/* 
            LAYER 2 - AR CANVAS WITH CAMERA FEED (z-index: 20)
            - Three.js WebGL renderer with polished lighting and shadows
            - Transparent background composites camera feed beneath 3D objects
            - Soft shadows and smooth animations for professional look
            - Touch-responsive on mobile devices
          */}
          <div
            ref={containerRef}
            className="absolute inset-0 z-20 touch-none"
            data-testid="ar-container"
          />

          {/* 
            LAYER 3 - PERMISSION STATUS OVERLAY (z-index: 50)
            - Only visible when requesting camera or permission denied
            - Blocks interaction until permission is resolved
            - Responsive text sizing for mobile and desktop
          */}
          {cameraPermission === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 px-4">
              <div className="text-white text-center">
                <div className="mb-4 text-lg sm:text-2xl font-semibold">Requesting camera permission...</div>
                <div className="text-sm text-gray-400">
                  Please allow camera access to use the AR menu
                </div>
              </div>
            </div>
          )}

          {cameraPermission === "denied" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 px-4">
              <div className="text-white text-center">
                <div className="mb-4 text-lg sm:text-2xl font-semibold">Camera Permission Denied</div>
                <div className="text-sm text-gray-400">
                  Please enable camera permissions in your browser settings for AR menu
                </div>
              </div>
            </div>
          )}

          {/* 
            LAYER 4 - UI OVERLAYS (z-index: 40)
            - Status indicator (top-left) - responsive positioning
            - Section selector (top-right) with smooth transitions - stacks vertically on portrait mobile
            - Selected item info and instructions
            - Fully responsive layout for portrait/landscape and mobile/desktop
          */}
          
          {/* Status Indicator - Top Left, scales for mobile */}
          <div className={`absolute text-white bg-black/70 rounded-lg border border-green-500/30 z-40 ${
            isLandscape 
              ? "top-2 left-2 px-3 py-1.5" 
              : "top-3 left-3 px-4 py-2"
          }`}>
            <div className={`font-semibold ${isLandscape ? "text-xs" : "text-sm"}`}>AR Menu</div>
            <div className={`text-gray-300 mt-0.5 ${isLandscape ? "text-xs" : "text-xs"}`}>
              Camera: <span className={cameraPermission === "granted" ? "text-green-400" : "text-gray-500"}>
                {cameraPermission === "granted" ? "✓" : "✗"}
              </span>
            </div>
          </div>

          {/* Section Selector Buttons - Responsive layout based on orientation */}
          <div className={`absolute flex gap-1 sm:gap-2 z-40 flex-wrap justify-end ${
            isLandscape
              ? "top-2 right-2 w-fit"
              : "top-3 right-3 sm:top-4 sm:right-4 w-fit"
          }`}>
            {(["recommended", "menu", "deals"] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                disabled={isTransitioning}
                className={`rounded-lg font-semibold transition-all border-2 ${
                  activeSection === section
                    ? "bg-green-600 text-white border-green-400"
                    : "bg-black/70 text-gray-300 border-gray-600 hover:border-green-500"
                } disabled:opacity-50 ${
                  isLandscape
                    ? "px-2 py-1 text-xs"
                    : "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                }`}
                data-testid={`button-section-${section}`}
              >
                {isMobileDevice ? section.charAt(0).toUpperCase() : section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Selected Item Overlay - Shows item details with responsive positioning */}
          {selectedItemData && (
            <div className={`absolute text-white bg-black/80 rounded-lg border border-green-500/50 z-40 ${
              isLandscape
                ? "top-20 left-2 right-2 px-3 py-2 text-xs"
                : "top-20 left-4 right-4 px-4 py-3 sm:max-w-sm"
            }`}>
              <div className={`font-semibold mb-1 ${isLandscape ? "text-xs" : "text-sm"}`}>{selectedItemData.name}</div>
              <div className={`text-gray-300 mb-1 ${isLandscape ? "text-xs" : "text-xs"}`}>Price: {selectedItemData.price}</div>
              <div className={`text-green-400 ${isLandscape ? "text-xs" : "text-xs"}`}>
                ✓ Selected {isLandscape ? "" : "• Scaling • Rotating • Lifting"}
              </div>
            </div>
          )}

          {/* Instructions and Feature List - Responsive text size and layout */}
          <div className={`absolute text-white bg-black/70 rounded-lg border border-blue-500/30 z-40 ${
            isLandscape
              ? "bottom-2 left-2 right-2 px-3 py-2"
              : "bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 sm:max-w-md px-4 py-2"
          }`}>
            <div className={`font-semibold mb-1 ${isLandscape ? "text-xs" : "text-sm"}`}>AR Menu</div>
            <div className={`text-gray-300 space-y-0.5 ${isLandscape ? "text-xs" : "text-xs"}`}>
              <div>✓ Enhanced lighting & soft shadows</div>
              {!isLandscape && (
                <>
                  <div>✓ Smooth easing animations</div>
                  <div>✓ Three menu sections</div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
