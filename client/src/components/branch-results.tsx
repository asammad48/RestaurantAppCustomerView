import { Star, Clock, DollarSign, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="h-48 bg-gray-200 rounded-t-lg mb-4"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {branches.map((branch) => (
        <Card 
          key={branch.branchId} 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            branch.isBranchClosed ? 'opacity-60' : ''
          }`}
          onClick={() => !branch.isBranchClosed && onSelectBranch?.(branch)}
          data-testid={`restaurant-card-${branch.branchId}`}
        >
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={BranchService.getBranchImageUrl(branch.branchPicture)}
                alt={branch.branchName}
                className="w-full h-48 object-cover rounded-t-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x192/f3f4f6/9ca3af?text=No+Image';
                }}
              />
              {branch.isBranchClosed && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-lg flex items-center justify-center">
                  <Badge variant="destructive">Closed</Badge>
                </div>
              )}
              <div className="absolute top-3 right-3">
                <Badge className="bg-white text-black shadow-sm">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {branch.rating}
                </Badge>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {branch.branchName}
                </h3>
                <Badge variant="outline" className="text-xs">
                  Restaurant
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-green-800 mb-3 p-2 rounded-md bg-green-100 bg-opacity-50">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-green-700" />
                  30 min
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1 text-green-700" />
                  Fee: $3.99
                </div>
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-green-700" />
                  {Math.round(branch.distanceFromMyLocation)}km max distance
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3 line-clamp-2">
                <MapPin className="w-3 h-3 inline mr-1" />
                {branch.branchAddress}
              </div>

              {/* Operating Hours */}
              <div className="text-xs text-gray-600 mb-4">
                <span className="font-medium">Hours:</span> {branch.branchOpenTime} - {branch.branchCloseTime}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <Button 
                  size="sm" 
                  className="w-full text-white hover:opacity-90"
                  disabled={branch.isBranchClosed}
                  style={{ backgroundColor: '#15803d' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBranch?.(branch);
                  }}
                  data-testid={`button-order-from-${branch.branchId}`}
                >
                  {branch.isBranchClosed ? 'Currently Closed' : 'View Menu'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}