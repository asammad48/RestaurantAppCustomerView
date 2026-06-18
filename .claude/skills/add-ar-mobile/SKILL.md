---
description: Enhance the existing AR menu page (client/src/pages/ar-restaurant-menu.tsx) with mobile-first features: pre-load a specific item via ?itemId= URL param, show a gesture tutorial overlay on first open, and add a floating per-item "Try in AR" quick-launch button on the restaurant menu page.
---

# Skill: AR Mobile Enhancements

## What this skill does

Three targeted improvements to the existing AR experience at `/restaurant-menu/ar`:

1. **`?itemId=` URL param** — navigating to `/restaurant-menu/ar?branchId=X&itemId=Y` automatically adds item Y to the AR scene so users land with their chosen dish already visible.
2. **Gesture hint overlay** — on mobile, a brief animated tutorial (tap / pinch / drag) is shown for 3.5 s on the first open when the scene is empty. Disappears automatically.
3. **"Try in AR" button on menu page** — a floating action button on `restaurant-menu.tsx` (mobile only, `lg:hidden`) that opens AR with the most-recently-viewed item pre-loaded.

## File map

```
client/src/
  pages/
    ar-restaurant-menu.tsx    ← MODIFY (gesture hint + itemId param)
    restaurant-menu.tsx       ← MODIFY (optional: "Try in AR" FAB)
```

## Step 1 — `ar-restaurant-menu.tsx` changes

### 1a. Read `?itemId=` on mount

Add a ref to store the initial item ID (ref avoids re-renders):

```ts
const initialItemIdRef = useRef<number | null>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('itemId');
  if (id) initialItemIdRef.current = parseInt(id, 10);
}, []);
```

### 1b. Auto-add item when menu data loads

Place this effect after `apiMenuData` is derived, before the `uniqueCategories` memo:

```ts
useEffect(() => {
  if (!apiMenuData?.menuItems || initialItemIdRef.current === null) return;
  const target = apiMenuData.menuItems.find(m => m.menuItemId === initialItemIdRef.current);
  if (target) {
    handleAddItemToAR(target);
    initialItemIdRef.current = null; // prevent re-add on subsequent renders
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [apiMenuData]);
```

> `handleAddItemToAR` is defined later in the component but the effect only runs after render, so the closure is safe.

### 1c. Gesture hint component

Add this standalone component **above** the `ARRestaurantMenuPage` default export:

```tsx
function GestureHint({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-black/70 backdrop-blur-xl rounded-3xl px-8 py-7 flex flex-col items-center gap-5 border border-white/10"
      >
        {[
          { emoji: '👆', anim: { rotate: [0, 15, -15, 0] }, label: 'Tap item to select' },
          { emoji: '🤏', anim: { scale: [1, 1.25, 1] },     label: 'Pinch to scale'      },
          { emoji: '✋', anim: { x: [-8, 8, -8] },           label: 'Drag to move'        },
        ].map(({ emoji, anim, label }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-4 bg-white/20" />}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={anim}
                transition={{ repeat: Infinity, duration: 1.4 + i * 0.1, ease: 'easeInOut' }}
                className="text-4xl select-none"
              >
                {emoji}
              </motion.div>
              <p className="text-white text-sm font-semibold">{label}</p>
            </div>
          </React.Fragment>
        ))}
      </motion.div>
    </motion.div>
  );
}
```

### 1d. State and JSX for gesture hint

Inside `ARRestaurantMenuPage`:

```ts
const [showGestureHint, setShowGestureHint] = useState(isMobile);
```

In the JSX, place this **inside** the main overlay `<div>`, after the "Tap an item to interact" hint:

```tsx
<AnimatePresence>
  {isMobile && showGestureHint && arItems.length === 0 && (
    <GestureHint onDone={() => setShowGestureHint(false)} />
  )}
</AnimatePresence>
```

`AnimatePresence` is already imported from `framer-motion` in this file.

## Step 2 — `restaurant-menu.tsx` optional "Try in AR" FAB

If a user long-presses or clicks a food card's details, they might want to jump straight to AR. Add a floating "AR" pill button on mobile near the existing cart button.

Find the existing mobile AR button block around line 990:
```tsx
<div className="flex gap-2 lg:hidden">
  <Button onClick={() => setLocation(`/restaurant-menu/ar?branchId=${selectedBranch?.branchId}`)} ...>
    <Glasses className="w-4 h-4" />
    <span className="hidden xs:inline">AR Menu</span>
    <span className="xs:hidden">AR</span>
  </Button>
  ...
</div>
```

This button already exists — no changes needed unless you want to add `&itemId=` support for the last-viewed item (optional enhancement).

## How `?itemId=` flow works end-to-end

```
food-card.tsx  →  View3DModal "View in AR" button
                  setLocation(`/restaurant-menu/ar?branchId=X&itemId=Y`)
                         ↓
ar-restaurant-menu.tsx  useEffect reads itemId on mount
                         ↓
                  waits for apiMenuData to load
                         ↓
                  calls handleAddItemToAR(target)  →  item appears in AR scene
```

## Verification checklist

- [ ] Navigate to `/restaurant-menu/ar?branchId=1&itemId=5` — item 5 appears in scene on load
- [ ] On mobile (≤768 px), gesture hint overlay appears for ~3.5 s then fades
- [ ] Gesture hint does NOT appear on desktop
- [ ] Gesture hint does NOT appear if scene already has items (e.g., navigated from AR page itself)
- [ ] `initialItemIdRef.current` is nulled after first add (no double-add on re-renders)
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit`

## Common pitfalls

- `isMobile` from `useIsMobile()` may be `false` on first render on mobile (SSR/hydration). If hint never shows, initialise `showGestureHint` to `true` unconditionally and gate the render on `isMobile`.
- The `useEffect` that auto-adds the item must list `[apiMenuData]` as a dependency — not `[apiMenuData?.menuItems]` — otherwise it may not fire when the query resolves.
- `handleAddItemToAR` reads `arItems.length` from a closure. For the initial auto-add (when `arItems` is `[]`), the offset branch `arItems.length > 0` is false, so the item lands at `[0,0,0]`. This is correct.
- Do not call `useIsMobile()` inside the `GestureHint` component — it's already evaluated in the parent and passed/gated there.
