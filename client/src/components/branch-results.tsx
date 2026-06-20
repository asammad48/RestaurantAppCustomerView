import { Star, Clock, DollarSign, MapPin, ChevronRight } from "lucide-react";
import { Branch } from "@/types/branch";
import { BranchService } from "@/services/branch-service";
import { useCartStore } from "@/lib/store";
import { formatBranchCurrency } from "@/lib/utils";

interface BranchResultsProps {
  branches: Branch[];
  loading?: boolean;
  onSelectBranch?: (branch: Branch) => void;
  serviceType?: 'delivery' | 'takeaway' | 'dine-in' | 'reservation';
  maxDistance?: number;
}

export default function BranchResults({ branches, loading = false, onSelectBranch, serviceType = 'delivery', maxDistance = 20 }: BranchResultsProps) {
  const { branchCurrency } = useCartStore();

  const getButtonText = (service: string) => {
    switch (service) {
      case 'reservation': return 'Reserve a table';
      case 'takeaway': return 'Order Now';
      case 'delivery': return 'Order for Delivery';
      case 'dine-in': return 'View Menu';
      default: return 'View Menu';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="vibe-card">
            <div className="vibe-skeleton h-44 rounded-none" />
            <div className="p-4 space-y-2">
              <div className="vibe-skeleton h-4 rounded w-3/4" />
              <div className="vibe-skeleton h-4 rounded w-1/2" />
              <div className="vibe-skeleton h-10 rounded-full mt-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="vibe-card text-center py-12 px-6">
        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold configurable-text-primary mb-1">No branches found</h3>
        <p className="configurable-text-muted text-sm">Try a different location or widen your search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {branches.map((branch) => (
        <div
          key={branch.branchId}
          className={`vibe-card vibe-card-press h-full flex flex-col ${branch.isBranchClosed ? 'opacity-70' : 'cursor-pointer'}`}
          onClick={() => !branch.isBranchClosed && onSelectBranch?.(branch)}
          data-testid={`restaurant-card-${branch.branchId}`}
        >
          <div className="relative">
            <img
              src={BranchService.getBranchImageUrl(branch.branchPicture)}
              alt={branch.branchName}
              className="w-full h-44 object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = 'true';
                  img.src = 'https://via.placeholder.com/400x192/f3f4f6/9ca3af?text=No+Image';
                }
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white rounded-full pl-2 pr-2.5 h-7 shadow-md">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-gray-900">{branch.rating}</span>
            </div>
            <h3 className="absolute left-3 bottom-2.5 right-3 font-extrabold text-white text-lg leading-tight line-clamp-1 drop-shadow">
              {branch.branchName}
            </h3>
            {branch.isBranchClosed && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">Closed</span>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col flex-grow">
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold mb-3 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--configurable-primary-alpha-10, rgba(22,163,74,0.1))', color: 'var(--color-primary)' }}
            >
              <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> 30 min</span>
              <span className="flex items-center"><DollarSign className="w-3.5 h-3.5 mr-1" /> {formatBranchCurrency(3.99, branchCurrency)}</span>
              {(serviceType === 'delivery' || serviceType === 'dine-in') && (
                <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {Math.round(branch.distanceFromMyLocation)}km</span>
              )}
            </div>

            <div className="text-xs configurable-text-muted mb-2 line-clamp-2 flex items-start gap-1.5 min-h-[2rem]">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{branch.branchAddress}</span>
            </div>

            <div className="text-xs configurable-text-secondary mb-4">
              <span className="font-semibold">Hours:</span> {branch.branchOpenTime} – {branch.branchCloseTime}
            </div>

            <button
              className="vibe-pill w-full h-12 mt-auto disabled:cursor-not-allowed"
              disabled={branch.isBranchClosed}
              onClick={(e) => { e.stopPropagation(); onSelectBranch?.(branch); }}
              data-testid={`button-order-from-${branch.branchId}`}
            >
              {branch.isBranchClosed ? 'Currently Closed' : (
                <>
                  {getButtonText(serviceType)}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
