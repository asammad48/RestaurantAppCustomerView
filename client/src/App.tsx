import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Delivery from "@/pages/delivery";
import ReservationDetail from "@/pages/reservation-detail";
import RestaurantMenu from "@/pages/restaurant-menu";
import OrderHistoryPage from "@/pages/order-history";
import ReservationsPage from "@/pages/reservations";
import NotFound from "@/pages/not-found";
import InitialServiceModal from "@/components/modals/initial-service-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { SignupModal } from "@/components/modals/signup-modal";
import CartModal from "@/components/modals/cart-modal";
import DineInSelectionModal from "@/components/modals/dine-in-selection-modal";
import NotificationModals from "@/components/notification-modals";
import { useSignalR } from "@/hooks/use-signalr";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Delivery} />
      <Route path="/home" component={Home} />
      <Route path="/order-history" component={OrderHistoryPage} />
      <Route path="/reservations" component={ReservationsPage} />
      <Route path="/delivery" component={Delivery} />
      <Route path="/reservation-detail" component={ReservationDetail} />
      <Route path="/restaurant-menu" component={RestaurantMenu} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize SignalR connection management based on authentication status
  useSignalR();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InitialServiceModal />
        <DineInSelectionModal />
        <LoginModal />
        <SignupModal />
        <CartModal />
        <NotificationModals />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
