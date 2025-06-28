// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  groups: string[];
  enabled: boolean;
  status: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

// Account Types
export interface Account {
  account_id: string;
  company_name: string;
  account_type: 'commercial' | 'residential' | 'industrial';
  billing_address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_date: string;
  updated_date: string;
  contact_count?: number;
  work_order_count?: number;
  contacts?: Contact[];
}

// Contact Types
export interface Contact {
  contact_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  role?: string;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_date: string;
  updated_date: string;
  company_name?: string;
}

// Service Agent Types
export interface ServiceAgent {
  agent_id: string;
  contact_id: string;
  employee_id: string;
  specializations: string[];
  certification_level: 'junior' | 'senior' | 'master' | 'supervisor';
  hire_date: string;
  territory?: string;
  hourly_rate?: number;
  status: 'active' | 'inactive' | 'on_leave';
  created_date: string;
  updated_date: string;
  full_name?: string;
  email?: string;
  phone?: string;
  active_work_orders?: number;
}

// Work Order Types
export interface WorkOrder {
  work_order_id: string;
  work_order_number: string;
  account_id: string;
  assigned_agent_id?: string;
  address_id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'new' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  service_type?: string;
  scheduled_date?: string;
  estimated_duration?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  completion_date?: string;
  notes?: string;
  internal_notes?: string;
  customer_signature_url?: string;
  created_date: string;
  updated_date: string;
  company_name?: string;
  agent_name?: string;
  agent_employee_id?: string;
  street_address?: string;
  city?: string;
  state?: string;
  line_count?: number;
  total_cost?: number;
  lines?: WorkOrderLine[];
  attachments?: WorkOrderAttachment[];
}

export interface WorkOrderLine {
  line_id: string;
  work_order_id: string;
  asset_id?: string;
  line_number: number;
  service_type: string;
  description: string;
  estimated_hours?: number;
  actual_hours?: number;
  hourly_rate?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_date: string;
  updated_date: string;
}

export interface WorkOrderAttachment {
  attachment_id: string;
  work_order_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  s3_url: string;
  attachment_type: 'photo' | 'document' | 'signature' | 'other';
  description?: string;
  created_date: string;
}

// Asset Types
export interface Asset {
  asset_id: string;
  account_id: string;
  address_id?: string;
  asset_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  warranty_expiry?: string;
  location_description?: string;
  status: 'active' | 'inactive' | 'needs_service' | 'replaced';
  notes?: string;
  created_date: string;
  updated_date: string;
  company_name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  service_count?: number;
  service_history?: AssetServiceHistory[];
}

export interface AssetServiceHistory {
  work_order_id: string;
  title: string;
  status: string;
  completion_date?: string;
  service_type: string;
  description: string;
  technician_name?: string;
}

// Opportunity Types
export interface Opportunity {
  opportunity_id: string;
  account_id: string;
  title: string;
  description?: string;
  estimated_value?: number;
  probability?: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  expected_close_date?: string;
  actual_close_date?: string;
  created_date: string;
  updated_date: string;
  company_name?: string;
  weighted_value?: number;
}

// Part Types
export interface Part {
  part_id: string;
  part_number: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  unit_cost?: number;
  unit_price?: number;
  quantity_on_hand: number;
  reorder_level: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_date: string;
  updated_date: string;
  needs_reorder?: boolean;
  usage_history?: PartUsageHistory[];
}

export interface PartUsageHistory {
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  created_date: string;
  work_order_number: string;
  work_order_title: string;
  company_name: string;
}

// Address Types
export interface Address {
  address_id: string;
  contact_id?: string;
  account_id?: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  address_type: 'billing' | 'service' | 'mailing';
  latitude?: number;
  longitude?: number;
  created_date: string;
  updated_date: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any[];
}

// Dashboard Types
export interface DashboardStats {
  accounts: {
    total: number;
    active: number;
    new_this_month: number;
  };
  workOrders: {
    total: number;
    new: number;
    assigned: number;
    in_progress: number;
    completed: number;
    emergency: number;
    scheduled_this_week: number;
  };
  serviceAgents: {
    total: number;
    active: number;
    on_leave: number;
  };
  revenue: {
    total_revenue: number;
    revenue_this_month: number;
    revenue_this_week: number;
  };
}

// Report Types
export interface PerformanceReport {
  agent_name: string;
  employee_id: string;
  completed_work_orders: number;
  avg_completion_hours: number;
  total_revenue: number;
  avg_job_value: number;
}

export interface RevenueReport {
  period: string;
  work_orders_completed: number;
  labor_revenue: number;
  parts_revenue: number;
  total_revenue: number;
  avg_job_value: number;
}

// Filter Types
export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  assigned_agent_id?: string;
  account_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AccountFilters {
  status?: string;
  account_type?: string;
}

export interface PartFilters {
  category?: string;
  status?: string;
  low_stock?: boolean;
}

// Form Types
export type CreateAccountData = Omit<Account, 'account_id' | 'created_date' | 'updated_date' | 'contact_count' | 'work_order_count'>;
export type UpdateAccountData = Partial<CreateAccountData>;

export type CreateContactData = Omit<Contact, 'contact_id' | 'created_date' | 'updated_date' | 'company_name'>;
export type UpdateContactData = Partial<CreateContactData>;

export type CreateWorkOrderData = Omit<WorkOrder, 'work_order_id' | 'work_order_number' | 'created_date' | 'updated_date' | 'company_name' | 'agent_name' | 'agent_employee_id' | 'street_address' | 'city' | 'state' | 'line_count' | 'total_cost' | 'lines' | 'attachments'>;
export type UpdateWorkOrderData = Partial<CreateWorkOrderData>;

export type CreateAssetData = Omit<Asset, 'asset_id' | 'created_date' | 'updated_date' | 'company_name' | 'street_address' | 'city' | 'state' | 'zip_code' | 'service_count' | 'service_history'>;
export type UpdateAssetData = Partial<CreateAssetData>;

export type CreateOpportunityData = Omit<Opportunity, 'opportunity_id' | 'created_date' | 'updated_date' | 'company_name' | 'weighted_value'>;
export type UpdateOpportunityData = Partial<CreateOpportunityData>;

export type CreatePartData = Omit<Part, 'part_id' | 'created_date' | 'updated_date' | 'needs_reorder' | 'usage_history'>;
export type UpdatePartData = Partial<CreatePartData>;

export type CreateServiceAgentData = Omit<ServiceAgent, 'agent_id' | 'created_date' | 'updated_date' | 'full_name' | 'email' | 'phone' | 'active_work_orders'>;
export type UpdateServiceAgentData = Partial<CreateServiceAgentData>;