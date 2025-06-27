import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, SignUpData } from '@/types';
import { apiService } from '@/services/api';

interface AuthContextType {
  authState: AuthState;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (userData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    apiService.setAuthState(authState);
  }, [authState]);

  const initializeAuth = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
      try {
        const response = await apiService.getCurrentUser();
        if (response.success) {
          setAuthState(prev => ({
            ...prev,
            user: response.data,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          }));
          return;
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
        // Clear invalid tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }

    setAuthState(prev => ({
      ...prev,
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }));
  };

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiService.signIn(credentials);
      
      if (response.success) {
        const { accessToken, refreshToken, user } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        setAuthState({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Sign in failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (userData: SignUpData) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiService.signUp(userData);
      
      if (!response.success) {
        throw new Error(response.error || 'Sign up failed');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signOut = async () => {
    try {
      await apiService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuthState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await apiService.forgotPassword(email);
    if (!response.success) {
      throw new Error(response.error || 'Failed to send reset code');
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    const response = await apiService.confirmForgotPassword(email, code, newPassword);
    if (!response.success) {
      throw new Error(response.error || 'Failed to reset password');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success) {
        setAuthState(prev => ({
          ...prev,
          user: response.data,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    authState,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default useAuth;