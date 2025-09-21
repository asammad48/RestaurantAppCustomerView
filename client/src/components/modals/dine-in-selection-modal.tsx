import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ChefHat } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
    selectedBranch,
    userLocation 
  } = useCartStore();
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedBranchState, setSelectedBranchState] = useState<Branch | null>(selectedBranch);
  const [selectedTableState, setSelectedTableState] = useState<TableLocation | null>(null);
  // Sync selectedBranchState with store's selectedBranch when modal opens
  useEffect(() => {
    if (isDineInSelectionModalOpen && selectedBranch && !selectedBranchState) {
      setSelectedBranchState(selectedBranch);
    }
  }, [isDineInSelectionModalOpen, selectedBranch, selectedBranchState]);


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
        title: "Table Selection Required",
        description: "Please select a table to continue.",
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
          <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2" data-testid="modal-title">
            <ChefHat className="w-5 h-5" />
            Select Table at {selectedBranchState?.branchName || 'Restaurant'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Choose a table for your dine-in experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Table Selection */}
          <div className="space-y-3">
            {!selectedBranch ? (
              <Card className="p-4 text-center text-gray-500" data-testid="no-restaurant-message">
                <p>Please select a restaurant first.</p>
              </Card>
            ) : isTablesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : tables.length === 0 ? (
              <Card className="p-4 text-center text-gray-500" data-testid="no-dine-in-message">
                <p>Dine-in service is not available at this restaurant.</p>
              </Card>
            ) : (
              <>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Choose Your Table
                </Label>
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
              </>
            )}
          </div>
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
            disabled={!selectedTableState}
            data-testid="button-proceed-to-menu"
          >
            Proceed to Menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}