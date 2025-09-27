import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  onOtpRequired: (email: string, userId: number) => void;
}

export function ForgotPasswordModal({ 
  isOpen, 
  onClose, 
  onBackToLogin,
  onOtpRequired 
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.forgotPassword(email.trim());

      if (response.success && response.data) {
        // Close this modal and show OTP modal
        onClose();
        onOtpRequired(email.trim(), response.data.userId);
        
        // Reset form
        setEmail('');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setEmail('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] sm:max-w-md md:max-w-lg lg:max-w-xl sm:w-auto mx-auto">
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Logo placeholder */}
          <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
          
          {/* Title */}
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">
              Forgot Password?
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-gray-600 text-sm px-4">
            Enter your email address and we'll send you a code to reset your password.
          </p>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="sr-only">Email address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full focus:border-[#15803d] focus:ring-[#15803d]"
                data-testid="input-forgot-password-email"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-[#15803d] hover:bg-[#15803d]/90 text-white py-3"
              data-testid="button-send-reset-code"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>
          </form>

          {/* Back to Login Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-[#15803d] hover:text-[#15803d]/80 font-medium transition-colors"
              disabled={isLoading}
              data-testid="link-back-to-login"
            >
              Back to Login
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}