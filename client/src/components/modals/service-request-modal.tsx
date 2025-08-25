import { useState } from "react";
import { Droplets, Music, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCartStore } from "@/lib/store";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ServiceRequestModal() {
  const { isServiceModalOpen, setServiceModalOpen } = useCartStore();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [songName, setSongName] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const { toast } = useToast();

  const serviceRequestMutation = useMutation({
    mutationFn: async (data: { type: string; details?: any }) => {
      return apiRequest("POST", "/api/service-requests", {
        tableNumber: 5,
        type: data.type,
        details: JSON.stringify(data.details || {}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Service Request Sent",
        description: "Your request has been sent to the waiter.",
      });
      setServiceModalOpen(false);
      setSelectedService(null);
      setSongName("");
      setArtist("");
      setGenre("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send service request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleServiceRequest = (type: string) => {
    if (type === "water_bottle") {
      serviceRequestMutation.mutate({ type });
    } else if (type === "play_song") {
      if (!songName.trim()) {
        toast({
          title: "Error",
          description: "Please enter a song name.",
          variant: "destructive",
        });
        return;
      }
      serviceRequestMutation.mutate({
        type,
        details: { songName, artist, genre },
      });
    }
  };

  if (selectedService === "water_bottle") {
    return (
      <Dialog open={isServiceModalOpen} onOpenChange={(open) => {
        setServiceModalOpen(open);
        if (!open) setSelectedService(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold configurable-text-primary">Water Bottle</DialogTitle>
            <DialogDescription className="configurable-text-secondary">
              Request a complimentary water bottle
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-6">
            <Droplets className="text-blue-500 mx-auto" size={64} />
            <p className="configurable-text-secondary">
              This is a free service. Your request will be sent to the waiter.
            </p>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedService(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 configurable-primary text-white hover:configurable-primary-hover"
                onClick={() => handleServiceRequest("water_bottle")}
                disabled={serviceRequestMutation.isPending}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (selectedService === "play_song") {
    return (
      <Dialog open={isServiceModalOpen} onOpenChange={(open) => {
        setServiceModalOpen(open);
        if (!open) setSelectedService(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold configurable-text-primary">Play a Song</DialogTitle>
            <DialogDescription className="configurable-text-secondary">
              Request a song to be added to the playlist
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center space-y-6">
            <Music className="text-purple-500 mx-auto" size={64} />
            <p className="configurable-text-secondary mb-4">Your song will be played in queue!</p>
            
            <div className="space-y-3">
              <Input
                placeholder="Song Name"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
              />
              <div className="flex space-x-2">
                <Input
                  placeholder="Artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="flex-1"
                />
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pop">Pop</SelectItem>
                    <SelectItem value="rock">Rock</SelectItem>
                    <SelectItem value="jazz">Jazz</SelectItem>
                    <SelectItem value="classical">Classical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs configurable-text-secondary">Want it played instantly?</p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedService(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 configurable-primary text-white hover:configurable-primary-hover"
                onClick={() => handleServiceRequest("play_song")}
                disabled={serviceRequestMutation.isPending}
              >
                Add to queue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isServiceModalOpen} onOpenChange={setServiceModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold configurable-text-primary">Request a Service</DialogTitle>
          <DialogDescription className="configurable-text-secondary">
            Choose from available services for your table
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Service Options Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              onClick={() => setSelectedService("water_bottle")}
            >
              <Droplets className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Water Bottle</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              onClick={() => setSelectedService("play_song")}
            >
              <Music className="text-purple-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Play a Song</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              disabled
            >
              <Droplets className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Water Bottle</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              disabled
            >
              <Droplets className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Water Bottle</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              disabled
            >
              <Droplets className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Water Bottle</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto hover:configurable-border hover:configurable-secondary"
              disabled
            >
              <Droplets className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-medium configurable-text-primary">Water Bottle</span>
            </Button>
          </div>
          
          <Button 
            onClick={() => setServiceModalOpen(false)}
            className="w-full configurable-primary text-white hover:configurable-primary-hover"
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
