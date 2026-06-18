import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
  userId: number;
}

export function ResetPasswordModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  email,
  userId
}: ResetPasswordModalProps) {
  const [formData, setFormData] = useState({
    otp: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateForm = (): boolean => {
    if (!formData.otp.trim()) {
      setError('Please enter the OTP code');
      return false;
    }

    if (formData.otp.length !== 6) {
      setError('OTP must be 6 digits');
      return false;
    }

    if (!formData.password.trim()) {
      setError('Please enter a new password');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError('Password must contain at least one uppercase letter, lowercase letter, number, and special character');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.resetPassword({
        email,
        password: formData.password,
        otp: formData.otp,
        userId,
        otpType: 1 // For forgot password case
      });

      if (response.success) {
        toast({
          title: "Password Reset Successful!",
          description: "Your password has been updated. You can now log in with your new password.",
        });
        
        // Reset form
        setFormData({ otp: '', password: '', confirmPassword: '' });
        onSuccess();
      }
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setFormData({ otp: '', password: '', confirmPassword: '' });
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null); // Clear error when user starts typing
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
              Reset Password
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-gray-600 text-sm px-4">
            Enter the 6-digit code sent to <strong>{email}</strong> and your new password.
          </p>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* OTP Input */}
            <div className="space-y-2">
              <Label htmlFor="otp" className="sr-only">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={handleInputChange('otp')}
                disabled={isLoading}
                maxLength={6}
                className="w-full focus:border-[#15803d] focus:ring-[#15803d] text-center text-lg tracking-widest"
                data-testid="input-otp-code"
                required
              />
            </div>

            {/* New Password Input */}
            <div className="space-y-2 relative">
              <Label htmlFor="new-password" className="sr-only">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isLoading}
                  className="w-full focus:border-[#15803d] focus:ring-[#15803d] pr-10"
                  data-testid="input-new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2 relative">
              <Label htmlFor="confirm-password" className="sr-only">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  disabled={isLoading}
                  className="w-full focus:border-[#15803d] focus:ring-[#15803d] pr-10"
                  data-testid="input-confirm-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !formData.otp.trim() || !formData.password.trim() || !formData.confirmPassword.trim()}
              className="w-full bg-[#15803d] hover:bg-[#15803d]/90 text-white py-3"
              data-testid="button-reset-password"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          {/* Back Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm text-[#15803d] hover:text-[#15803d]/80 font-medium transition-colors"
              disabled={isLoading}
              data-testid="link-back-to-forgot-password"
            >
              Back to Forgot Password
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}