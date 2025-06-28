import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Work as WorkIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { ServiceAgent, UpdateServiceAgentData } from '@/types';

// Validation schema for service agent editing
const serviceAgentEditValidationSchema = Yup.object({
  specializations: Yup.array()
    .of(Yup.string())
    .min(1, 'At least one specialization is required'),
  certification_level: Yup.string()
    .oneOf(['junior', 'senior', 'master', 'supervisor'], 'Invalid certification level'),
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

const ServiceAgentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State management
  const [agent, setAgent] = useState<ServiceAgent | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch agent data
  const fetchAgent = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [agentResponse, statsResponse, availabilityResponse] = await Promise.all([
        apiService.getServiceAgent(id),
        apiService.getAgentStats(id),
        apiService.getServiceAgentAvailability(id),
      ]);
      
      setAgent(agentResponse.data);
      setStats(statsResponse.data);
      setAvailability(availabilityResponse.data);
    } catch (err: any) {
      console.error('Error fetching service agent:', err);
      setError(err.response?.data?.error || 'Failed to load service agent');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load data on component mount
  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  // Handle agent update
  const handleUpdateAgent = async (values: UpdateServiceAgentData) => {
    if (!id) return;
    
    try {
      setSaving(true);
      setSaveError(null);
      
      // Prepare update data
      const updateData = values;
      
      const response = await apiService.updateServiceAgent(id, updateData);
      setAgent(response.data);
      setEditMode(false);
    } catch (err: any) {
      console.error('Error updating service agent:', err);
      setSaveError(err.response?.data?.error || 'Failed to update service agent');
    } finally {
      setSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/service-agents');
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    setEditMode(!editMode);
    setSaveError(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !agent) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Service agent not found'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
          >
            Back to Service Agents
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{agent.full_name || 'Service Agent'} - Field Service CRM</title>
      </Helmet>
      
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={handleBack}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" component="h1">
                  {agent.full_name || 'Unknown Agent'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Employee ID: {agent.employee_id}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleEditToggle}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEditToggle}
                >
                  Edit Agent
                </Button>
              )}
            </Box>
          </Box>

          {/* Save Error Alert */}
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Main Information */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                {editMode ? (
                  <Formik
                    initialValues={{
                      specializations: agent.specializations || [],
                      certification_level: agent.certification_level || 'junior',
                      territory: agent.territory || '',
                      hourly_rate: agent.hourly_rate || 0,
                      status: agent.status || 'active',
                    }}
                    validationSchema={serviceAgentEditValidationSchema}
                    onSubmit={handleUpdateAgent}
                  >
                    {({ errors, touched, setFieldValue, values }) => (
                      <Form>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EditIcon />
                          Edit Service Agent
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
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
                            <Field name="territory">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Territory"
                                  error={touched.territory && Boolean(errors.territory)}
                                  helperText={touched.territory && errors.territory}
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
                        </Grid>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </Box>
                      </Form>
                    )}
                  </Formik>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon />
                      Agent Information
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Full Name
                          </Typography>
                          <Typography variant="body1">
                            {agent.full_name || 'Not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Email
                          </Typography>
                          <Typography variant="body1">
                            {agent.email || 'Not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Phone
                          </Typography>
                          <Typography variant="body1">
                            {agent.phone || 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Employee ID
                          </Typography>
                          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                            {agent.employee_id}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Hire Date
                          </Typography>
                          <Typography variant="body1">
                            {agent.hire_date ? new Date(agent.hire_date).toLocaleDateString() : 'Not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Status
                          </Typography>
                          <Chip
                            label={agent.status}
                            color={
                              agent.status === 'active' ? 'success' :
                              agent.status === 'on_leave' ? 'warning' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    {/* Professional Information */}
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon />
                      Professional Details
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Specializations
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {agent.specializations?.map((spec, index) => (
                              <Chip
                                key={index}
                                label={spec}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            )) || <Typography color="text.secondary">None specified</Typography>}
                          </Box>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Certification Level
                          </Typography>
                          <Chip
                            label={agent.certification_level}
                            color={
                              agent.certification_level === 'master' ? 'success' :
                              agent.certification_level === 'supervisor' ? 'warning' :
                              agent.certification_level === 'senior' ? 'info' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Territory
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon fontSize="small" color="action" />
                            {agent.territory || 'Not assigned'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Hourly Rate
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MoneyIcon fontSize="small" color="action" />
                            {agent.hourly_rate ? `$${agent.hourly_rate.toFixed(2)}/hr` : 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Paper>
            </Grid>

            {/* Statistics and Availability */}
            <Grid item xs={12} md={4}>
              {/* Statistics Card */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatsIcon />
                    Performance Stats
                  </Typography>
                  
                  {stats && (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {stats.total_work_orders || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Jobs
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {stats.completed_work_orders || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Completed
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            {stats.active_work_orders || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Active Jobs
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">
                            {stats.work_orders_this_month || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            This Month
                          </Typography>
                        </Box>
                      </Grid>
                      {stats.avg_completion_hours && (
                        <Grid item xs={12}>
                          <Box sx={{ textAlign: 'center', mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Avg. Completion Time
                            </Typography>
                            <Typography variant="h6">
                              {parseFloat(stats.avg_completion_hours).toFixed(1)} hours
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </CardContent>
              </Card>

              {/* Today's Schedule Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon />
                    Today's Schedule
                  </Typography>
                  
                  {availability && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {new Date(availability.date).toLocaleDateString()}
                      </Typography>
                      
                      {availability.scheduled_work_orders?.length > 0 ? (
                        availability.scheduled_work_orders.map((order: any) => (
                          <Box key={order.work_order_id} sx={{ mb: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {order.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.scheduled_date ? new Date(order.scheduled_date).toLocaleTimeString() : 'Time TBD'}
                            </Typography>
                            {order.estimated_duration && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Est. {order.estimated_duration} minutes
                              </Typography>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No scheduled work orders for today
                        </Typography>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default ServiceAgentDetailPage;