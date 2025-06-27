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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  Assessment as StatsIcon,
  Timeline as ActivityIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  Work as WorkIcon,
  TrendingUp as OpportunityIcon,
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiService } from '@/services/api';
import { Account, UpdateAccountData } from '@/types';

// Validation schema for account editing
const accountEditValidationSchema = Yup.object({
  company_name: Yup.string()
    .required('Company name is required')
    .max(255, 'Company name must not exceed 255 characters'),
  account_type: Yup.string()
    .oneOf(['commercial', 'residential', 'industrial'], 'Invalid account type')
    .required('Account type is required'),
  billing_address: Yup.string()
    .max(500, 'Billing address must not exceed 500 characters'),
  phone: Yup.string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number'),
  email: Yup.string()
    .email('Invalid email address'),
  website: Yup.string()
    .url('Invalid website URL'),
  status: Yup.string()
    .oneOf(['active', 'inactive', 'suspended'], 'Invalid status'),
});

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State management
  const [account, setAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch account data
  const fetchAccount = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [accountResponse, statsResponse, activityResponse] = await Promise.all([
        apiService.getAccount(id),
        apiService.getAccountSpecificStats(id),
        apiService.getAccountActivity(id),
      ]);
      
      setAccount(accountResponse.data);
      setStats(statsResponse.data);
      setActivity(activityResponse.data);
    } catch (err: any) {
      console.error('Error fetching account:', err);
      setError(err.response?.data?.error || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load data on component mount
  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Handle account update
  const handleUpdateAccount = async (values: UpdateAccountData) => {
    if (!id) return;
    
    try {
      setSaving(true);
      setSaveError(null);
      
      const response = await apiService.updateAccount(id, values);
      setAccount(response.data);
      setEditMode(false);
    } catch (err: any) {
      console.error('Error updating account:', err);
      setSaveError(err.response?.data?.error || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/accounts');
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    setEditMode(!editMode);
    setSaveError(null);
  };

  // Get status color for activity items
  const getActivityStatusColor = (type: string, status: string) => {
    if (type === 'work_order') {
      return status === 'completed' ? 'success' : 
             status === 'in_progress' ? 'info' : 
             status === 'cancelled' ? 'error' : 'default';
    }
    if (type === 'opportunity') {
      return status === 'closed_won' ? 'success' : 
             status === 'closed_lost' ? 'error' : 'info';
    }
    return 'default';
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'work_order': return <WorkIcon fontSize="small" />;
      case 'opportunity': return <OpportunityIcon fontSize="small" />;
      case 'asset': return <BuildIcon fontSize="small" />;
      default: return <BusinessIcon fontSize="small" />;
    }
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

  if (error || !account) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Account not found'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
          >
            Back to Accounts
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{account.company_name || 'Account'} - Field Service CRM</title>
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
                  {account.company_name || 'Unknown Account'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {account.account_type} account • {account.status}
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
                  Edit Account
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
                      company_name: account.company_name || '',
                      account_type: account.account_type || 'commercial',
                      billing_address: account.billing_address || '',
                      phone: account.phone || '',
                      email: account.email || '',
                      website: account.website || '',
                      status: account.status || 'active',
                    }}
                    validationSchema={accountEditValidationSchema}
                    onSubmit={handleUpdateAccount}
                  >
                    {({ errors, touched }) => (
                      <Form>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EditIcon />
                          Edit Account
                        </Typography>
                        
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
                                  <InputLabel>Account Type</InputLabel>
                                  <Select {...field} label="Account Type">
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
                                  error={touched.email && Boolean(errors.email)}
                                  helperText={touched.email && errors.email}
                                />
                              )}
                            </Field>
                          </Grid>
                          
                          <Grid item xs={12} sm={8}>
                            <Field name="website">
                              {({ field }: any) => (
                                <TextField
                                  {...field}
                                  fullWidth
                                  label="Website"
                                  error={touched.website && Boolean(errors.website)}
                                  helperText={touched.website && errors.website}
                                />
                              )}
                            </Field>
                          </Grid>
                          
                          <Grid item xs={12} sm={4}>
                            <Field name="status">
                              {({ field }: any) => (
                                <FormControl fullWidth>
                                  <InputLabel>Status</InputLabel>
                                  <Select {...field} label="Status">
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                  </Select>
                                </FormControl>
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
                      <BusinessIcon />
                      Account Information
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Company Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {account.company_name || 'Not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Billing Address
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <LocationIcon fontSize="small" color="action" />
                            {account.billing_address || 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Account Type
                          </Typography>
                          <Chip
                            label={account.account_type}
                            color={
                              account.account_type === 'commercial' ? 'primary' :
                              account.account_type === 'industrial' ? 'secondary' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Status
                          </Typography>
                          <Chip
                            label={account.status}
                            color={
                              account.status === 'active' ? 'success' :
                              account.status === 'suspended' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    {/* Contact Information */}
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Phone
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            {account.phone || 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Email
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon fontSize="small" color="action" />
                            {account.email || 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Website
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WebsiteIcon fontSize="small" color="action" />
                            {account.website ? (
                              <a href={account.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                {account.website}
                              </a>
                            ) : 'Not specified'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Contacts Section */}
                    {account.contacts && account.contacts.length > 0 && (
                      <>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon />
                          Contacts ({account.contacts.length})
                        </Typography>
                        
                        <Grid container spacing={2}>
                          {account.contacts.map((contact, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                                <Typography variant="body1" fontWeight="medium">
                                  {contact.first_name} {contact.last_name}
                                  {contact.is_primary && (
                                    <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} />
                                  )}
                                </Typography>
                                {contact.role && (
                                  <Typography variant="body2" color="text.secondary">
                                    {contact.role}
                                  </Typography>
                                )}
                                {contact.email && (
                                  <Typography variant="body2">
                                    {contact.email}
                                  </Typography>
                                )}
                                {contact.phone && (
                                  <Typography variant="body2">
                                    {contact.phone}
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}
                  </>
                )}
              </Paper>
            </Grid>

            {/* Statistics and Activity */}
            <Grid item xs={12} md={4}>
              {/* Statistics Card */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatsIcon />
                    Account Statistics
                  </Typography>
                  
                  {stats && (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {stats.total_contacts || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Contacts
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">
                            {stats.total_assets || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Assets
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
                          <Typography variant="h4" color="success.main">
                            {stats.completed_work_orders || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Completed
                          </Typography>
                        </Box>
                      </Grid>
                      {stats.pipeline_value > 0 && (
                        <Grid item xs={12}>
                          <Box sx={{ textAlign: 'center', mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Pipeline Value
                            </Typography>
                            <Typography variant="h6">
                              ${parseFloat(stats.pipeline_value).toLocaleString()}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Card */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ActivityIcon />
                    Recent Activity
                  </Typography>
                  
                  {activity && activity.length > 0 ? (
                    <List dense>
                      {activity.slice(0, 8).map((item, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {getActivityIcon(item.activity_type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.activity_title}
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {item.activity_category}
                                </Typography>
                                <Chip
                                  label={item.activity_status}
                                  size="small"
                                  color={getActivityStatusColor(item.activity_type, item.activity_status)}
                                  variant="outlined"
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recent activity
                    </Typography>
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

export default AccountDetailPage;