import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  name: string;
  fullName: string;
  mobileNumber?: string | null;
  profilePicture?: string | null;
  roles: Array<{
    roleId: number;
    roleName: string;
  }>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  isSignupModalOpen: boolean;
  isForgotPasswordModalOpen: boolean;
  isResetPasswordModalOpen: boolean;
  forgotPasswordEmail: string | null;
  forgotPasswordUserId: number | null;
  previousPath: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoginModalOpen: (open: boolean) => void;
  setSignupModalOpen: (open: boolean) => void;
  setForgotPasswordModalOpen: (open: boolean) => void;
  setResetPasswordModalOpen: (open: boolean) => void;
  setForgotPasswordData: (email: string, userId: number) => void;
  clearForgotPasswordData: () => void;
  setPreviousPath: (path: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  switchToLogin: () => void;
  switchToSignup: () => void;
  switchToForgotPassword: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoginModalOpen: false,
      isSignupModalOpen: false,
      isForgotPasswordModalOpen: false,
      isResetPasswordModalOpen: false,
      forgotPasswordEmail: null,
      forgotPasswordUserId: null,
      previousPath: null,
      isLoading: false,
      error: null,

      setUser: (user: User | null) => set({ 
        user, 
        isAuthenticated: !!user 
      }),

      setToken: (token: string | null) => set({ token }),

      login: (user: User, token: string) => set({ 
        user, 
        token, 
        isAuthenticated: true,
        isLoginModalOpen: false,
        isSignupModalOpen: false,
        error: null
      }),

      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        isLoginModalOpen: false,
        isSignupModalOpen: false,
        error: null
      }),

      setLoginModalOpen: (open: boolean) => set({ 
        isLoginModalOpen: open,
        isSignupModalOpen: false,
        error: null
      }),

      setSignupModalOpen: (open: boolean) => set({ 
        isSignupModalOpen: open,
        isLoginModalOpen: false,
        isForgotPasswordModalOpen: false,
        isResetPasswordModalOpen: false,
        error: null
      }),

      setForgotPasswordModalOpen: (open: boolean) => set({ 
        isForgotPasswordModalOpen: open,
        isLoginModalOpen: false,
        isSignupModalOpen: false,
        isResetPasswordModalOpen: false,
        error: null
      }),

      setResetPasswordModalOpen: (open: boolean) => set({ 
        isResetPasswordModalOpen: open,
        isLoginModalOpen: false,
        isSignupModalOpen: false,
        isForgotPasswordModalOpen: false,
        error: null
      }),

      setForgotPasswordData: (email: string, userId: number) => set({ 
        forgotPasswordEmail: email,
        forgotPasswordUserId: userId
      }),

      clearForgotPasswordData: () => set({ 
        forgotPasswordEmail: null,
        forgotPasswordUserId: null
      }),

      setPreviousPath: (path: string | null) => set({ previousPath: path }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error }),

      switchToLogin: () => set({ 
        isLoginModalOpen: true, 
        isSignupModalOpen: false,
        isForgotPasswordModalOpen: false,
        isResetPasswordModalOpen: false,
        error: null
      }),

      switchToSignup: () => set({ 
        isSignupModalOpen: true, 
        isLoginModalOpen: false,
        isForgotPasswordModalOpen: false,
        isResetPasswordModalOpen: false,
        error: null
      }),

      switchToForgotPassword: () => set({ 
        isForgotPasswordModalOpen: true, 
        isLoginModalOpen: false,
        isSignupModalOpen: false,
        isResetPasswordModalOpen: false,
        error: null
      })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);