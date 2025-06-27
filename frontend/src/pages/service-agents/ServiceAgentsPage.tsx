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
  FormControlLabel,
  Checkbox,
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
  Person as PersonIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { ServiceAgent, CreateServiceAgentData, PaginatedResponse, Contact } from '@/types';

// Validation schema for service agent creation
const serviceAgentValidationSchema = Yup.object({
  contact_id: Yup.string()
    .required('Contact is required'),
  employee_id: Yup.string()
    .required('Employee ID is required')
    .min(1, 'Employee ID is required')
    .max(50, 'Employee ID must not exceed 50 characters'),
  specializations: Yup.array()
    .of(Yup.string())
    .min(1, 'At least one specialization is required'),
  certification_level: Yup.string()
    .oneOf(['junior', 'senior', 'master', 'supervisor'], 'Invalid certification level'),
  hire_date: Yup.date()
    .required('Hire date is required')
    .max(new Date(), 'Hire date cannot be in the future'),
  territory: Yup.string()
    .max(100, 'Territory must not exceed 100 characters'),
  hourly_rate: Yup.number()
    .min(0, 'Hourly rate must be positive'),
});

// Common specializations
const SPECIALIZATIONS = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Heating',
  'Cooling',
  'Refrigeration',
  'Boiler Service',
  'Water Heater',
  'Generator Service',
  'Solar Systems',
  'General Maintenance'
];

const ServiceAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [agents, setAgents] = useState<ServiceAgent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
      field: 'full_name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Box sx={{ fontWeight: 'medium' }}>
            {params.value || 'No Name'}
          </Box>
        </Box>
      ),
    },
    {
      field: 'employee_id',
      headerName: 'Employee ID',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'specializations',
      headerName: 'Specializations',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {params.value?.slice(0, 2).map((spec: string, index: number) => (
            <Chip
              key={index}
              label={spec}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
          {params.value?.length > 2 && (
            <Chip
              label={`+${params.value.length - 2}`}
              size="small"
              variant="outlined"
              color="default"
            />
          )}
        </Box>
      ),
    },
    {
      field: 'certification_level',
      headerName: 'Level',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'master' ? 'success' :
            params.value === 'supervisor' ? 'warning' :
            params.value === 'senior' ? 'info' : 'default'
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'territory',
      headerName: 'Territory',
      width: 120,
      renderCell: (params) => params.value || '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'active' ? 'success' :
            params.value === 'on_leave' ? 'warning' : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'active_work_orders',
      headerName: 'Active Jobs',
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ 
          textAlign: 'center', 
          width: '100%',
          color: params.value > 0 ? 'primary.main' : 'text.secondary',
          fontWeight: params.value > 0 ? 'medium' : 'normal'
        }}>
          {params.value || 0}
        </Box>
      ),
    },
    {
      field: 'hire_date',
      headerName: 'Hire Date',
      width: 120,
      type: 'date',
      valueGetter: (params) => params.value ? new Date(params.value) : null,
      renderCell: (params) => (
        params.row.hire_date ? 
        new Date(params.row.hire_date).toLocaleDateString() :
        '—'
      ),
    },
    {
      field: 'hourly_rate',
      headerName: 'Rate',
      width: 100,
      renderCell: (params) => (
        params.value ? `$${parseFloat(params.value).toFixed(0)}/hr` : '—'
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
              onClick={() => navigate(`/service-agents/${params.row.agent_id}`)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Agent">
            <IconButton
              size="small"
              onClick={() => navigate(`/service-agents/${params.row.agent_id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Fetch service agents data
  const fetchServiceAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PaginatedResponse<ServiceAgent> = await apiService.getServiceAgents({
        page: paginationModel.page + 1, // API uses 1-based pagination
        limit: paginationModel.pageSize,
        // Add any filters here when implemented
      });
      
      setAgents(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      console.error('Error fetching service agents:', err);
      setError(err.response?.data?.error || 'Failed to load service agents');
    } finally {
      setLoading(false);
    }
  }, [paginationModel]);

  // Fetch contacts for dropdown (field technicians typically come from employee contacts)
  const fetchContacts = useCallback(async () => {
    try {
      const response = await apiService.getContacts({ limit: 100 });
      setContacts(response.data);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      // Use sample contacts data for now since contacts API might not be implemented
      setContacts([
        { contact_id: '54a3abab-999a-4019-b893-d6d4104d28f3', first_name: 'John', last_name: 'Doe', email: 'john.doe@company.com', phone: '555-0100', account_id: '', mobile_phone: '', role: '', is_primary: false, status: 'active', created_date: '', updated_date: '' },
        { contact_id: '9f07e18c-73ad-442a-a1d5-eb1345f407bb', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@company.com', phone: '555-0101', account_id: '', mobile_phone: '', role: '', is_primary: false, status: 'active', created_date: '', updated_date: '' },
        { contact_id: '7b0aa7d9-6ceb-4dab-aa4a-138186a69a4f', first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@company.com', phone: '555-0102', account_id: '', mobile_phone: '', role: '', is_primary: false, status: 'active', created_date: '', updated_date: '' },
      ]);
    }
  }, []);

  // Load data on component mount and pagination changes
  useEffect(() => {
    fetchServiceAgents();
  }, [fetchServiceAgents]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle service agent creation
  const handleCreateServiceAgent = async (values: CreateServiceAgentData) => {
    try {
      setCreating(true);
      setCreateError(null);
      
      await apiService.createServiceAgent(values);
      
      // Close dialog and refresh data
      setAddDialogOpen(false);
      fetchServiceAgents();
    } catch (err: any) {
      console.error('Error creating service agent:', err);
      setCreateError(err.response?.data?.error || 'Failed to create service agent');
    } finally {
      setCreating(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchServiceAgents();
  };

  return (
    <>
      <Helmet>
        <title>Service Agents - Field Service CRM</title>
      </Helmet>
      
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Service Agents
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage field technicians and service representatives
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
                Add Agent
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
              rows={agents}
              columns={columns}
              getRowId={(row) => row.agent_id}
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
              onRowClick={(params) => navigate(`/service-agents/${params.id}`)}
            />
          </Paper>
        </Box>
      </Container>

      {/* Add Service Agent Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !creating && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Formik
          initialValues={{
            contact_id: '',
            employee_id: '',
            specializations: [] as string[],
            certification_level: 'junior' as const,
            hire_date: '',
            territory: '',
            hourly_rate: '',
            status: 'active' as const,
          }}
          validationSchema={serviceAgentValidationSchema}
          onSubmit={handleCreateServiceAgent}
        >
          {({ errors, touched, isValid, dirty, setFieldValue, values }) => (
            <Form>
              <DialogTitle>Add New Service Agent</DialogTitle>
              <DialogContent>
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={contacts}
                      getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                      value={contacts.find(contact => contact.contact_id === values.contact_id) || null}
                      onChange={(_, newValue) => {
                        setFieldValue('contact_id', newValue?.contact_id || '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Contact *"
                          error={touched.contact_id && Boolean(errors.contact_id)}
                          helperText={touched.contact_id && errors.contact_id}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="employee_id">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Employee ID *"
                          error={touched.employee_id && Boolean(errors.employee_id)}
                          helperText={touched.employee_id && errors.employee_id}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={SPECIALIZATIONS}
                      value={values.specializations}
                      onChange={(_, newValue) => {
                        setFieldValue('specializations', newValue);
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={option}
                            {...getTagProps({ index })}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Specializations *"
                          error={touched.specializations && Boolean(errors.specializations)}
                          helperText={touched.specializations && errors.specializations}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="certification_level">
                      {({ field }: any) => (
                        <FormControl fullWidth>
                          <InputLabel>Certification Level</InputLabel>
                          <Select {...field} label="Certification Level">
                            <MenuItem value="junior">Junior</MenuItem>
                            <MenuItem value="senior">Senior</MenuItem>
                            <MenuItem value="master">Master</MenuItem>
                            <MenuItem value="supervisor">Supervisor</MenuItem>
                          </Select>
                        </FormControl>
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
                            <MenuItem value="on_leave">On Leave</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="hire_date">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Hire Date *"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          error={touched.hire_date && Boolean(errors.hire_date)}
                          helperText={touched.hire_date && errors.hire_date}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Field name="hourly_rate">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Hourly Rate"
                          type="number"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                          }}
                          error={touched.hourly_rate && Boolean(errors.hourly_rate)}
                          helperText={touched.hourly_rate && errors.hourly_rate}
                        />
                      )}
                    </Field>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Field name="territory">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Territory"
                          placeholder="e.g., North Austin, Downtown, West Side"
                          error={touched.territory && Boolean(errors.territory)}
                          helperText={touched.territory && errors.territory}
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
                  {creating ? 'Creating...' : 'Create Agent'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </>
  );
};

export default ServiceAgentsPage;