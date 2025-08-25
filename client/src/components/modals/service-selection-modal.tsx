import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bike, MapPin, Calendar, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useLocation } from "wouter";

export default function ServiceSelectionModal() {
  const { isServiceSelectionOpen, setServiceSelectionOpen, setServiceType } = useCartStore();
  const [, setLocation] = useLocation();

  const handleServiceSelect = (service: 'delivery' | 'takeaway' | 'reservation') => {
    setServiceType(service);
    setServiceSelectionOpen(false);
    
    switch (service) {
      case 'delivery':
        setLocation('/delivery');
        break;
      case 'takeaway':
        setLocation('/takeaway');
        break;
      case 'reservation':
        setLocation('/reservation');
        break;
    }
  };

  const services = [
    {
      id: 'delivery',
      title: 'Delivery',
      description: 'Get food delivered to your doorstep',
      icon: Bike,
      color: 'configurable-secondary hover:configurable-secondary configurable-border',
      iconColor: 'configurable-primary-text',
    },
    {
      id: 'takeaway',
      title: 'Take Away',
      description: 'Pick up your order from the restaurant',
      icon: ShoppingBag,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'reservation',
      title: 'Reservation',
      description: 'Book a table for dining in',
      icon: Calendar,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <Dialog open={isServiceSelectionOpen} onOpenChange={setServiceSelectionOpen}>
      <DialogContent className="sm:max-w-[480px]" data-testid="service-selection-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Choose Your Service
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card 
                key={service.id} 
                className={`cursor-pointer transition-all duration-200 ${service.color}`}
                onClick={() => handleServiceSelect(service.id as 'delivery' | 'takeaway' | 'reservation')}
                data-testid={`service-option-${service.id}`}
              >
                <CardContent className="flex items-center p-6">
                  <div className={`p-3 rounded-full bg-white shadow-sm ${service.iconColor} mr-4`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {service.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={() => setServiceSelectionOpen(false)}
            data-testid="button-cancel-service-selection"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}