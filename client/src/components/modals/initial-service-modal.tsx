import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { UtensilsCrossed, MoreHorizontal } from "lucide-react";

export default function InitialServiceModal() {
  const { initialServiceOpen, setInitialServiceOpen, setServiceSelectionOpen } = useCartStore();

  const handleDineIn = () => {
    setInitialServiceOpen(false);
    // Stay on home page for dine-in experience
  };

  const handleOtherServices = () => {
    setInitialServiceOpen(false);
    setServiceSelectionOpen(true);
  };

  return (
    <Dialog open={initialServiceOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Welcome!
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            How would you like to order today?
          </DialogDescription>
        </DialogHeader>
        <div className="text-center space-y-6 py-4">

          <div className="space-y-4">
            <Button
              onClick={handleDineIn}
              className="w-full h-20 text-lg font-medium"
              size="lg"
              data-testid="button-dine-in"
            >
              <div className="flex flex-col items-center space-y-2">
                <UtensilsCrossed className="w-8 h-8" />
                <span>Dine In</span>
              </div>
            </Button>

            <Button
              onClick={handleOtherServices}
              variant="outline"
              className="w-full h-20 text-lg font-medium"
              size="lg"
              data-testid="button-other-services"
            >
              <div className="flex flex-col items-center space-y-2">
                <MoreHorizontal className="w-8 h-8" />
                <span>Other Services</span>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}