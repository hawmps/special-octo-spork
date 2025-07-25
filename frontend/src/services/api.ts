import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthState } from '@/types';

class ApiService {
  private api: AxiosInstance;
  private authState: AuthState | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            const token = this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setAuthState(authState: AuthState) {
    this.authState = authState;
  }

  private getAccessToken(): string | null {
    return this.authState?.accessToken || localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return this.authState?.refreshToken || localStorage.getItem('refreshToken');
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.authState = null;
  }

  private async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${this.api.defaults.baseURL}/auth/refresh`, {
      refreshToken,
    });

    if (response.data.success) {
      const { accessToken, idToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      if (this.authState) {
        this.authState.accessToken = accessToken;
      }
      return accessToken;
    }

    throw new Error('Failed to refresh token');
  }

  // Authentication endpoints
  async signIn(credentials: { email: string; password: string }) {
    // Use development auth endpoint in development mode
    const endpoint = process.env.NODE_ENV === 'development' ? 'auth-dev/signin' : 'auth/signin';
    const response = await this.api.post(endpoint, credentials);
    return response.data;
  }

  async signUp(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    const response = await this.api.post('/auth/signup', userData);
    return response.data;
  }

  async signOut() {
    const response = await this.api.post('/auth/signout');
    this.clearTokens();
    return response.data;
  }

  async getCurrentUser() {
    // Use development auth endpoint in development mode
    const endpoint = process.env.NODE_ENV === 'development' ? 'auth-dev/me' : 'auth/me';
    const response = await this.api.get(endpoint);
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async confirmForgotPassword(email: string, confirmationCode: string, newPassword: string) {
    const response = await this.api.post('/auth/confirm-forgot-password', {
      email,
      confirmationCode,
      newPassword,
    });
    return response.data;
  }

  // Development-only method to get available test users
  async getDevUsers() {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Development users only available in development mode');
    }
    const response = await this.api.get('auth-dev/dev-users');
    return response.data;
  }

  // Accounts
  async getAccounts(params?: any) {
    const response = await this.api.get('/accounts', { params });
    return response.data;
  }

  async getAccount(id: string) {
    const response = await this.api.get(`/accounts/${id}`);
    return response.data;
  }

  async createAccount(data: any) {
    const response = await this.api.post('/accounts', data);
    return response.data;
  }

  async updateAccount(id: string, data: any) {
    const response = await this.api.put(`/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string) {
    const response = await this.api.delete(`/accounts/${id}`);
    return response.data;
  }

  async getAccountStats() {
    const response = await this.api.get('/accounts/stats/overview');
    return response.data;
  }

  async getAccountSpecificStats(id: string) {
    const response = await this.api.get(`/accounts/${id}/stats`);
    return response.data;
  }

  async getAccountActivity(id: string, limit = 10) {
    const response = await this.api.get(`/accounts/${id}/activity`, { params: { limit } });
    return response.data;
  }

  // Contacts
  async getContacts(params?: any) {
    const response = await this.api.get('/contacts', { params });
    return response.data;
  }

  async getContactsByAccount(accountId: string) {
    const response = await this.api.get(`/contacts/account/${accountId}`);
    return response.data;
  }

  async getContact(id: string) {
    const response = await this.api.get(`/contacts/${id}`);
    return response.data;
  }

  async createContact(data: any) {
    const response = await this.api.post('/contacts', data);
    return response.data;
  }

  async updateContact(id: string, data: any) {
    const response = await this.api.put(`/contacts/${id}`, data);
    return response.data;
  }

  async deleteContact(id: string) {
    const response = await this.api.delete(`/contacts/${id}`);
    return response.data;
  }

  // Work Orders
  async getWorkOrders(params?: any) {
    const response = await this.api.get('/work-orders', { params });
    return response.data;
  }

  async getWorkOrder(id: string) {
    const response = await this.api.get(`/work-orders/${id}`);
    return response.data;
  }

  async createWorkOrder(data: any) {
    const response = await this.api.post('/work-orders', data);
    return response.data;
  }

  async updateWorkOrder(id: string, data: any) {
    const response = await this.api.put(`/work-orders/${id}`, data);
    return response.data;
  }

  async updateWorkOrderStatus(id: string, status: string, notes?: string) {
    const response = await this.api.patch(`/work-orders/${id}/status`, { status, notes });
    return response.data;
  }

  async deleteWorkOrder(id: string) {
    const response = await this.api.delete(`/work-orders/${id}`);
    return response.data;
  }

  async getWorkOrdersByAgent(agentId: string, params?: any) {
    const response = await this.api.get(`/work-orders/agent/${agentId}`, { params });
    return response.data;
  }

  async getWorkOrderStats() {
    const response = await this.api.get('/work-orders/stats/overview');
    return response.data;
  }

  // Service Agents
  async getServiceAgents(params?: any) {
    const response = await this.api.get('/service-agents', { params });
    return response.data;
  }

  async getServiceAgent(id: string) {
    const response = await this.api.get(`/service-agents/${id}`);
    return response.data;
  }

  async createServiceAgent(data: any) {
    const response = await this.api.post('/service-agents', data);
    return response.data;
  }

  async updateServiceAgent(id: string, data: any) {
    const response = await this.api.put(`/service-agents/${id}`, data);
    return response.data;
  }

  async getServiceAgentAvailability(id: string, date?: string) {
    const response = await this.api.get(`/service-agents/${id}/availability`, {
      params: { date },
    });
    return response.data;
  }

  async getAgentStats(id: string) {
    const response = await this.api.get(`/service-agents/${id}/stats`);
    return response.data;
  }

  async deleteServiceAgent(id: string) {
    const response = await this.api.delete(`/service-agents/${id}`);
    return response.data;
  }

  async getServiceAgentSpecializations() {
    const response = await this.api.get('/service-agents/specializations/list');
    return response.data;
  }

  async getServiceAgentTerritories() {
    const response = await this.api.get('/service-agents/territories/list');
    return response.data;
  }

  // Assets
  async getAssets(params?: any) {
    const response = await this.api.get('/assets', { params });
    return response.data;
  }

  async getAssetsByAccount(accountId: string, params?: any) {
    const response = await this.api.get(`/assets/account/${accountId}`, { params });
    return response.data;
  }

  async getAsset(id: string) {
    const response = await this.api.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(data: any) {
    const response = await this.api.post('/assets', data);
    return response.data;
  }

  async updateAsset(id: string, data: any) {
    const response = await this.api.put(`/assets/${id}`, data);
    return response.data;
  }

  async deleteAsset(id: string) {
    const response = await this.api.delete(`/assets/${id}`);
    return response.data;
  }

  // Opportunities
  async getOpportunities(params?: any) {
    const response = await this.api.get('/opportunities', { params });
    return response.data;
  }

  async getOpportunity(id: string) {
    const response = await this.api.get(`/opportunities/${id}`);
    return response.data;
  }

  async createOpportunity(data: any) {
    const response = await this.api.post('/opportunities', data);
    return response.data;
  }

  async updateOpportunity(id: string, data: any) {
    const response = await this.api.put(`/opportunities/${id}`, data);
    return response.data;
  }

  async deleteOpportunity(id: string) {
    const response = await this.api.delete(`/opportunities/${id}`);
    return response.data;
  }

  async getOpportunityStats() {
    const response = await this.api.get('/opportunities/stats/overview');
    return response.data;
  }

  // Parts
  async getParts(params?: any) {
    const response = await this.api.get('/parts', { params });
    return response.data;
  }

  async getPart(id: string) {
    const response = await this.api.get(`/parts/${id}`);
    return response.data;
  }

  async createPart(data: any) {
    const response = await this.api.post('/parts', data);
    return response.data;
  }

  async updatePart(id: string, data: any) {
    const response = await this.api.put(`/parts/${id}`, data);
    return response.data;
  }

  async adjustInventory(id: string, adjustment: number, reason?: string) {
    const response = await this.api.patch(`/parts/${id}/inventory`, { adjustment, reason });
    return response.data;
  }

  async getPartCategories() {
    const response = await this.api.get('/parts/categories/list');
    return response.data;
  }

  async getLowStockAlerts() {
    const response = await this.api.get('/parts/alerts/low-stock');
    return response.data;
  }

  // Reports
  async getDashboardStats() {
    const response = await this.api.get('/reports/dashboard');
    return response.data;
  }

  async getPerformanceReport(params?: any) {
    const response = await this.api.get('/reports/work-orders/performance', { params });
    return response.data;
  }

  async getRevenueReport(params?: any) {
    const response = await this.api.get('/reports/revenue', { params });
    return response.data;
  }

  async getCustomerAnalysis(params?: any) {
    const response = await this.api.get('/reports/customers/analysis', { params });
    return response.data;
  }

  async getServiceTypesReport(params?: any) {
    const response = await this.api.get('/reports/service-types', { params });
    return response.data;
  }

  async getAssetMaintenanceReport(params?: any) {
    const response = await this.api.get('/reports/assets/maintenance', { params });
    return response.data;
  }

  async getPartsUsageReport(params?: any) {
    const response = await this.api.get('/reports/parts/usage', { params });
    return response.data;
  }

  // Scheduling
  async getAgentAvailability(agentId: string, startDate: string, endDate: string) {
    const response = await this.api.get(`/scheduling/agents/${agentId}/availability`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  }

  async getAllAgentsAvailability(startDate: string, endDate: string, territory?: string) {
    const response = await this.api.get('/scheduling/agents/availability', {
      params: { start_date: startDate, end_date: endDate, territory }
    });
    return response.data;
  }

  async getUnassignedWorkOrders(params?: any) {
    const response = await this.api.get('/scheduling/work-orders/unassigned', { params });
    return response.data;
  }

  async assignWorkOrder(workOrderId: string, agentId: string, scheduledDate?: string) {
    const response = await this.api.post(`/scheduling/work-orders/${workOrderId}/assign`, {
      agent_id: agentId,
      scheduled_date: scheduledDate
    });
    return response.data;
  }

  async bulkAssignWorkOrders(assignments: Array<{workOrderId: string, agentId: string, scheduledDate?: string}>) {
    const response = await this.api.post('/scheduling/work-orders/bulk-assign', {
      assignments
    });
    return response.data;
  }

  async getSchedulingSuggestions(workOrderId: string) {
    const response = await this.api.get(`/scheduling/work-orders/${workOrderId}/suggestions`);
    return response.data;
  }

  async getScheduleOverview(date: string) {
    const response = await this.api.get('/scheduling/overview', { params: { date } });
    return response.data;
  }

  async getScheduleOverviewRange(startDate: string, endDate: string) {
    const response = await this.api.get('/scheduling/overview/range', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  }

  // Notifications
  async getAgentNotifications(agentId: string, params?: any) {
    const response = await this.api.get(`/scheduling/agents/${agentId}/notifications`, { params });
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.api.patch(`/scheduling/notifications/${notificationId}/read`);
    return response.data;
  }

  async sendManualNotification(agentId: string, workOrderId: string, type?: string, changeType?: string) {
    const response = await this.api.post('/scheduling/notifications/send', {
      agent_id: agentId,
      work_order_id: workOrderId,
      type,
      change_type: changeType
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;