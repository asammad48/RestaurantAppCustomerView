import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, Clock, ChefHat } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BranchService } from "@/services/branch-service";
import { TableService, TableLocation } from "@/services/table-service";
import { Branch } from "@/types/branch";
import { Skeleton } from "@/components/ui/skeleton";

export default function DineInSelectionModal() {
  const { 
    isDineInSelectionModalOpen, 
    setDineInSelectionModalOpen, 
    setServiceType,
    setSelectedBranch,
    setSelectedTable,
    setDineInDetails,
    userLocation 
  } = useCartStore();
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchState, setSelectedBranchState] = useState<Branch | null>(null);
  const [selectedTableState, setSelectedTableState] = useState<TableLocation | null>(null);
  const [maxDistance] = useState(50);

  // Get user's coordinates (you may want to implement proper geolocation)
  const latitude = 24.8607; // Default Karachi coordinates
  const longitude = 67.0011;

  // Search for branches
  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ['/api/customer-search/dine-in-branches', searchQuery, userLocation],
    queryFn: async () => {
      const response = await BranchService.searchBranches({
        latitude,
        longitude,
        address: userLocation || "",
        branchName: searchQuery || "",
        maxDistance
      });
      return response.data;
    },
    enabled: isDineInSelectionModalOpen,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get tables for selected branch
  const { data: tables = [], isLoading: isTablesLoading } = useQuery({
    queryKey: ['/api/customer-search/table-locations', selectedBranchState?.branchId],
    queryFn: async () => {
      if (!selectedBranchState?.branchId) return [];
      const response = await TableService.getTableLocations(selectedBranchState.branchId);
      return response.data;
    },
    enabled: !!selectedBranchState?.branchId,
    staleTime: 60000, // Cache for 1 minute
  });

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranchState(branch);
    setSelectedTableState(null); // Reset table selection when branch changes
  };

  const handleTableSelect = (tableId: string) => {
    const table = tables.find(t => t.id.toString() === tableId);
    if (table) {
      setSelectedTableState(table);
    }
  };

  const handleProceedToMenu = () => {
    if (!selectedBranchState || !selectedTableState) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select both a restaurant and a table to continue.",
      });
      return;
    }

    // Set service type and selections in store
    setServiceType('dine-in');
    setSelectedBranch(selectedBranchState);
    setSelectedTable(selectedTableState);
    setDineInDetails({
      selectedTable: selectedTableState,
      locationId: selectedTableState.id
    });

    // Close modal
    setDineInSelectionModalOpen(false);

    // Navigate to menu with locationId parameter
    setLocation(`/restaurant-menu?branchId=${selectedBranchState.branchId}&locationId=${selectedTableState.id}`);

    toast({
      title: "Selections Saved",
      description: `Selected ${selectedBranchState.branchName} - ${selectedTableState.name}. Loading menu...`,
    });
  };

  const handleClose = () => {
    setDineInSelectionModalOpen(false);
    setSelectedBranchState(null);
    setSelectedTableState(null);
  };

  return (
    <Dialog open={isDineInSelectionModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="dine-in-selection-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2">
            <ChefHat className="w-5 h-5" />
            Select Restaurant & Table
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Restaurant Search */}
          <div className="space-y-3">
            <Label htmlFor="restaurant-search" className="text-sm font-medium text-gray-700">
              Search Restaurant
            </Label>
            <Input
              id="restaurant-search"
              placeholder="Search restaurants near you..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              data-testid="input-restaurant-search"
            />
          </div>

          {/* Restaurant Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Available Restaurants</Label>
            {isBranchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : branches.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                <p>No restaurants found. Try adjusting your search.</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {branches.map((branch: Branch) => (
                  <Card 
                    key={branch.branchId}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedBranchState?.branchId === branch.branchId 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleBranchSelect(branch)}
                    data-testid={`restaurant-option-${branch.branchId}`}
                  >
                    <CardContent className="flex items-center p-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {branch.branchName}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {branch.branchAddress}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {!branch.isBranchClosed ? 'Open Now' : 'Closed'}
                        </div>
                      </div>
                      {selectedBranchState?.branchId === branch.branchId && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Table Selection */}
          {selectedBranchState && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Table at {selectedBranchState.branchName}
              </Label>
              {isTablesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : tables.length === 0 ? (
                <Card className="p-4 text-center text-gray-500">
                  <p>No tables available at this restaurant.</p>
                </Card>
              ) : (
                <Select 
                  value={selectedTableState?.id.toString() || ""} 
                  onValueChange={handleTableSelect}
                >
                  <SelectTrigger className="w-full" data-testid="select-table">
                    <SelectValue placeholder="Choose a table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem 
                        key={table.id} 
                        value={table.id.toString()}
                        data-testid={`table-option-${table.id}`}
                      >
                        {table.name} ({TableService.getTableTypeName(table.locationType)}) - Capacity: {table.capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose}
            data-testid="button-cancel-dine-in"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProceedToMenu}
            disabled={!selectedBranchState || !selectedTableState}
            data-testid="button-proceed-to-menu"
          >
            Proceed to Menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}