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
  Autocomplete,
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
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { Asset, CreateAssetData, PaginatedResponse, Account } from '@/types';

// Validation schema for asset creation
const assetValidationSchema = Yup.object({
  account_id: Yup.string()
    .required('Account is required'),
  asset_type: Yup.string()
    .required('Asset type is required')
    .min(1, 'Asset type is required')
    .max(100, 'Asset type must not exceed 100 characters'),
  brand: Yup.string()
    .max(100, 'Brand must not exceed 100 characters'),
  model: Yup.string()
    .max(100, 'Model must not exceed 100 characters'),
  serial_number: Yup.string()
    .max(100, 'Serial number must not exceed 100 characters'),
  installation_date: Yup.date()
    .nullable()
    .max(new Date(), 'Installation date cannot be in the future'),
  warranty_expiry: Yup.date()
    .nullable()
    .min(new Date(), 'Warranty expiry should be in the future'),
  location_description: Yup.string()
    .max(500, 'Location description must not exceed 500 characters'),
});

// Asset type options
const ASSET_TYPES = [
  'HVAC System',
  'Water Heater',
  'Electrical Panel',
  'Furnace',
  'Air Conditioner',
  'Heat Pump',
  'Boiler',
  'Generator',
  'Solar Panel System',
  'Plumbing System',
  'Other'
];

const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [assets, setAssets] = useState<Asset[]>([]);
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
      field: 'asset_type',
      headerName: 'Asset Type',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon fontSize="small" color="action" />
          <Box sx={{ fontWeight: 'medium' }}>
            {params.value}
          </Box>
        </Box>
      ),
    },
    {
      field: 'company_name',
      headerName: 'Account',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'brand',
      headerName: 'Brand',
      width: 120,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 120,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'serial_number',
      headerName: 'Serial Number',
      width: 140,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'active' ? 'success' :
            params.value === 'needs_service' ? 'warning' :
            params.value === 'replaced' ? 'error' : 'default'
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'installation_date',
      headerName: 'Installed',
      width: 120,
      type: 'date',
      valueGetter: (params) => params.value ? new Date(params.value) : null,
      renderCell: (params) => (
        params.row.installation_date ? 
        new Date(params.row.installation_date).toLocaleDateString() :
        '—'
      ),
    },
    {
      field: 'warranty_expiry',
      headerName: 'Warranty',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return '—';
        const expiryDate = new Date(params.value);
        const isExpired = expiryDate < new Date();
        return (
          <Box sx={{ color: isExpired ? 'error.main' : 'text.primary' }}>
            {expiryDate.toLocaleDateString()}
          </Box>
        );
      },
    },
    {
      field: 'service_count',
      headerName: 'Services',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          {params.value || 0}
        </Box>
      ),
    },
    {
      field: 'location_description',
      headerName: 'Location',
      width: 150,
      renderCell: (params) => (
        <Tooltip title={params.value || ''}>
          <Box sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {params.value || '—'}
          </Box>
        </Tooltip>
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
              onClick={() => navigate(`/assets/${params.row.asset_id}`)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Asset">
            <IconButton
              size="small"
              onClick={() => navigate(`/assets/${params.row.asset_id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Fetch assets data
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PaginatedResponse<Asset> = await apiService.getAssets({
        page: paginationModel.page + 1, // API uses 1-based pagination
        limit: paginationModel.pageSize,
        // Add any filters here when implemented
      });
      
      setAssets(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.response?.data?.error || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [paginationModel]);

  // Fetch accounts for dropdown
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await apiService.getAccounts({ limit: 100 });
      setAccounts(response.data);
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
    }
  }, []);

  // Load data on component mount and pagination changes
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle asset creation
  const handleCreateAsset = async (values: CreateAssetData) => {
    try {
      setCreating(true);
      setCreateError(null);
      
      await apiService.createAsset(values);
      
      // Close dialog and refresh data
      setAddDialogOpen(false);
      fetchAssets();
    } catch (err: any) {
      console.error('Error creating asset:', err);
      setCreateError(err.response?.data?.error || 'Failed to create asset');
    } finally {
      setCreating(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAssets();
  };

  return (
    <>
      <Helmet>
        <title>Assets - Field Service CRM</title>
      </Helmet>
      
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Assets
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage customer equipment and asset information
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
                Add Asset
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
              rows={assets}
              columns={columns}
              getRowId={(row) => row.asset_id}
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
              onRowClick={(params) => navigate(`/assets/${params.id}`)}
            />
          </Paper>
        </Box>
      </Container>

      {/* Add Asset Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !creating && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Formik
          initialValues={{
            account_id: '',
            asset_type: '',
            brand: '',
            model: '',
            serial_number: '',
            installation_date: '',
            warranty_expiry: '',
            location_description: '',
            status: 'active' as const,
            notes: '',
          }}
          validationSchema={assetValidationSchema}
          onSubmit={handleCreateAsset}
        >
          {({ errors, touched, isValid, dirty, setFieldValue, values }) => (
            <Form>
              <DialogTitle>Add New Asset</DialogTitle>
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
                      value={accounts.find(acc => acc.account_id === values.account_id) || null}
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
                      options={ASSET_TYPES}
                      freeSolo
                      value={values.asset_type}
                      onChange={(_, newValue) => {
                        setFieldValue('asset_type', newValue || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Asset Type *"
                          error={touched.asset_type && Boolean(errors.asset_type)}
                          helperText={touched.asset_type && errors.asset_type}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="brand">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Brand"
                          error={touched.brand && Boolean(errors.brand)}
                          helperText={touched.brand && errors.brand}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="model">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Model"
                          error={touched.model && Boolean(errors.model)}
                          helperText={touched.model && errors.model}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="serial_number">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Serial Number"
                          error={touched.serial_number && Boolean(errors.serial_number)}
                          helperText={touched.serial_number && errors.serial_number}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="status">
                      {({ field }: any) => (
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select {...field} label="Status">
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="needs_service">Needs Service</MenuItem>
                            <MenuItem value="replaced">Replaced</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="installation_date">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Installation Date"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          error={touched.installation_date && Boolean(errors.installation_date)}
                          helperText={touched.installation_date && errors.installation_date}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="warranty_expiry">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Warranty Expiry"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          error={touched.warranty_expiry && Boolean(errors.warranty_expiry)}
                          helperText={touched.warranty_expiry && errors.warranty_expiry}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="location_description">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Location Description"
                          multiline
                          rows={2}
                          error={touched.location_description && Boolean(errors.location_description)}
                          helperText={touched.location_description && errors.location_description}
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
                          rows={3}
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
                  {creating ? 'Creating...' : 'Create Asset'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default AssetsPage;