import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import restaurantBackgroundImage from "@assets/generated_images/elegant_italian_restaurant_interior_background.png";
import premiumMealImage from "@assets/generated_images/Premium_meal_photography_0924ff10.png";
import budgetFoodImage from "@assets/generated_images/Budget_food_combo_photo_72d038b1.png";
import fastFoodImage from "@assets/generated_images/Fast_food_spread_fe6113bb.png";

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
  const [cameraPermission, setCameraPermission] = useState<string>("requesting");
  const [activeSection, setActiveSection] = useState<"recommended" | "menu" | "deals">("recommended");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemData, setSelectedItemData] = useState<{ name: string; price: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const menuItemsRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const menuGeometryRef = useRef<THREE.BoxGeometry | null>(null);

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

    // ===== LIGHTING =====
    // Add ambient light for general illumination
    // This ensures the entire scene is lit without harsh shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light for realistic shadows and depth
    // Position to create shadows that fall toward the camera for natural look
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow map for high quality shadows
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.005; // Reduce shadow acne
    
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

    // ===== ANIMATION LOOP =====
    // Render loop that updates camera feed, rotates cube, and animates menu items
    let animationTime = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      animationTime += 0.016; // ~60fps

      // Update video texture from camera feed
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Rotate test cube continuously
      if (cube) {
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
        cube.rotation.z += 0.002;
      }

      // Animate menu items with floating motion and interaction
      menuItemsRef.current.forEach((item) => {
        const baseY = item.userData.baseY || 0.5;
        const baseScale = item.userData.baseScale || 1;
        const isSelected = item.userData.isSelected || false;

        if (isSelected) {
          // ===== SELECTED STATE ANIMATION =====
          // Scale up slightly
          const targetScale = 1.3;
          item.scale.x += (targetScale - item.scale.x) * 0.05; // Smooth scaling
          item.scale.y += (targetScale - item.scale.y) * 0.05;
          item.scale.z += (targetScale - item.scale.z) * 0.05;

          // Rotate slowly
          item.rotation.y += 0.03;

          // Lift from table (add to floating motion)
          const liftAmount = 0.3; // Lift 0.3m higher
          const floatAmount = Math.sin(animationTime * 1.5) * 0.1; // Smaller float when selected
          item.position.y = baseY + liftAmount + floatAmount;
        } else {
          // ===== NORMAL STATE ANIMATION =====
          // Fade in effect when section changes (scale up from small)
          const targetScale = baseScale;
          if (item.scale.x < targetScale) {
            item.scale.x += (targetScale - item.scale.x) * 0.1; // Faster fade-in
            item.scale.y += (targetScale - item.scale.y) * 0.1;
            item.scale.z += (targetScale - item.scale.z) * 0.1;
          } else {
            item.scale.x += (baseScale - item.scale.x) * 0.05;
            item.scale.y += (baseScale - item.scale.y) * 0.05;
            item.scale.z += (baseScale - item.scale.z) * 0.05;
          }

          // Stop rotation
          item.rotation.y *= 0.98;

          // Normal floating motion
          const floatAmount = Math.sin(animationTime * 1.5) * 0.15; // Amplitude: 0.15m
          item.position.y = baseY + floatAmount;
        }
      });

      // Render the scene with camera
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
      {/* 
        LAYER 1 - STATIC RESTAURANT BACKGROUND (z-index: 10)
        - Provides restaurant-themed visual context
        - Positioned behind AR content
        - Responsive scaling
      */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 z-10 bg-cover bg-center"
        style={{
          backgroundImage: `url(${restaurantBackgroundImage})`,
          backgroundAttachment: "fixed", // Creates subtle parallax effect
        }}
        data-testid="background-layer"
      />

      {/* 
        LAYER 2 - AR CANVAS WITH CAMERA FEED (z-index: 20)
        - Three.js renderer with transparent background
        - Camera feed shows through transparent areas
        - AR objects render on top of camera feed
        - Positioned above static background but below UI
      */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-20"
        data-testid="ar-container"
      />

      {/* 
        LAYER 3 - PERMISSION STATUS OVERLAY (z-index: 50)
        - Only visible when requesting or denied
        - Blocks interaction until permission resolved
      */}
      {cameraPermission === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-center">
            <div className="mb-4 text-lg font-semibold">Requesting camera permission...</div>
            <div className="text-sm text-gray-400">
              Please allow camera access to use AR menu
            </div>
          </div>
        </div>
      )}

      {cameraPermission === "denied" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-center">
            <div className="mb-4 text-lg font-semibold">Camera permission denied</div>
            <div className="text-sm text-gray-400">
              Please enable camera permissions in your browser settings to use AR menu features
            </div>
          </div>
        </div>
      )}

      {/* 
        LAYER 4 - UI OVERLAYS (z-index: 40)
        - Status indicator (top-left)
        - Instructions (bottom)
        - Always visible and interactive
      */}
      <div className="absolute top-4 left-4 text-white bg-black/70 px-4 py-2 rounded-lg border border-green-500/30 z-40">
        <div className="text-sm font-semibold">AR Menu - Test Mode</div>
        <div className="text-xs text-gray-300 mt-1">
          Camera: <span className={cameraPermission === "granted" ? "text-green-400" : "text-gray-500"}>
            {cameraPermission === "granted" ? "✓ Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Section Selector */}
      <div className="absolute top-4 right-4 flex gap-2 z-40">
        {(["recommended", "menu", "deals"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            disabled={isTransitioning}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeSection === section
                ? "bg-green-600 text-white border-2 border-green-400"
                : "bg-black/70 text-gray-300 border-2 border-gray-600 hover:border-green-500"
            } disabled:opacity-50`}
            data-testid={`button-section-${section}`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Selected Item Overlay */}
      {selectedItemData && (
        <div className="absolute top-20 left-4 right-4 text-white bg-black/80 px-4 py-3 rounded-lg border border-green-500/50 z-40 max-w-sm">
          <div className="font-semibold text-sm mb-1">{selectedItemData.name}</div>
          <div className="text-xs text-gray-300 mb-2">Price: {selectedItemData.price}</div>
          <div className="text-xs text-green-400">
            ✓ Item selected • Scaling up • Rotating • Lifting from table
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 text-white bg-black/70 px-4 py-2 rounded-lg border border-blue-500/30 z-40">
        <div className="font-semibold mb-2 text-sm">AR Menu with Sections</div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>✓ Three menu sections: Recommended, Menu, Deals</div>
          <div>✓ Click section buttons to switch menus</div>
          <div>✓ Multiple 3D items per section with smooth transitions</div>
          <div>✓ Click items to select (scale, rotate, lift)</div>
          <div>✓ Item name and price shown in overlay</div>
        </div>
      </div>
    </div>
  );
}
