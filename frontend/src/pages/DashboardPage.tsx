import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Business,
  Assignment,
  People,
  AttachMoney,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { apiService } from '@/services/api';
import { DashboardStats } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: 1,
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" component="div" fontWeight="bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useQuery<DashboardStats>('dashboardStats', () =>
    apiService.getDashboardStats().then((res) => res.data)
  );

  const {
    data: lowStockParts,
    isLoading: isPartsLoading,
  } = useQuery('lowStockParts', () =>
    apiService.getLowStockAlerts().then((res) => res.data)
  );

  if (isDashboardLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (dashboardError) {
    return (
      <Alert severity="error">
        Failed to load dashboard data. Please try again later.
      </Alert>
    );
  }

  const workOrderStatusData = dashboardData ? [
    { name: 'New', value: dashboardData.workOrders.new, color: '#2196f3' },
    { name: 'Assigned', value: dashboardData.workOrders.assigned, color: '#ff9800' },
    { name: 'In Progress', value: dashboardData.workOrders.in_progress, color: '#4caf50' },
    { name: 'Completed', value: dashboardData.workOrders.completed, color: '#9c27b0' },
  ] : [];

  const priorityData = dashboardData ? [
    { name: 'Emergency', value: dashboardData.workOrders.emergency },
    { name: 'High Priority', value: dashboardData.workOrders.emergency + 50 }, // Mock data
    { name: 'Medium Priority', value: dashboardData.workOrders.total - dashboardData.workOrders.emergency - 100 },
    { name: 'Low Priority', value: 50 }, // Mock data
  ] : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Field Service CRM</title>
      </Helmet>
      
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Accounts"
            value={dashboardData?.accounts.total || 0}
            icon={<Business />}
            color="#1976d2"
            subtitle={`${dashboardData?.accounts.new_this_month || 0} new this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Work Orders"
            value={
              (dashboardData?.workOrders.assigned || 0) +
              (dashboardData?.workOrders.in_progress || 0)
            }
            icon={<Assignment />}
            color="#2e7d32"
            subtitle={`${dashboardData?.workOrders.emergency || 0} emergency`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Service Agents"
            value={dashboardData?.serviceAgents.active || 0}
            icon={<People />}
            color="#ed6c02"
            subtitle={`${dashboardData?.serviceAgents.on_leave || 0} on leave`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(dashboardData?.revenue.revenue_this_month || 0)}
            icon={<AttachMoney />}
            color="#9c27b0"
            subtitle={`${formatCurrency(dashboardData?.revenue.revenue_this_week || 0)} this week`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Work Order Status Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Work Order Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workOrderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workOrderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Work Order Priority Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Key Metrics
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Work Orders This Week</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {dashboardData?.workOrders.scheduled_this_week || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Completion Rate</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {dashboardData?.workOrders.total
                    ? Math.round(
                        ((dashboardData.workOrders.completed || 0) / dashboardData.workOrders.total) * 100
                      )
                    : 0}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Active Accounts</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {dashboardData?.accounts.active || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Revenue</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(dashboardData?.revenue.total_revenue || 0)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Alerts & Notifications
            </Typography>
            {isPartsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Box sx={{ mt: 2 }}>
                {lowStockParts && lowStockParts.length > 0 ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'warning.main' }}>
                      <Warning sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {lowStockParts.length} parts are low in stock
                      </Typography>
                    </Box>
                    {lowStockParts.slice(0, 3).map((part: any) => (
                      <Box key={part.part_id} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          {part.name} - {part.quantity_on_hand} remaining
                        </Typography>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No critical alerts at this time
                  </Typography>
                )}
                
                {dashboardData?.workOrders.emergency && dashboardData.workOrders.emergency > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: 'error.main' }}>
                    <Warning sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      {dashboardData.workOrders.emergency} emergency work orders require attention
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default DashboardPage;