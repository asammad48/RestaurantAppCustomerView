import { Plus, Calendar, Tag } from "lucide-react";
import { ApiDeal } from "@/lib/mock-data";
import { useCartStore } from "@/lib/store";
import { getImageUrl } from "@/lib/config";
import { formatBranchCurrency, formatToLocalTime } from "@/lib/utils";

interface DealCardProps {
  deal: ApiDeal;
  onAdd: (deal: ApiDeal) => void;
  className?: string;
}

export default function DealCard({ deal, onAdd, className = "" }: DealCardProps) {
  const { branchCurrency } = useCartStore();
  const hasDiscount = !!(deal.discount && deal.discount.value > 0);
  const discountedPrice = hasDiscount ? deal.price - (deal.price * deal.discount!.value / 100) : deal.price;

  return (
    <div className={`vibe-card vibe-card-press h-full flex flex-col ${className}`}>
      <div className="relative">
        <img src={getImageUrl(deal.picture)} alt={deal.name} className="w-full h-44 object-cover" />
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md" style={{ backgroundColor: "var(--color-primary)" }}>
          <Tag className="h-3 w-3" /> DEAL
        </span>
        {hasDiscount && (
          <span className="ribbon-deal absolute top-2.5 right-2.5">{deal.discount!.value}% OFF</span>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-bold configurable-text-primary text-[15px] leading-tight mb-1 line-clamp-1">{deal.name}</h3>
        <p className="text-xs configurable-text-secondary mb-2.5 line-clamp-2">{deal.description}</p>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-3 px-2.5 py-1.5 rounded-lg w-fit"
          style={{ backgroundColor: "var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))", color: "var(--color-primary)" }}>
          <Calendar className="h-3 w-3" />
          Valid until {formatToLocalTime(deal.dealEndDate, "MMM dd, yyyy")}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-lg font-extrabold" style={{ color: "var(--color-primary)" }}>
                  {formatBranchCurrency(Number(discountedPrice) || 0, branchCurrency)}
                </span>
                <span className="text-xs text-gray-400 line-through">{formatBranchCurrency(Number(deal.price) || 0, branchCurrency)}</span>
              </>
            ) : (
              <span className="text-lg font-extrabold" style={{ color: "var(--color-primary)" }}>
                {formatBranchCurrency(Number(deal.price) || 0, branchCurrency)}
              </span>
            )}
          </div>
          <button onClick={() => onAdd(deal)} className="vibe-pill h-10 px-4 text-sm" data-testid={`button-add-deal-to-cart-${deal.dealId}`}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
