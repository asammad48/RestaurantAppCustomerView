import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Orders from "@/pages/orders";
import Delivery from "@/pages/delivery";
import Takeaway from "@/pages/takeaway";
import Reservation from "@/pages/reservation";
import RestaurantMenu from "@/pages/restaurant-menu";
import NotFound from "@/pages/not-found";
import InitialServiceModal from "@/components/modals/initial-service-modal";
import ServiceSelectionModal from "@/components/modals/service-selection-modal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/orders" component={Orders} />
      <Route path="/delivery" component={Delivery} />
      <Route path="/takeaway" component={Takeaway} />
      <Route path="/reservation" component={Reservation} />
      <Route path="/restaurant-menu" component={RestaurantMenu} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InitialServiceModal />
        <ServiceSelectionModal />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
