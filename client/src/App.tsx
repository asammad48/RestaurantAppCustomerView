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
import { ForgotPasswordModal } from "@/components/modals/forgot-password-modal";
import { ResetPasswordModal } from "@/components/modals/reset-password-modal";
import CartModal from "@/components/modals/cart-modal";
import DineInSelectionModal from "@/components/modals/dine-in-selection-modal";
import NotificationModals from "@/components/notification-modals";
import { useSignalR } from "@/hooks/use-signalr";
import { useAuthStore } from "@/lib/auth-store";

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

  const { 
    isForgotPasswordModalOpen,
    isResetPasswordModalOpen,
    forgotPasswordEmail,
    forgotPasswordUserId,
    setForgotPasswordModalOpen,
    setResetPasswordModalOpen,
    setForgotPasswordData,
    clearForgotPasswordData,
    switchToLogin
  } = useAuthStore();

  const handleOtpRequired = (email: string, userId: number) => {
    setForgotPasswordData(email, userId);
    setResetPasswordModalOpen(true);
  };

  const handleResetPasswordSuccess = () => {
    setResetPasswordModalOpen(false);
    clearForgotPasswordData();
    switchToLogin();
  };

  const handleResetPasswordClose = () => {
    setResetPasswordModalOpen(false);
    setForgotPasswordModalOpen(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InitialServiceModal />
        <DineInSelectionModal />
        <LoginModal />
        <SignupModal />
        <ForgotPasswordModal 
          isOpen={isForgotPasswordModalOpen}
          onClose={() => setForgotPasswordModalOpen(false)}
          onBackToLogin={switchToLogin}
          onOtpRequired={handleOtpRequired}
        />
        <ResetPasswordModal 
          isOpen={isResetPasswordModalOpen}
          onClose={handleResetPasswordClose}
          onSuccess={handleResetPasswordSuccess}
          email={forgotPasswordEmail || ''}
          userId={forgotPasswordUserId || 0}
        />
        <CartModal />
        <NotificationModals />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
