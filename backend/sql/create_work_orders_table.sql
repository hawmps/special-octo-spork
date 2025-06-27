-- Create work_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT 'WO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0'),
    account_id UUID NOT NULL REFERENCES accounts(account_id),
    assigned_agent_id UUID REFERENCES service_agents(agent_id),
    address_id UUID REFERENCES addresses(address_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    service_type VARCHAR(100),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    internal_notes TEXT,
    customer_signature_url VARCHAR(255),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_account_id ON work_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_agent_id ON work_orders(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_date ON work_orders(created_date);

-- Create trigger to update updated_date
CREATE OR REPLACE FUNCTION update_work_orders_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_work_orders_updated_date
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_date();

-- Insert sample work orders (optional)
INSERT INTO work_orders (
    account_id, 
    title, 
    description, 
    priority, 
    status, 
    service_type,
    created_by,
    updated_by
)
SELECT 
    a.account_id,
    'Sample Work Order for ' || a.company_name,
    'This is a sample work order created for testing purposes.',
    'medium',
    'new',
    'Maintenance',
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
FROM accounts a
LIMIT 3
ON CONFLICT DO NOTHING;