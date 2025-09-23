import { ConciergeBell, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";

export default function FloatingButtons() {
  const { setServiceModalOpen } = useCartStore();

  const handleVoiceAssistant = () => {
    // Voice assistant functionality
    console.log("Voice assistant activated");
    // You can add speech recognition here
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col space-y-3 sm:space-y-4 z-50">
      {/* Voice Assistant Button */}
      <Button
        onClick={handleVoiceAssistant}
        className="w-12 h-12 sm:w-14 sm:h-14 configurable-primary text-white rounded-full shadow-lg hover:configurable-primary-hover transition-all duration-300"
        size="icon"
        title="Voice Assistant"
      >
        <Mic size={20} className="sm:w-6 sm:h-6" />
      </Button>

      {/* Request Service Button */}
      <Button
        onClick={() => setServiceModalOpen(true)}
        className="w-12 h-12 sm:w-14 sm:h-14 configurable-primary text-white rounded-full shadow-lg hover:configurable-primary-hover transition-all duration-300"
        size="icon"
        title="Request a Service"
      >
        <ConciergeBell size={20} className="sm:w-6 sm:h-6" />
      </Button>
    </div>
  );
}
