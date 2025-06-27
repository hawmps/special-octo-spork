import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridPaginationModel,
  GridFilterModel,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { Account, CreateAccountData, PaginatedResponse } from '@/types';

// Validation schema for account creation
const accountValidationSchema = Yup.object({
  company_name: Yup.string()
    .required('Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name must not exceed 255 characters'),
  account_type: Yup.string()
    .required('Account type is required')
    .oneOf(['commercial', 'residential', 'industrial'], 'Invalid account type'),
  billing_address: Yup.string()
    .max(500, 'Billing address must not exceed 500 characters'),
  phone: Yup.string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must not exceed 20 characters'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  website: Yup.string()
    .url('Please enter a valid URL')
    .max(255, 'Website URL must not exceed 255 characters'),
});

const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Table state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
  });
  
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'company_name',
      headerName: 'Company Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ fontWeight: 'medium' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'account_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'commercial' ? 'primary' :
            params.value === 'residential' ? 'secondary' : 'default'
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 140,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'contact_count',
      headerName: 'Contacts',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          {params.value || 0}
        </Box>
      ),
    },
    {
      field: 'work_order_count',
      headerName: 'Work Orders',
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          {params.value || 0}
        </Box>
      ),
    },
    {
      field: 'created_date',
      headerName: 'Created',
      width: 120,
      type: 'date',
      valueGetter: (params) => new Date(params.value),
      renderCell: (params) => (
        new Date(params.row.created_date).toLocaleDateString()
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => navigate(`/accounts/${params.row.account_id}`)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Account">
            <IconButton
              size="small"
              onClick={() => navigate(`/accounts/${params.row.account_id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Fetch accounts data
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PaginatedResponse<Account> = await apiService.getAccounts({
        page: paginationModel.page + 1, // API uses 1-based pagination
        limit: paginationModel.pageSize,
        // Add any filters here when implemented
      });
      
      setAccounts(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
      setError(err.response?.data?.error || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [paginationModel]);

  // Load accounts on component mount and pagination changes
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle account creation
  const handleCreateAccount = async (values: CreateAccountData) => {
    try {
      setCreating(true);
      setCreateError(null);
      
      await apiService.createAccount(values);
      
      // Close dialog and refresh data
      setAddDialogOpen(false);
      fetchAccounts();
    } catch (err: any) {
      console.error('Error creating account:', err);
      setCreateError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAccounts();
  };

  return (
    <>
      <Helmet>
        <title>Accounts - Field Service CRM</title>
      </Helmet>
      
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Accounts
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage customer accounts and company information
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Account
              </Button>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Data Grid */}
          <Paper sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={accounts}
              columns={columns}
              getRowId={(row) => row.account_id}
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              paginationMode="server"
              rowCount={totalCount}
              pageSizeOptions={[10, 25, 50, 100]}
              loading={loading}
              filterMode="server"
              onFilterModelChange={setFilterModel}
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              sx={{
                '& .MuiDataGrid-row:hover': {
                  cursor: 'pointer',
                },
              }}
              onRowClick={(params) => navigate(`/accounts/${params.id}`)}
            />
          </Paper>
        </Box>
      </Container>

      {/* Add Account Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !creating && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Formik
          initialValues={{
            company_name: '',
            account_type: 'commercial' as const,
            billing_address: '',
            phone: '',
            email: '',
            website: '',
          }}
          validationSchema={accountValidationSchema}
          onSubmit={handleCreateAccount}
        >
          {({ errors, touched, isValid, dirty }) => (
            <Form>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogContent>
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={8}>
                    <Field name="company_name">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Company Name *"
                          error={touched.company_name && Boolean(errors.company_name)}
                          helperText={touched.company_name && errors.company_name}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Field name="account_type">
                      {({ field }: any) => (
                        <FormControl fullWidth>
                          <InputLabel>Account Type *</InputLabel>
                          <Select {...field} label="Account Type *">
                            <MenuItem value="commercial">Commercial</MenuItem>
                            <MenuItem value="residential">Residential</MenuItem>
                            <MenuItem value="industrial">Industrial</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="billing_address">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Billing Address"
                          multiline
                          rows={2}
                          error={touched.billing_address && Boolean(errors.billing_address)}
                          helperText={touched.billing_address && errors.billing_address}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="phone">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Phone"
                          error={touched.phone && Boolean(errors.phone)}
                          helperText={touched.phone && errors.phone}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="email">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          type="email"
                          error={touched.email && Boolean(errors.email)}
                          helperText={touched.email && errors.email}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="website">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Website"
                          placeholder="https://"
                          error={touched.website && Boolean(errors.website)}
                          helperText={touched.website && errors.website}
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
                  startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default AccountsPage;