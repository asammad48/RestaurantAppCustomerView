import { Star, Clock, DollarSign, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Branch } from "@/types/branch";
import { BranchService } from "@/services/branch-service";

interface BranchResultsProps {
  branches: Branch[];
  loading?: boolean;
  onSelectBranch?: (branch: Branch) => void;
}

export default function BranchResults({ branches, loading = false, onSelectBranch }: BranchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
          <p className="text-gray-500">Try searching in a different location or adjust your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {branches.map((branch) => (
        <Card key={branch.branchId} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start space-x-4">
              {/* Branch Logo */}
              <div className="flex-shrink-0">
                <img
                  src={BranchService.getBranchLogoUrl(branch.branchLogo)}
                  alt={`${branch.branchName} logo`}
                  className="w-16 h-16 rounded-lg object-cover border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64/f3f4f6/9ca3af?text=No+Image';
                  }}
                />
              </div>

              {/* Branch Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {branch.branchName}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">{branch.rating}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="ml-1 text-sm text-gray-600">{branch.deliveryTime} min</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={branch.isBranchClosed ? "destructive" : "default"}>
                    {branch.isBranchClosed ? "Closed" : "Open"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {branch.branchAddress}
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Branch Banner/Picture */}
          {branch.branchPicture && (
            <div className="px-6 pb-3">
              <img
                src={BranchService.getBranchImageUrl(branch.branchPicture)}
                alt={`${branch.branchName} interior`}
                className="w-full h-32 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x128/f3f4f6/9ca3af?text=No+Image';
                }}
              />
            </div>
          )}

          <CardContent className="pt-0">
            {/* Delivery Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>${branch.deliveryFee} delivery fee</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{branch.maxDistanceForDelivery}km max distance</span>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="text-sm text-gray-600 mb-4">
              <span className="font-medium">Hours:</span> {branch.branchOpenTime} - {branch.branchCloseTime}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => onSelectBranch?.(branch)}
                disabled={branch.isBranchClosed}
                style={{ backgroundColor: branch.primaryColor }}
                className="text-white hover:opacity-90"
                data-testid={`button-select-branch-${branch.branchId}`}
              >
                {branch.isBranchClosed ? "Currently Closed" : "View Menu"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}