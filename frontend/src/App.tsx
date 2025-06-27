import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SnackbarProvider } from 'notistack';
import { HelmetProvider } from 'react-helmet-async';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import AccountsPage from '@/pages/accounts/AccountsPage';
import AccountDetailPage from '@/pages/accounts/AccountDetailPage';
import WorkOrdersPage from '@/pages/work-orders/WorkOrdersPage';
import WorkOrderDetailPage from '@/pages/work-orders/WorkOrderDetailPage';
import ServiceAgentsPage from '@/pages/service-agents/ServiceAgentsPage';
import ServiceAgentDetailPage from '@/pages/service-agents/ServiceAgentDetailPage';
import AssetsPage from '@/pages/assets/AssetsPage';
import AssetDetailPage from '@/pages/assets/AssetDetailPage';
import OpportunitiesPage from '@/pages/opportunities/OpportunitiesPage';
import OpportunityDetailPage from '@/pages/opportunities/OpportunityDetailPage';
import PartsPage from '@/pages/parts/PartsPage';
import PartDetailPage from '@/pages/parts/PartDetailPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#d0d0d0',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: '#d0d0d0',
          },
        },
      },
    },
  },
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles = [] }) => {
  const { authState } = useAuth();

  if (authState.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (requiredRoles.length > 0 && authState.user) {
    const userGroups = authState.user.groups || [];
    const hasPermission = requiredRoles.some(role => userGroups.includes(role));
    
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { authState } = useAuth();

  if (authState.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          authState.isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <LoginPage />
        } 
      />
      <Route 
        path="/signup" 
        element={
          authState.isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <SignUpPage />
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          authState.isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <ForgotPasswordPage />
        } 
      />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Accounts */}
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountDetailPage />} />
        
        {/* Work Orders */}
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
        
        {/* Service Agents */}
        <Route 
          path="service-agents" 
          element={
            <ProtectedRoute requiredRoles={['platform_admin', 'field_manager']}>
              <ServiceAgentsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="service-agents/:id" 
          element={
            <ProtectedRoute requiredRoles={['platform_admin', 'field_manager']}>
              <ServiceAgentDetailPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Assets */}
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        
        {/* Opportunities */}
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
        
        {/* Parts */}
        <Route 
          path="parts" 
          element={
            <ProtectedRoute requiredRoles={['platform_admin', 'field_manager']}>
              <PartsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="parts/:id" 
          element={
            <ProtectedRoute requiredRoles={['platform_admin', 'field_manager']}>
              <PartDetailPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Reports */}
        <Route 
          path="reports" 
          element={
            <ProtectedRoute requiredRoles={['platform_admin', 'field_manager']}>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider 
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <AuthProvider>
              <Router>
                <AppRoutes />
              </Router>
            </AuthProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;