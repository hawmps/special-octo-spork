-- Field Service CRM Database Schema
-- Migration 001: Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Account table - Primary customer/company entity
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('commercial', 'residential', 'industrial')),
    billing_address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_by UUID,
    updated_by UUID
);

-- Contact table - Individual contacts within accounts
CREATE TABLE contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    role VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID,
    updated_by UUID
);

-- Address table - Physical addresses for contacts and service locations
CREATE TABLE addresses (
    address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'United States',
    address_type VARCHAR(50) DEFAULT 'service' CHECK (address_type IN ('billing', 'service', 'mailing')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT address_reference_check CHECK (
        (contact_id IS NOT NULL AND account_id IS NULL) OR
        (contact_id IS NULL AND account_id IS NOT NULL)
    )
);

-- ServiceAgent table - Field technicians and service personnel (inherits from Contact)
CREATE TABLE service_agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    specializations TEXT[], -- Array of specializations like 'HVAC', 'Plumbing', 'Electrical'
    certification_level VARCHAR(50) DEFAULT 'junior' CHECK (certification_level IN ('junior', 'senior', 'master', 'supervisor')),
    hire_date DATE NOT NULL,
    territory VARCHAR(100),
    hourly_rate DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Opportunity table - Sales opportunities and potential work
CREATE TABLE opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_value DECIMAL(12, 2),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    stage VARCHAR(50) DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    expected_close_date DATE,
    actual_close_date DATE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Asset table - Equipment and systems being serviced
CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    address_id UUID REFERENCES addresses(address_id),
    asset_type VARCHAR(100) NOT NULL, -- 'HVAC System', 'Water Heater', 'Electrical Panel', etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    warranty_expiry DATE,
    location_description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'needs_service', 'replaced')),
    notes TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- WorkOrder table - Service requests and scheduled work
CREATE TABLE work_orders (
    work_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES service_agents(agent_id),
    address_id UUID REFERENCES addresses(address_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    service_type VARCHAR(100), -- 'Installation', 'Repair', 'Maintenance', 'Inspection'
    scheduled_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    customer_signature_url VARCHAR(500),
    notes TEXT,
    internal_notes TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- WorkOrderLine table - Individual line items within work orders
CREATE TABLE work_order_lines (
    line_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(asset_id),
    line_number INTEGER NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    hourly_rate DECIMAL(10, 2),
    labor_cost DECIMAL(10, 2),
    parts_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0)) STORED,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(work_order_id, line_number)
);

-- WorkOrderAttachment table - Photos and documents attached to work orders
CREATE TABLE work_order_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url VARCHAR(500) NOT NULL,
    attachment_type VARCHAR(50) DEFAULT 'photo' CHECK (attachment_type IN ('photo', 'document', 'signature', 'other')),
    description TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Parts table - Inventory items and parts used in service
CREATE TABLE parts (
    part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit_cost DECIMAL(10, 2),
    unit_price DECIMAL(10, 2),
    quantity_on_hand INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- WorkOrderParts table - Parts used in work orders
CREATE TABLE work_order_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_line_id UUID NOT NULL REFERENCES work_order_lines(line_id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES parts(part_id),
    quantity_used INTEGER NOT NULL CHECK (quantity_used > 0),
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_used * unit_cost) STORED,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- TimeEntry table - Time tracking for work orders
CREATE TABLE time_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES service_agents(agent_id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5, 2),
    hourly_rate DECIMAL(10, 2),
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(total_hours, 0) * COALESCE(hourly_rate, 0)) STORED,
    entry_type VARCHAR(50) DEFAULT 'regular' CHECK (entry_type IN ('regular', 'overtime', 'travel', 'break')),
    description TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Create indexes for better performance
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_created_date ON accounts(created_date);

CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_primary ON contacts(is_primary);

CREATE INDEX idx_addresses_contact_id ON addresses(contact_id);
CREATE INDEX idx_addresses_account_id ON addresses(account_id);
CREATE INDEX idx_addresses_type ON addresses(address_type);

CREATE INDEX idx_service_agents_status ON service_agents(status);
CREATE INDEX idx_service_agents_territory ON service_agents(territory);
CREATE INDEX idx_service_agents_specializations ON service_agents USING GIN(specializations);

CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_expected_close_date ON opportunities(expected_close_date);

CREATE INDEX idx_assets_account_id ON assets(account_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);

CREATE INDEX idx_work_orders_account_id ON work_orders(account_id);
CREATE INDEX idx_work_orders_assigned_agent_id ON work_orders(assigned_agent_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_scheduled_date ON work_orders(scheduled_date);
CREATE INDEX idx_work_orders_created_date ON work_orders(created_date);

CREATE INDEX idx_work_order_lines_work_order_id ON work_order_lines(work_order_id);
CREATE INDEX idx_work_order_lines_asset_id ON work_order_lines(asset_id);

CREATE INDEX idx_work_order_attachments_work_order_id ON work_order_attachments(work_order_id);

CREATE INDEX idx_parts_part_number ON parts(part_number);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_status ON parts(status);

CREATE INDEX idx_time_entries_work_order_id ON time_entries(work_order_id);
CREATE INDEX idx_time_entries_agent_id ON time_entries(agent_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Create function to automatically update updated_date
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_date
CREATE TRIGGER update_accounts_updated_date BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_contacts_updated_date BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_addresses_updated_date BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_service_agents_updated_date BEFORE UPDATE ON service_agents FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_opportunities_updated_date BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_assets_updated_date BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_work_orders_updated_date BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_work_order_lines_updated_date BEFORE UPDATE ON work_order_lines FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_parts_updated_date BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_time_entries_updated_date BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- Create sequence for work order numbers
CREATE SEQUENCE work_order_number_seq START 1000;

-- Create function to generate work order numbers
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
        NEW.work_order_number = 'WO-' || LPAD(nextval('work_order_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for work order number generation
CREATE TRIGGER generate_work_order_number_trigger
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_work_order_number();