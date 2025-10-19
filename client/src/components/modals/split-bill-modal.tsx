import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";
import { orderService } from "@/services/order-service";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { ApiError, SplitBill } from "@/lib/api-client";
import { formatBranchCurrency } from "@/lib/utils";

export default function SplitBillModal() {
  const { 
    isSplitBillModalOpen, 
    setSplitBillModalOpen, 
    splitBillMode, 
    setSplitBillMode, 
    setReviewModalOpen, 
    selectedBranch, 
    serviceType, 
    deliveryDetails, 
    takeawayDetails,
    specialInstructions,
    setOrderResponse,
    setOrderConfirmationOpen,
    branchCurrency 
  } = useCartStore();
  const { items, total } = useCart();
  const { user, setLoginModalOpen, token } = useAuthStore();
  const { toast } = useToast();
  const [peopleCount, setPeopleCount] = useState(3);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([]);
  const [assignedPersons, setAssignedPersons] = useState<{ [itemId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const perPersonAmount = total / peopleCount;

  // Get locationId from URL parameters for dine-in orders
  const getLocationId = () => {
    if (serviceType === 'dine-in') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLocationId = urlParams.get('locationId');
      if (urlLocationId) {
        return parseInt(urlLocationId, 10);
      }
    }
    return undefined;
  };

  const handleMobileNumberChange = (index: number, value: string) => {
    // Only allow numbers and limit to 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    const newMobileNumbers = [...mobileNumbers];
    newMobileNumbers[index] = numericValue;
    setMobileNumbers(newMobileNumbers);
  };

  const handlePersonAssignment = (itemId: string, mobileNumber: string) => {
    setAssignedPersons(prev => ({ ...prev, [itemId]: mobileNumber }));
  };

  const handleSendLink = async () => {
    // Check if user is logged in
    if (!user) {
      setSplitBillModalOpen(false);
      setLoginModalOpen(true);
      toast({
        title: "Login Required",
        description: "Please log in to complete your order with split billing.",
        variant: "destructive"
      });
      return;
    }

    // Validate split bill data
    const splitBills = generateSplitBills();
    if (splitBills.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please enter mobile numbers for all people or assign items to people.",
        variant: "destructive"
      });
      return;
    }

    // Validate that all mobile numbers are properly entered
    if (splitBillMode === 'equality') {
      for (let i = 0; i < peopleCount; i++) {
        if (!mobileNumbers[i] || mobileNumbers[i].length !== 10) {
          toast({
            title: "Invalid Mobile Number",
            description: `Please enter a valid 10-digit mobile number for Person ${i + 1}.`,
            variant: "destructive"
          });
          return;
        }
      }
    } else {
      const hasUnassignedItems = items.some(item => !assignedPersons[item.id] || assignedPersons[item.id].length !== 10);
      if (hasUnassignedItems) {
        toast({
          title: "Items Not Assigned",
          description: "Please assign all items to people with valid 10-digit mobile numbers.",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if locationId is required and provided for dine-in orders
    if (serviceType === 'dine-in' && !getLocationId()) {
      toast({
        title: "Location Required",
        description: "Please select a table/location for your dine-in order.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create the order with split bills
      const orderResponse = await orderService.createOrder({
        cartItems: items,
        serviceType,
        branchId: selectedBranch?.branchId || 1,
        locationId: getLocationId(),
        username: user?.name || user?.email || 'guest',
        tipAmount: 0,
        deliveryDetails: serviceType === 'delivery' ? deliveryDetails : null,
        takeawayDetails: serviceType === 'takeaway' ? takeawayDetails : null,
        splitBills,
        specialInstruction: specialInstructions || '',
        token: token
      });

      if (orderResponse.success) {
        setOrderResponse(orderResponse.data);
        setSplitBillModalOpen(false);
        setOrderConfirmationOpen(true);
        
        toast({
          title: "Order Placed Successfully!",
          description: "Split bill links have been sent to all participants.",
        });
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      
      if (error instanceof ApiError) {
        toast({
          title: "Order Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Order Failed",
          description: "Unable to place order. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSplitBills = (): SplitBill[] => {
    const splitBills: SplitBill[] = [];
    
    if (splitBillMode === 'equality') {
      const perPersonAmount = total / peopleCount;
      for (let i = 0; i < peopleCount; i++) {
        if (mobileNumbers[i] && mobileNumbers[i].length === 10) {
          splitBills.push({
            splitType: 1, // Equality
            price: Math.round(perPersonAmount * 100), // Convert to cents
            mobileNumber: mobileNumbers[i],
            itemName: 'Split Bill (Equal Share)'
          });
        }
      }
    } else {
      // Split by items
      items.forEach(item => {
        const assignedMobile = assignedPersons[item.id];
        if (assignedMobile && assignedMobile.length === 10) {
          const itemTotal = parseFloat(item.price.toString()) * item.quantity;
          splitBills.push({
            splitType: 2, // By item
            price: Math.round(itemTotal * 100), // Convert to cents
            mobileNumber: assignedMobile,
            itemName: `${item.name} (x${item.quantity})`
          });
        }
      });
    }
    
    return splitBills;
  };

  // Reset mobile numbers when people count changes
  useEffect(() => {
    if (splitBillMode === 'equality') {
      setMobileNumbers(prev => {
        const newNumbers = [...prev];
        // Ensure array has correct length
        while (newNumbers.length < peopleCount) {
          newNumbers.push('');
        }
        return newNumbers.slice(0, peopleCount);
      });
    }
  }, [peopleCount, splitBillMode]);

  return (
    <Dialog open={isSplitBillModalOpen} onOpenChange={setSplitBillModalOpen}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold configurable-text-primary">Split Bill</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Divide the bill between multiple people
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
          {/* Split Options */}
          <div className="flex">
            <Button
              onClick={() => setSplitBillMode('equality')}
              className={`flex-1 py-3 rounded-l-lg font-medium ${
                splitBillMode === 'equality' 
                  ? 'configurable-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Split Equally
            </Button>
            <Button
              onClick={() => setSplitBillMode('items')}
              className={`flex-1 py-3 rounded-r-lg font-medium ${
                splitBillMode === 'items' 
                  ? 'configurable-primary text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Split by Items
            </Button>
          </div>
          
          {splitBillMode === 'equality' ? (
            <>
              {/* Number of People */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <Button
                    size="icon"
                    className="w-10 h-10 configurable-primary text-white rounded-full"
                    onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="text-3xl font-bold configurable-text-primary">{peopleCount}</span>
                  <Button
                    size="icon"
                    className="w-10 h-10 configurable-primary text-white rounded-full"
                    onClick={() => setPeopleCount(peopleCount + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                <p className="text-lg font-semibold configurable-text-primary">
                  Each Pays: {formatBranchCurrency(perPersonAmount, branchCurrency)}
                </p>
              </div>
              
              {/* Person Details */}
              <div className="space-y-3">
                {Array.from({ length: peopleCount }, (_, i) => (
                  <Input
                    key={i}
                    type="tel"
                    placeholder={`Person ${i + 1} Mobile No.`}
                    value={mobileNumbers[i] || ''}
                    onChange={(e) => handleMobileNumberChange(i, e.target.value)}
                    className="w-full"
                    maxLength={10}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Items Assignment */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium configurable-text-primary">{item.name}</span>
                      <span className="font-bold configurable-text-primary">{formatBranchCurrency(parseFloat(item.price.toString()) * item.quantity, branchCurrency)}</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Assign to person (Mobile No.)"
                      value={assignedPersons[item.id] || ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                        handlePersonAssignment(item.id, numericValue);
                      }}
                      className="w-full"
                      maxLength={10}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          
          <Button 
            onClick={handleSendLink} 
            disabled={isSubmitting}
            className="w-full configurable-primary text-white font-bold hover:configurable-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? 'Processing Order...' : 'Confirm Order & Send Links'}
          </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
