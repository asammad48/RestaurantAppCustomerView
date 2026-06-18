---
description: Add an interactive 3D model viewer modal to food cards in this restaurant app. Opens a fullscreen Three.js canvas with auto-rotate, touch orbit/zoom controls, item info, and an "Add to Cart" / "View in AR" action row — optimised for mobile.
---

# Skill: Add 3D Viewer to Food Cards

## What this skill does

Creates `client/src/components/modals/view-3d-modal.tsx` and wires it into `client/src/components/food-card.tsx` so every `ApiMenuItem` card shows a **cube icon (Box)** button on its image. Tapping the icon opens a fullscreen 3D viewer.

## Stack already available (no new installs needed)

| Package | Purpose |
|---------|---------|
| `@react-three/fiber` | React renderer for Three.js (`Canvas`, `useFrame`) |
| `@react-three/drei` | Helpers: `OrbitControls`, `useGLTF`, `Environment`, `ContactShadows` |
| `three` | Core 3D maths and types |
| `framer-motion` | Modal entry/exit animations |
| `lucide-react` | Icons (`Box`, `Glasses`, `ShoppingBag`, `RotateCcw`, `X`) |

## File map

```
client/src/
  components/
    food-card.tsx              ← add import + state + 3D button per variant
    modals/
      view-3d-modal.tsx        ← CREATE THIS (self-contained)
```

## Step-by-step implementation

### 1. Create `view-3d-modal.tsx`

Key responsibilities:

```
View3DModal
├── Model3D            – loads GLB via useGLTF, auto-scales to fit 1.8 units,
│                        rotates on Y axis when autoRotate=true
├── FallbackSphere     – shown when threeDObject is absent
├── ModelLoader        – wraps Model3D in <Suspense> with a wireframe placeholder
└── View3DModal        – the exported default; Framer Motion AnimatePresence
    ├── top bar        – Close (X), "3D View" pill label, auto-rotate toggle
    ├── Canvas         – shadows, dpr=[1,2], radial gradient background
    │   ├── lights     – ambient + two spotlights (warm + cool accent)
    │   ├── Environment preset="city"
    │   ├── ModelLoader
    │   ├── ContactShadows
    │   └── OrbitControls  – enablePan=false, minDistance=2, maxDistance=9
    ├── gesture hint   – fades out after 3 s ("Drag to rotate · Pinch to zoom")
    └── bottom panel   – category, name, description, price, discount badge,
                         [View in AR]  [Add to Cart]
```

**Model auto-scaling pattern** (copy exactly):
```ts
const box = new THREE.Box3().setFromObject(cloned);
const size = new THREE.Vector3();
box.getSize(size);
const maxDim = Math.max(size.x, size.y, size.z);
const s = 1.8 / (maxDim || 1);
cloned.scale.set(s, s, s);
const center = new THREE.Vector3();
box.getCenter(center);
cloned.position.set(-center.x * s, -center.y * s, -center.z * s);
```

**"View in AR" navigation**:
```ts
setLocation(`/restaurant-menu/ar?branchId=${selectedBranch?.branchId}&itemId=${item.menuItemId}`);
```
This pairs with the AR skill (see `/add-ar-mobile`) which reads `?itemId=` and pre-loads that item.

**Price display** — use `formatBranchCurrency(price, branchCurrency)` from `@/lib/utils` and `branchCurrency` from `useCartStore()`.

**Branch primary colour** — read from `selectedBranch?.primaryColor` for buttons/badges.

### 2. Update `food-card.tsx`

Add at the top of the file:
```ts
import View3DModal from "@/components/modals/view-3d-modal";
import { Box } from "lucide-react";
```

Add state alongside the existing modal state:
```ts
const [is3DModalOpen, setIs3DModalOpen] = useState(false);
```

For **each** of the three render branches (`"list"`, `"compact"`, `"grid"` / default), inside the JSX:

1. Render the modal (only for ApiMenuItem):
```tsx
{isApiMenuItem(item) && (
  <View3DModal item={item} isOpen={is3DModalOpen} onClose={() => setIs3DModalOpen(false)} />
)}
```

2. Add a Box icon button overlaid on the food image (position varies by variant):

| Variant | Position classes |
|---------|-----------------|
| `grid` (default) | `absolute bottom-3 right-3`, button `h-8 w-8` |
| `list` | `absolute bottom-2 right-2`, button `h-7 w-7` |
| `compact` | `absolute bottom-0.5 right-0.5`, button `h-6 w-6` |

Button template:
```tsx
{isApiMenuItem(item) && (
  <button
    className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white rounded-full
               h-8 w-8 flex items-center justify-center border border-white/20
               hover:bg-black/80 transition-all active:scale-90 shadow-lg"
    onClick={(e) => { e.stopPropagation(); setIs3DModalOpen(true); }}
    title="View in 3D"
  >
    <Box className="h-4 w-4" />
  </button>
)}
```
Adjust `h-` / `w-` / `Box` icon size for each variant.

## Verification checklist

- [ ] `view-3d-modal.tsx` compiles with no TS errors (`npx tsc --noEmit`)
- [ ] Box icon appears on food card images
- [ ] Tapping the icon opens the fullscreen modal
- [ ] 3D model auto-rotates and can be orbit-controlled by touch
- [ ] "View in AR" button navigates to `/restaurant-menu/ar?itemId=<id>`
- [ ] "Add to Cart" opens the existing `AddToCartModal`
- [ ] Modal closes cleanly (camera/streams not started here, no cleanup needed)
- [ ] Tested on mobile viewport (375 px wide)

## Common pitfalls

- `useGLTF` must be called unconditionally — always pass a path (use `'/models/food_1.glb'` as fallback when `threeDObject` is absent)
- `OrbitControls` requires `enableDamping` + `dampingFactor` for smooth mobile feel
- Wrap `useGLTF` call in `<Suspense>` or the whole page suspends
- Set `style={{ touchAction: 'none' }}` on the Canvas wrapper div to prevent scroll interference on mobile
- `gl={{ alpha: false }}` gives a solid background; `alpha: true` makes the canvas transparent (shows page behind it)
