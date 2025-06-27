import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Visibility,
  Edit,
  AssignmentTurnedIn,
  AccessTime,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';

import { apiService } from '@/services/api';
import { WorkOrder, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const WorkOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
  });

  const {
    data: workOrdersData,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<WorkOrder>>(
    ['workOrders', page, filters],
    () =>
      apiService.getWorkOrders({
        page,
        limit: 12,
        ...filters,
      }).then((res) => res.data),
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'assigned':
        return 'warning';
      case 'new':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'in_progress':
        return <AccessTime />;
      case 'assigned':
        return <AssignmentTurnedIn />;
      case 'new':
        return <Warning />;
      default:
        return <AccessTime />;
    }
  };

  const canCreateWorkOrder = () => {
    const userGroups = authState.user?.groups || [];
    return userGroups.includes('platform_admin') || 
           userGroups.includes('field_manager') || 
           userGroups.includes('customer_service');
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load work orders. Please try again later.
      </Alert>
    );
  }

  return (
    <>
      <Helmet>
        <title>Work Orders - Field Service CRM</title>
      </Helmet>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Work Orders</Typography>
        {canCreateWorkOrder() && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/work-orders/new')}
          >
            Create Work Order
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search work orders..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilters({ search: '', status: '', priority: '' })}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Work Orders Grid */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {workOrdersData?.data.map((workOrder) => (
              <Grid item xs={12} sm={6} md={4} key={workOrder.work_order_id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" component="div" noWrap>
                        {workOrder.work_order_number}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={workOrder.priority}
                          color={getPriorityColor(workOrder.priority) as any}
                          size="small"
                        />
                        <Chip
                          icon={getStatusIcon(workOrder.status)}
                          label={workOrder.status.replace('_', ' ')}
                          color={getStatusColor(workOrder.status) as any}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                      {workOrder.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {workOrder.company_name}
                    </Typography>

                    {workOrder.agent_name && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Assigned to: {workOrder.agent_name}
                      </Typography>
                    )}

                    {workOrder.scheduled_date && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Scheduled: {format(new Date(workOrder.scheduled_date), 'MMM dd, yyyy h:mm a')}
                      </Typography>
                    )}

                    {workOrder.street_address && (
                      <Typography variant="body2" color="text.secondary">
                        {workOrder.street_address}, {workOrder.city}, {workOrder.state}
                      </Typography>
                    )}

                    {workOrder.total_cost && (
                      <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium' }}>
                        Total: ${workOrder.total_cost.toFixed(2)}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/work-orders/${workOrder.work_order_id}`)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {canCreateWorkOrder() && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/work-orders/${workOrder.work_order_id}/edit`)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {workOrdersData && workOrdersData.pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={workOrdersData.pagination.pages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}

          {workOrdersData?.data.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No work orders found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {filters.search || filters.status || filters.priority
                  ? 'Try adjusting your filters'
                  : 'Create your first work order to get started'}
              </Typography>
              {canCreateWorkOrder() && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/work-orders/new')}
                >
                  Create Work Order
                </Button>
              )}
            </Box>
          )}
        </>
      )}
    </>
  );
};

export default WorkOrdersPage;