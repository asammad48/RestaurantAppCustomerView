import { useState } from "react";
import { CreditCard, Banknote, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/lib/store";

export default function PaymentModal() {
  const { isPaymentModalOpen, setPaymentModalOpen, setSplitBillModalOpen, setReviewModalOpen } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [splitBill, setSplitBill] = useState(false);

  const handlePlaceOrder = () => {
    setPaymentModalOpen(false);
    setReviewModalOpen(true);
  };

  const handleSplitBill = () => {
    setPaymentModalOpen(false);
    setSplitBillModalOpen(true);
  };

  return (
    <Dialog open={isPaymentModalOpen} onOpenChange={setPaymentModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold configurable-text-primary">Select Payment Method</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Choose how you would like to pay for your order
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Payment Methods */}
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="configurable-primary-text" size={24} />
                <Label htmlFor="cash" className="font-medium configurable-text-primary cursor-pointer">Cash</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="configurable-primary-text" size={24} />
                <Label htmlFor="card" className="font-medium configurable-text-primary cursor-pointer">Credit/Debit Card</Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:configurable-border">
                <RadioGroupItem value="bank" id="bank" />
                <Building2 className="configurable-primary-text" size={24} />
                <Label htmlFor="bank" className="font-medium configurable-text-primary cursor-pointer">Bank Transfer</Label>
              </div>
            </div>
          </RadioGroup>
          
          {/* Split Bill Option */}
          <div className="flex items-center space-x-3">
            <Checkbox id="split" checked={splitBill} onCheckedChange={(checked) => setSplitBill(checked === true)} />
            <Label htmlFor="split" className="font-medium configurable-text-primary">Do you want to split?</Label>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handlePlaceOrder} 
              className="w-full configurable-primary text-white font-bold hover:configurable-primary-hover"
              disabled={!paymentMethod}
            >
              Place Order
            </Button>
            {splitBill && (
              <Button 
                onClick={handleSplitBill} 
                variant="outline" 
                className="w-full"
              >
                Split Bill
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
