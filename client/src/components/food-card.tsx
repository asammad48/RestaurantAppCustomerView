import { useState } from "react";
import { Plus } from "lucide-react";
import { MenuItem, ApiMenuItem } from "@/lib/mock-data";
import { useCartStore } from "@/lib/store";
import { getImageUrl } from "@/lib/config";
import { formatBranchCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MenuItemDetailModal from "@/components/modals/menu-item-detail-modal";

interface FoodCardProps {
  item: MenuItem | ApiMenuItem;
  variant?: "grid" | "list" | "compact";
  isRecommended?: boolean;
  className?: string;
}

export default function FoodCard({ item, variant = "grid", isRecommended = false, className = "" }: FoodCardProps) {
  const { addItem, setAddToCartModalOpen, setLastAddedItem, branchCurrency } = useCartStore();
  const { toast } = useToast();

  const isApiMenuItem = (item: any): item is ApiMenuItem => 'menuItemId' in item;

  const getVariations = () => {
    if (isApiMenuItem(item) && item.variations) {
      return item.variations.map(v => ({ name: v.id.toString(), label: v.name, price: v.price }));
    }
    const basePrice = isApiMenuItem(item)
      ? (item.variations && item.variations.length > 0 ? item.variations[0].price : 0)
      : parseFloat(item.price as string);
    return [
      { name: "small", label: "Small", price: basePrice * 0.8 },
      { name: "medium", label: "Medium", price: basePrice },
      { name: "large", label: "Large", price: basePrice * 1.3 },
    ];
  };

  const sizes = getVariations();
  const defaultSize = sizes.length > 0 ? sizes[0].name : "medium";
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getPrice = () => {
    if (isApiMenuItem(item)) return item.variations && item.variations.length > 0 ? item.variations[0].price : 0;
    return parseFloat(item.price as string);
  };
  const getImage = () => (isApiMenuItem(item) ? getImageUrl(item.picture) : (item as MenuItem).image);
  const getCategory = () => (isApiMenuItem(item) ? item.categoryName : (item as MenuItem).category);
  const getDiscount = () => (isApiMenuItem(item) ? (item.discount?.value || 0) : ((item as MenuItem).discount || 0));

  const currentPrice = sizes.find(s => s.name === selectedSize)?.price || getPrice();
  const totalPrice = currentPrice;
  const discountPercentage = getDiscount();
  const discountedPrice = discountPercentage > 0 ? totalPrice * (1 - discountPercentage / 100) : totalPrice;
  const originalPrice = totalPrice;

  // Minimum-clicks: only items with modifiers/customizations need the modal.
  const needsModal =
    isApiMenuItem(item) &&
    (((item.modifiers?.length ?? 0) > 0) || ((item.customizations?.length ?? 0) > 0));

  const itemId = isApiMenuItem(item) ? item.menuItemId : (item as MenuItem).id;

  const handleAdd = () => {
    const selectedVariant = sizes.find(s => s.name === selectedSize);

    if (needsModal) {
      setLastAddedItem(item);
      setAddToCartModalOpen(true);
      return;
    }

    // One-tap add of the selected variation.
    let selectedVariantId: number | undefined;
    if (isApiMenuItem(item) && selectedVariant) selectedVariantId = parseInt(selectedVariant.name);

    const itemWithVariation = {
      ...item,
      price: (selectedVariant?.price ?? totalPrice).toFixed(2),
      selectedVariantId,
      variantName: selectedVariant?.label || "Regular",
      variantPrice: selectedVariant?.price ?? totalPrice,
    };

    addItem(itemWithVariation as any, isApiMenuItem(item) && selectedVariant ? selectedVariant.name : "default");
    toast({
      title: "Added to cart",
      description: `${item.name}${selectedVariant ? ` · ${selectedVariant.label}` : ""}`,
    });
  };

  const PriceBlock = ({ size = "base" }: { size?: "base" | "sm" | "lg" }) => {
    const cls = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
    return discountPercentage > 0 ? (
      <div className="flex items-baseline gap-1.5">
        <span className={`${cls} font-extrabold`} style={{ color: "var(--color-primary)" }}>
          {formatBranchCurrency(discountedPrice, branchCurrency)}
        </span>
        <span className="text-xs text-gray-400 line-through">{formatBranchCurrency(originalPrice, branchCurrency)}</span>
      </div>
    ) : (
      <span className={`${cls} font-extrabold`} style={{ color: "var(--color-primary)" }}>
        {formatBranchCurrency(totalPrice, branchCurrency)}
      </span>
    );
  };

  const VariationChips = ({ small = false }: { small?: boolean }) =>
    sizes.length > 1 ? (
      <div className="flex flex-wrap gap-1.5">
        {sizes.map(s => {
          const active = selectedSize === s.name;
          return (
            <button
              key={s.name}
              onClick={() => setSelectedSize(s.name)}
              className={`vibe-chip ${active ? "vibe-chip-active" : ""} ${small ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs"}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    ) : null;

  const Ribbons = ({ scale = 1 }: { scale?: number }) => (
    <>
      {isRecommended && (
        <span className="ribbon-rec absolute top-2.5 right-2.5" style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top right" } : {}}>
          ★ Top Pick
        </span>
      )}
      {discountPercentage > 0 && (
        <span className="ribbon-deal absolute top-2.5 left-2.5" style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top left" } : {}}>
          {discountPercentage}% OFF
        </span>
      )}
    </>
  );

  const AddButton = ({ compact = false }: { compact?: boolean }) =>
    compact ? (
      <button
        onClick={handleAdd}
        className="vibe-pill h-10 w-10 shrink-0"
        data-testid={`button-add-to-cart-${itemId}`}
        aria-label="Add to cart"
      >
        <Plus className="h-5 w-5" />
      </button>
    ) : (
      <button onClick={handleAdd} className="vibe-pill h-10 px-4 text-sm shrink-0" data-testid={`button-add-to-cart-${itemId}`}>
        <Plus className="h-4 w-4" /> Add
      </button>
    );

  const detailModal = (
    <MenuItemDetailModal item={item} isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} isRecommended={isRecommended} />
  );

  // ---------- LIST ----------
  if (variant === "list") {
    return (
      <>
        {detailModal}
        <div className={`vibe-card vibe-card-press p-2.5 flex gap-3 ${className}`}>
          <div className="relative w-28 h-28 flex-shrink-0 cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`image-menuitem-${itemId}`}>
            <img src={getImage()} alt={item.name} className="w-full h-full object-cover rounded-xl" />
            <Ribbons scale={0.85} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-bold configurable-text-primary text-[15px] truncate">{item.name}</h3>
            <p className="text-[11px] configurable-text-muted mb-1 line-clamp-2 cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`description-menuitem-${itemId}`}>
              {item.description}
            </p>
            <div className="mb-2"><VariationChips small /></div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <PriceBlock />
              <AddButton />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---------- COMPACT ----------
  if (variant === "compact") {
    return (
      <>
        {detailModal}
        <div className={`vibe-card vibe-card-press p-2.5 flex gap-3 h-full ${className}`}>
          <div className="relative w-20 h-20 flex-shrink-0 cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`image-menuitem-${itemId}`}>
            <img src={getImage()} alt={item.name} className="w-full h-full object-cover rounded-xl" />
            {discountPercentage > 0 && (
              <span className="ribbon-deal absolute -top-1.5 -left-1.5 scale-[0.7] origin-top-left">{discountPercentage}%</span>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-bold configurable-text-primary text-sm truncate">{item.name}</h3>
            <p className="configurable-text-muted text-[11px] mb-1.5 line-clamp-2 cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`description-menuitem-${itemId}`}>
              {item.description}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2">
              <PriceBlock size="sm" />
              <AddButton compact />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---------- GRID (default) ----------
  return (
    <>
      {detailModal}
      <div className={`vibe-card vibe-card-press h-full flex flex-col ${className}`}>
        <div className="relative cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`image-menuitem-${itemId}`}>
          <img src={getImage()} alt={item.name} className="w-full h-44 sm:h-48 object-cover" />
          <Ribbons />
        </div>
        <div className="p-3.5 flex flex-col flex-1">
          <h3 className="font-bold configurable-text-primary text-[15px] leading-tight truncate">{item.name}</h3>
          <p className="text-[10px] uppercase tracking-wide configurable-text-muted font-semibold mb-1">{getCategory()}</p>
          <p className="text-xs configurable-text-secondary mb-2.5 line-clamp-2 cursor-pointer" onClick={() => setIsDetailModalOpen(true)} data-testid={`description-menuitem-${itemId}`}>
            {item.description}
          </p>
          <div className="mb-3"><VariationChips /></div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <PriceBlock size="lg" />
            <AddButton />
          </div>
        </div>
      </div>
    </>
  );
}
