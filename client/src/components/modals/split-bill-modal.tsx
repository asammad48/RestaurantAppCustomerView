import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "@/lib/store";
import { useCart } from "@/hooks/use-cart";

export default function SplitBillModal() {
  const { isSplitBillModalOpen, setSplitBillModalOpen, splitBillMode, setSplitBillMode, setReviewModalOpen } = useCartStore();
  const { items, total } = useCart();
  const [peopleCount, setPeopleCount] = useState(3);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([]);
  const [assignedPersons, setAssignedPersons] = useState<{ [itemId: string]: string }>({});

  const perPersonAmount = total / peopleCount;

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

  const handleSendLink = () => {
    setSplitBillModalOpen(false);
    setReviewModalOpen(true);
  };

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
                  Each Pays: Rs. {perPersonAmount.toFixed(2)}
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
                      <span className="font-bold configurable-text-primary">Rs. {(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
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
            className="w-full configurable-primary text-white font-bold hover:configurable-primary-hover"
          >
            Send Link
          </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
