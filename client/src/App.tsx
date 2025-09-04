import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Orders from "@/pages/orders";
import Delivery from "@/pages/delivery";
import ReservationDetail from "@/pages/reservation-detail";
import RestaurantMenu from "@/pages/restaurant-menu";
import OrderHistoryPage from "@/pages/order-history";
import NotFound from "@/pages/not-found";
import InitialServiceModal from "@/components/modals/initial-service-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { SignupModal } from "@/components/modals/signup-modal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Delivery} />
      <Route path="/home" component={Home} />
      <Route path="/orders" component={Orders} />
      <Route path="/order-history" component={OrderHistoryPage} />
      <Route path="/delivery" component={Delivery} />
      <Route path="/reservation-detail" component={ReservationDetail} />
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
        <LoginModal />
        <SignupModal />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
