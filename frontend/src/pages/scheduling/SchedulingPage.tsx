import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Badge,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet-async';
// Note: Drag and drop functionality would require react-beautiful-dnd package

import { apiService } from '@/services/api';
import { WorkOrder, ServiceAgent } from '@/types';

interface ScheduleOverview {
  date: string;
  total_work_orders: number;
  assigned_work_orders: number;
  unassigned_work_orders: number;
  emergency_work_orders: number;
  agents_scheduled: number;
  agents_available: number;
}

interface AgentAvailability {
  agent_id: string;
  employee_id: string;
  agent_name: string;
  status: string;
  territory: string;
  specializations: string[];
  certification_level: string;
  scheduled_count: number;
  total_scheduled_minutes: number;
  scheduled_work_orders: WorkOrder[];
}

const SchedulingPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [scheduleOverview, setScheduleOverview] = useState<ScheduleOverview[]>([]);
  const [agentsAvailability, setAgentsAvailability] = useState<AgentAvailability[]>([]);
  const [unassignedWorkOrders, setUnassignedWorkOrders] = useState<WorkOrder[]>([]);
  
  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Get date range for current view
  const getDateRange = useCallback(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end };
    } else {
      return { start: currentDate, end: currentDate };
    }
  }, [currentDate, view]);

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { start, end } = getDateRange();
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      const [overviewResponse, agentsResponse, unassignedResponse] = await Promise.all([
        apiService.getScheduleOverviewRange(startDate, endDate),
        apiService.getAllAgentsAvailability(startDate, endDate),
        apiService.getUnassignedWorkOrders({ limit: 20 }),
      ]);

      setScheduleOverview(overviewResponse.data);
      setAgentsAvailability(agentsResponse.data);
      setUnassignedWorkOrders(unassignedResponse.data);
    } catch (err: any) {
      console.error('Error fetching schedule data:', err);
      setError(err.response?.data?.error || 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  // Load data on component mount and when date/view changes
  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Handle work order assignment
  const handleAssignWorkOrder = async () => {
    if (!selectedWorkOrder || !selectedAgent) return;

    try {
      setAssigning(true);
      setAssignError(null);

      await apiService.assignWorkOrder(
        selectedWorkOrder.work_order_id,
        selectedAgent,
        scheduledDateTime || undefined
      );

      // Close dialog and refresh data
      setAssignDialogOpen(false);
      setSelectedWorkOrder(null);
      setSelectedAgent('');
      setScheduledDateTime('');
      await fetchScheduleData();
      
      // Show success message
      console.log(`Work order ${selectedWorkOrder.work_order_number} assigned successfully. Notification sent to agent.`);
    } catch (err: any) {
      console.error('Error assigning work order:', err);
      setAssignError(err.response?.data?.error || 'Failed to assign work order');
    } finally {
      setAssigning(false);
    }
  };

  // Handle work order click for assignment
  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setAssignDialogOpen(true);
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const days = view === 'week' ? 7 : 1;
    setCurrentDate(prev => 
      direction === 'next' ? addDays(prev, days) : addDays(prev, -days)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // Get work orders for a specific agent and date
  const getWorkOrdersForAgentAndDate = (agentId: string, date: Date) => {
    const agent = agentsAvailability.find(a => a.agent_id === agentId);
    if (!agent) return [];

    return agent.scheduled_work_orders.filter(wo => 
      wo.scheduled_date && isSameDay(parseISO(wo.scheduled_date), date)
    );
  };

  // Render week view
  const renderWeekView = () => {
    const { start } = getDateRange();
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <Grid container spacing={1}>
        {days.map((day, index) => {
          const dayOverview = scheduleOverview.find(o => 
            isSameDay(parseISO(o.date), day)
          );

          return (
            <Grid item xs={12/7} key={index}>
              <Paper sx={{ p: 1, minHeight: 400 }}>
                <Box sx={{ mb: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2">
                    {format(day, 'EEE')}
                  </Typography>
                  <Typography variant="h6">
                    {format(day, 'd')}
                  </Typography>
                  {dayOverview && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                      <Chip
                        label={dayOverview.total_work_orders}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {dayOverview.emergency_work_orders > 0 && (
                        <Chip
                          label={`${dayOverview.emergency_work_orders}!`}
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>
                  )}
                </Box>
                
                <Divider sx={{ mb: 1 }} />
                
                {/* Agent schedules for this day */}
                {agentsAvailability.map(agent => {
                  const workOrders = getWorkOrdersForAgentAndDate(agent.agent_id, day);
                  if (workOrders.length === 0) return null;

                  return (
                    <Box key={agent.agent_id} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        {agent.agent_name}
                      </Typography>
                      {workOrders.map((wo) => (
                        <Box
                          key={wo.work_order_id}
                          sx={{
                            p: 0.5,
                            mb: 0.5,
                            bgcolor: 'primary.light',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: 'white'
                            }
                          }}
                          onClick={() => handleWorkOrderClick(wo)}
                        >
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            {wo.work_order_number}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {wo.title}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Scheduling & Dispatch - Field Service CRM</title>
      </Helmet>

      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Scheduling & Dispatch
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* View Toggle */}
              <FormControl size="small">
                <Select
                  value={view}
                  onChange={(e) => setView(e.target.value as 'week' | 'day')}
                >
                  <MenuItem value="week">Week View</MenuItem>
                  <MenuItem value="day">Day View</MenuItem>
                </Select>
              </FormControl>

              {/* Date Navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => navigateDate('prev')}>
                  <ChevronLeftIcon />
                </IconButton>
                
                <Button
                  variant="outlined"
                  onClick={goToToday}
                  startIcon={<TodayIcon />}
                  size="small"
                >
                  Today
                </Button>
                
                <IconButton onClick={() => navigateDate('next')}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchScheduleData}
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Current Date Display */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h5">
              {view === 'week' 
                ? `Week of ${format(getDateRange().start, 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMMM d, yyyy')
              }
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Main Calendar View */}
            <Grid item xs={12} lg={9}>
              {renderWeekView()}
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} lg={3}>
              {/* Schedule Overview */}
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title="Today's Overview"
                  titleTypographyProps={{ variant: 'h6' }}
                  avatar={<ScheduleIcon />}
                />
                <CardContent>
                  {scheduleOverview.find(o => isSameDay(parseISO(o.date), new Date())) ? (
                    <Grid container spacing={2}>
                      {Object.entries(scheduleOverview.find(o => isSameDay(parseISO(o.date), new Date()))!).map(([key, value]) => {
                        if (key === 'date') return null;
                        return (
                          <Grid item xs={6} key={key}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="primary">
                                {value}
                              </Typography>
                              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                {key.replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data for today
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Unassigned Work Orders */}
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon />
                      <span>Unassigned Work Orders</span>
                      <Badge badgeContent={unassignedWorkOrders.length} color="error" />
                    </Box>
                  }
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent sx={{ p: 0 }}>
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {unassignedWorkOrders.map((workOrder) => (
                      <ListItem
                        key={workOrder.work_order_id}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        onClick={() => handleWorkOrderClick(workOrder)}
                      >
                        <ListItemIcon>
                          {workOrder.priority === 'emergency' ? (
                            <WarningIcon color="error" />
                          ) : (
                            <AssignmentIcon />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={workOrder.work_order_number}
                          secondary={
                            <Box>
                              <Typography variant="body2">{workOrder.title}</Typography>
                              <Typography variant="caption">
                                {workOrder.company_name}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={workOrder.priority}
                            size="small"
                            color={getPriorityColor(workOrder.priority) as any}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {unassignedWorkOrders.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No unassigned work orders"
                          primaryTypographyProps={{ 
                            variant: 'body2', 
                            color: 'text.secondary',
                            align: 'center'
                          }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Assignment Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => !assigning && setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Work Order</DialogTitle>
        <DialogContent>
          {assignError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {assignError}
            </Alert>
          )}
          
          {selectedWorkOrder && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {selectedWorkOrder.work_order_number}: {selectedWorkOrder.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedWorkOrder.company_name}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign to Agent</InputLabel>
                <Select
                  value={selectedAgent}
                  label="Assign to Agent"
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  {agentsAvailability.map((agent) => (
                    <MenuItem key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_name} ({agent.employee_id}) - {agent.scheduled_count} scheduled
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Scheduled Date & Time"
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setAssignDialogOpen(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignWorkOrder}
            variant="contained"
            disabled={assigning || !selectedAgent}
            startIcon={assigning ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SchedulingPage;