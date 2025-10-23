import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Delivery from "@/pages/delivery";
import RestaurantMenu from "@/pages/restaurant-menu";
import OrderHistoryPage from "@/pages/order-history";
import ReservationPage from "@/pages/reservation";
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
import { pushNotificationService } from "@/services/push-notification-service";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Delivery} />
      <Route path="/order-history" component={OrderHistoryPage} />
      <Route path="/reservation" component={ReservationPage} />
      <Route path="/restaurant-menu" component={RestaurantMenu} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize SignalR connection management based on authentication status
  useSignalR();

  // Initialize push notifications on app load
  useEffect(() => {
    pushNotificationService.initializeOnLoad().catch(err => {
      console.log('Push notification initialization failed:', err);
    });
  }, []);

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
