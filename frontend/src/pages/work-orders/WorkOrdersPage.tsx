import React, { useState, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
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
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

import { apiService } from '@/services/api';
import { WorkOrder, PaginatedResponse, Account, ServiceAgent, CreateWorkOrderData } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Validation schema for work order creation
const workOrderValidationSchema = Yup.object({
  account_id: Yup.string()
    .required('Account is required'),
  title: Yup.string()
    .required('Title is required')
    .max(255, 'Title must not exceed 255 characters'),
  description: Yup.string()
    .max(2000, 'Description must not exceed 2000 characters'),
  priority: Yup.string()
    .oneOf(['low', 'medium', 'high', 'emergency'], 'Invalid priority')
    .required('Priority is required'),
  service_type: Yup.string()
    .max(100, 'Service type must not exceed 100 characters'),
  scheduled_date: Yup.date()
    .nullable()
    .min(new Date(), 'Scheduled date cannot be in the past'),
  estimated_duration: Yup.number()
    .nullable()
    .min(1, 'Estimated duration must be at least 1 minute'),
  status: Yup.string()
    .oneOf(['new', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'], 'Invalid status'),
});

const WorkOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
  });
  
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [serviceAgents, setServiceAgents] = useState<ServiceAgent[]>([]);

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
      }).then((res) => {
        console.log('Work orders API response:', res);
        return res;
      }),
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filtering
  };

  // Fetch accounts and service agents for the create dialog
  const fetchDropdownData = useCallback(async () => {
    try {
      const [accountsResponse, agentsResponse] = await Promise.all([
        apiService.getAccounts({ limit: 100 }),
        apiService.getServiceAgents({ limit: 100 }),
      ]);
      setAccounts(accountsResponse.data);
      setServiceAgents(agentsResponse.data);
    } catch (err: any) {
      console.error('Error fetching dropdown data:', err);
      setCreateError('Failed to load accounts and service agents');
    }
  }, []);

  // Handle work order creation
  const handleCreateWorkOrder = async (values: CreateWorkOrderData) => {
    try {
      setCreating(true);
      setCreateError(null);
      
      // Transform empty strings to null for optional fields
      const cleanedValues = {
        ...values,
        scheduled_date: values.scheduled_date || null,
        assigned_agent_id: values.assigned_agent_id || null,
        description: values.description || null,
        service_type: values.service_type || null,
        notes: values.notes || null,
      };
      
      await apiService.createWorkOrder(cleanedValues);
      
      // Close dialog and refresh data
      setAddDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error('Error creating work order:', err);
      setCreateError(err.response?.data?.error || 'Failed to create work order');
    } finally {
      setCreating(false);
    }
  };

  // Handle dialog open
  const handleDialogOpen = () => {
    setAddDialogOpen(true);
    fetchDropdownData();
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
            onClick={handleDialogOpen}
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
            {(workOrdersData?.data || []).map((workOrder) => (
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
          {workOrdersData && workOrdersData.pagination?.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={workOrdersData.pagination.pages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}

          {(workOrdersData?.data || []).length === 0 && (
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
                  onClick={handleDialogOpen}
                >
                  Create Work Order
                </Button>
              )}
            </Box>
          )}
        </>
      )}

      {/* Create Work Order Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !creating && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Formik
          initialValues={{
            account_id: '',
            assigned_agent_id: '',
            title: '',
            description: '',
            priority: 'medium' as const,
            service_type: '',
            scheduled_date: '',
            estimated_duration: 60,
            notes: '',
            status: 'new' as const,
          }}
          validationSchema={workOrderValidationSchema}
          onSubmit={handleCreateWorkOrder}
        >
          {({ errors, touched, isValid, dirty, setFieldValue, values }) => (
            <Form>
              <DialogTitle>Create New Work Order</DialogTitle>
              <DialogContent>
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={accounts}
                      getOptionLabel={(option) => option.company_name}
                      value={accounts.find(account => account.account_id === values.account_id) || null}
                      onChange={(_, newValue) => {
                        setFieldValue('account_id', newValue?.account_id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Account *"
                          error={touched.account_id && Boolean(errors.account_id)}
                          helperText={touched.account_id && errors.account_id}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={serviceAgents}
                      getOptionLabel={(option) => `${option.full_name || 'Unknown'} (${option.employee_id})`}
                      value={serviceAgents.find(agent => agent.agent_id === values.assigned_agent_id) || null}
                      onChange={(_, newValue) => {
                        setFieldValue('assigned_agent_id', newValue?.agent_id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Assigned Agent"
                          helperText="Leave empty to assign later"
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="title">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Title *"
                          error={touched.title && Boolean(errors.title)}
                          helperText={touched.title && errors.title}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="description">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Description"
                          multiline
                          rows={3}
                          error={touched.description && Boolean(errors.description)}
                          helperText={touched.description && errors.description}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="priority">
                      {({ field }: any) => (
                        <FormControl fullWidth>
                          <InputLabel>Priority *</InputLabel>
                          <Select {...field} label="Priority *">
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="emergency">Emergency</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="service_type">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Service Type"
                          placeholder="e.g., Maintenance, Repair, Installation"
                          error={touched.service_type && Boolean(errors.service_type)}
                          helperText={touched.service_type && errors.service_type}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="scheduled_date">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Scheduled Date"
                          type="datetime-local"
                          InputLabelProps={{ shrink: true }}
                          error={touched.scheduled_date && Boolean(errors.scheduled_date)}
                          helperText={touched.scheduled_date && errors.scheduled_date}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="estimated_duration">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Estimated Duration (minutes)"
                          type="number"
                          error={touched.estimated_duration && Boolean(errors.estimated_duration)}
                          helperText={touched.estimated_duration && errors.estimated_duration}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="notes">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Notes"
                          multiline
                          rows={2}
                          placeholder="Additional notes or special instructions"
                        />
                      )}
                    </Field>
                  </Grid>
                </Grid>
              </DialogContent>
              
              <DialogActions>
                <Button
                  onClick={() => setAddDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={creating || !isValid || !dirty}
                  startIcon={creating ? <CircularProgress size={16} /> : <Add />}
                >
                  {creating ? 'Creating...' : 'Create Work Order'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default WorkOrdersPage;