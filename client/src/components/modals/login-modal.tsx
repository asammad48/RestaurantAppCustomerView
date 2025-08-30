import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { authService, AuthService } from '@/services/auth-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

export function LoginModal() {
  const [, setLocation] = useLocation();
  const { 
    isLoginModalOpen, 
    setLoginModalOpen, 
    switchToSignup, 
    login, 
    setLoading, 
    setError, 
    isLoading, 
    error,
    previousPath
  } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const user = AuthService.loginResponseToUser(response);
      login(user, response.token);

      // Navigate back to previous page or home
      if (previousPath) {
        setLocation(previousPath);
      }

      // Reset form
      setFormData({ email: '', password: '' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoginModalOpen(false);
    setError(null);
    setFormData({ email: '', password: '' });
  };

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Logo placeholder */}
          <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
          
          {/* Title */}
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">
              Welcome Back!
            </DialogTitle>
          </DialogHeader>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email or username</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email or username"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="w-full focus:border-[#15803d] focus:ring-[#15803d]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="w-full focus:border-[#15803d] focus:ring-[#15803d]"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-left">
              <button
                type="button"
                className="text-sm text-[#15803d] hover:text-[#15803d]/80 transition-colors"
                disabled={isLoading}
              >
                Forget Password?
              </button>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#15803d] hover:bg-[#15803d]/90 text-white py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </form>

          {/* OR Divider */}
          <div className="w-full flex items-center space-x-4">
            <hr className="flex-1 border-gray-300" />
            <span className="text-sm text-gray-500">OR</span>
            <hr className="flex-1 border-gray-300" />
          </div>

          {/* Social Login Buttons */}
          <div className="flex space-x-4">
            <button 
              type="button" 
              className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              type="button" 
              className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.2 19.9c-2.3 0-4.4-.8-6.1-2.2L6.6 15c.9.6 2 1 3.4 1 3.1 0 5.7-2.2 6.3-5.1H10v-2.2h8.4c.1.6.2 1.3.2 2 0 5.5-3.7 9.2-8.4 9.2z"/>
                <path d="M4.1 17.7C1.6 15.5 0 12.9 0 10c0-2.9 1.6-5.5 4.1-7.7L6.6 5c-.9 1.4-1.4 3-1.4 5s.5 3.6 1.4 5L4.1 17.7z"/>
                <path d="M10.2 0c2.8 0 5.3 1 7.3 2.7L15 5.2c-1.2-1.1-2.8-1.8-4.8-1.8-1.4 0-2.5.4-3.4 1L4.1 2.3C5.8.8 7.9 0 10.2 0z"/>
              </svg>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <span className="text-sm text-gray-500">Don't have an account? </span>
            <button
              type="button"
              onClick={switchToSignup}
              className="text-sm text-[#15803d] hover:text-[#15803d]/80 font-medium transition-colors"
              disabled={isLoading}
            >
              Sign up
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}