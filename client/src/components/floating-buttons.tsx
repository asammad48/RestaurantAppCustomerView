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
    <div className="fixed bottom-6 right-6 flex flex-col space-y-4 z-50">
      {/* Voice Assistant Button */}
      <Button
        onClick={handleVoiceAssistant}
        className="w-14 h-14 configurable-primary text-white rounded-full shadow-lg hover:configurable-primary-hover transition-all duration-300"
        size="icon"
        title="Voice Assistant"
      >
        <Mic size={24} />
      </Button>

      {/* Request Service Button */}
      <Button
        onClick={() => setServiceModalOpen(true)}
        className="w-14 h-14 configurable-primary text-white rounded-full shadow-lg hover:configurable-primary-hover transition-all duration-300"
        size="icon"
        title="Request a Service"
      >
        <ConciergeBell size={24} />
      </Button>
    </div>
  );
}
