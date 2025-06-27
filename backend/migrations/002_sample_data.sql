-- Sample data for Field Service CRM
-- Migration 002: Sample Data

-- Insert sample accounts
INSERT INTO accounts (company_name, account_type, billing_address, phone, email, status) VALUES
('ABC Manufacturing Inc', 'commercial', '123 Industrial Blvd, Manufacturing City, TX 75001', '555-0101', 'accounts@abcmfg.com', 'active'),
('Smith Residence', 'residential', '456 Oak Street, Suburban Town, TX 75002', '555-0102', 'john.smith@email.com', 'active'),
('Downtown Office Complex', 'commercial', '789 Business Ave, Downtown, TX 75003', '555-0103', 'maintenance@downtowncomplex.com', 'active'),
('Johnson Family Home', 'residential', '321 Maple Drive, Residential Area, TX 75004', '555-0104', 'sarah.johnson@email.com', 'active'),
('TechCorp Headquarters', 'commercial', '555 Technology Parkway, Tech District, TX 75005', '555-0105', 'facilities@techcorp.com', 'active');

-- Insert sample contacts
INSERT INTO contacts (account_id, first_name, last_name, email, phone, role, is_primary) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'Robert', 'Wilson', 'robert.wilson@abcmfg.com', '555-0111', 'Facilities Manager', true),
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'Lisa', 'Brown', 'lisa.brown@abcmfg.com', '555-0112', 'Maintenance Supervisor', false),
((SELECT account_id FROM accounts WHERE company_name = 'Smith Residence'), 'John', 'Smith', 'john.smith@email.com', '555-0102', 'Homeowner', true),
((SELECT account_id FROM accounts WHERE company_name = 'Downtown Office Complex'), 'Michael', 'Davis', 'michael.davis@downtowncomplex.com', '555-0113', 'Property Manager', true),
((SELECT account_id FROM accounts WHERE company_name = 'Johnson Family Home'), 'Sarah', 'Johnson', 'sarah.johnson@email.com', '555-0104', 'Homeowner', true),
((SELECT account_id FROM accounts WHERE company_name = 'TechCorp Headquarters'), 'David', 'Martinez', 'david.martinez@techcorp.com', '555-0114', 'Facilities Director', true);

-- Insert sample addresses
INSERT INTO addresses (account_id, street_address, city, state, zip_code, address_type, latitude, longitude) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), '123 Industrial Blvd', 'Manufacturing City', 'TX', '75001', 'service', 32.7767, -96.7970),
((SELECT account_id FROM accounts WHERE company_name = 'Smith Residence'), '456 Oak Street', 'Suburban Town', 'TX', '75002', 'service', 32.7834, -96.8067),
((SELECT account_id FROM accounts WHERE company_name = 'Downtown Office Complex'), '789 Business Ave', 'Downtown', 'TX', '75003', 'service', 32.7831, -96.8067),
((SELECT account_id FROM accounts WHERE company_name = 'Johnson Family Home'), '321 Maple Drive', 'Residential Area', 'TX', '75004', 'service', 32.7901, -96.8134),
((SELECT account_id FROM accounts WHERE company_name = 'TechCorp Headquarters'), '555 Technology Parkway', 'Tech District', 'TX', '75005', 'service', 32.7968, -96.8201);

-- Insert sample service agents
INSERT INTO service_agents (contact_id, employee_id, specializations, certification_level, hire_date, territory, hourly_rate, status) VALUES
((SELECT contact_id FROM contacts WHERE first_name = 'Robert' AND last_name = 'Wilson'), 'EMP001', ARRAY['HVAC', 'Electrical'], 'senior', '2020-01-15', 'North Dallas', 65.00, 'active'),
((SELECT contact_id FROM contacts WHERE first_name = 'Lisa' AND last_name = 'Brown'), 'EMP002', ARRAY['Plumbing', 'General Maintenance'], 'master', '2018-03-20', 'South Dallas', 75.00, 'active');

-- Insert additional service agents (not linked to existing contacts)
INSERT INTO contacts (account_id, first_name, last_name, email, phone, role, is_primary) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'Tom', 'Anderson', 'tom.anderson@company.com', '555-0201', 'Field Technician', false),
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'Maria', 'Garcia', 'maria.garcia@company.com', '555-0202', 'Senior Technician', false),
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'James', 'Taylor', 'james.taylor@company.com', '555-0203', 'HVAC Specialist', false);

INSERT INTO service_agents (contact_id, employee_id, specializations, certification_level, hire_date, territory, hourly_rate, status) VALUES
((SELECT contact_id FROM contacts WHERE first_name = 'Tom' AND last_name = 'Anderson'), 'EMP003', ARRAY['HVAC', 'Refrigeration'], 'junior', '2021-06-10', 'East Dallas', 45.00, 'active'),
((SELECT contact_id FROM contacts WHERE first_name = 'Maria' AND last_name = 'Garcia'), 'EMP004', ARRAY['Electrical', 'Security Systems'], 'senior', '2019-09-15', 'West Dallas', 68.00, 'active'),
((SELECT contact_id FROM contacts WHERE first_name = 'James' AND last_name = 'Taylor'), 'EMP005', ARRAY['HVAC'], 'master', '2017-02-28', 'Central Dallas', 80.00, 'active');

-- Insert sample opportunities
INSERT INTO opportunities (account_id, title, description, estimated_value, probability, stage, expected_close_date) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'Complete HVAC System Upgrade', 'Replace all HVAC units in the manufacturing facility', 150000.00, 75, 'proposal', '2024-03-15'),
((SELECT account_id FROM accounts WHERE company_name = 'Downtown Office Complex'), 'Annual Maintenance Contract', 'Comprehensive maintenance contract for all building systems', 75000.00, 90, 'negotiation', '2024-02-28'),
((SELECT account_id FROM accounts WHERE company_name = 'TechCorp Headquarters'), 'Emergency Generator Installation', 'Install backup power system for critical operations', 85000.00, 60, 'qualification', '2024-04-30');

-- Insert sample assets
INSERT INTO assets (account_id, asset_type, brand, model, serial_number, installation_date, warranty_expiry, location_description, status) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'HVAC System', 'Carrier', '50TCQ12A2A6A0A0', 'CAR123456789', '2020-05-15', '2025-05-15', 'Main Production Floor - Unit 1', 'active'),
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 'HVAC System', 'Carrier', '50TCQ12A2A6A0A0', 'CAR987654321', '2020-05-15', '2025-05-15', 'Main Production Floor - Unit 2', 'active'),
((SELECT account_id FROM accounts WHERE company_name = 'Smith Residence'), 'Water Heater', 'Bradford White', 'M-I-50S6BN', 'BW2021001234', '2021-03-10', '2027-03-10', 'Garage', 'active'),
((SELECT account_id FROM accounts WHERE company_name = 'Downtown Office Complex'), 'Electrical Panel', 'Square D', 'QO Load Center', 'SD2022005678', '2022-01-20', '2027-01-20', 'Basement - Main Panel', 'active'),
((SELECT account_id FROM accounts WHERE company_name = 'Johnson Family Home'), 'HVAC System', 'Trane', 'XR13', 'TR2023009876', '2023-07-12', '2033-07-12', 'Attic', 'active');

-- Insert sample work orders
INSERT INTO work_orders (account_id, assigned_agent_id, title, description, priority, status, service_type, scheduled_date, estimated_duration) VALUES
((SELECT account_id FROM accounts WHERE company_name = 'ABC Manufacturing Inc'), 
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP001'), 
 'Quarterly HVAC Maintenance', 
 'Routine quarterly maintenance on both HVAC units including filter replacement and system inspection', 
 'medium', 'scheduled', 'Maintenance', 
 '2024-01-15 09:00:00-06', 240),

((SELECT account_id FROM accounts WHERE company_name = 'Smith Residence'), 
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP002'), 
 'Water Heater Repair', 
 'Customer reports no hot water. Investigate and repair water heater.', 
 'high', 'assigned', 'Repair', 
 '2024-01-12 14:00:00-06', 120),

((SELECT account_id FROM accounts WHERE company_name = 'Downtown Office Complex'), 
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP004'), 
 'Electrical Panel Inspection', 
 'Annual safety inspection of main electrical panel', 
 'medium', 'new', 'Inspection', 
 '2024-01-20 10:00:00-06', 90),

((SELECT account_id FROM accounts WHERE company_name = 'Johnson Family Home'), 
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP003'), 
 'AC Unit Not Cooling', 
 'Emergency service call - AC unit running but not cooling effectively', 
 'emergency', 'in_progress', 'Repair', 
 '2024-01-10 16:00:00-06', 180);

-- Insert sample work order lines
INSERT INTO work_order_lines (work_order_id, line_number, service_type, description, estimated_hours, hourly_rate, labor_cost) VALUES
((SELECT work_order_id FROM work_orders WHERE title = 'Quarterly HVAC Maintenance'), 1, 'Maintenance', 'Replace air filters on Unit 1', 0.5, 65.00, 32.50),
((SELECT work_order_id FROM work_orders WHERE title = 'Quarterly HVAC Maintenance'), 2, 'Maintenance', 'Replace air filters on Unit 2', 0.5, 65.00, 32.50),
((SELECT work_order_id FROM work_orders WHERE title = 'Quarterly HVAC Maintenance'), 3, 'Inspection', 'System performance check both units', 2.0, 65.00, 130.00),

((SELECT work_order_id FROM work_orders WHERE title = 'Water Heater Repair'), 1, 'Diagnosis', 'Diagnose water heater issue', 1.0, 75.00, 75.00),
((SELECT work_order_id FROM work_orders WHERE title = 'Water Heater Repair'), 2, 'Repair', 'Replace heating element', 1.0, 75.00, 75.00),

((SELECT work_order_id FROM work_orders WHERE title = 'AC Unit Not Cooling'), 1, 'Diagnosis', 'Diagnose cooling issue', 1.5, 45.00, 67.50),
((SELECT work_order_id FROM work_orders WHERE title = 'AC Unit Not Cooling'), 2, 'Repair', 'Repair refrigerant leak', 1.5, 45.00, 67.50);

-- Insert sample parts
INSERT INTO parts (part_number, name, description, category, brand, unit_cost, unit_price, quantity_on_hand, reorder_level) VALUES
('FILTER-20X25X1', '20x25x1 Air Filter', 'Standard pleated air filter', 'HVAC', 'Generic', 8.50, 15.00, 50, 10),
('ELEMENT-4500W', '4500W Water Heater Element', 'Electric water heater heating element', 'Plumbing', 'Generic', 25.00, 45.00, 20, 5),
('REFRIGERANT-R410A', 'R410A Refrigerant', 'R410A refrigerant - 25lb tank', 'HVAC', 'Honeywell', 85.00, 150.00, 15, 3),
('THERMOSTAT-PROG', 'Programmable Thermostat', '7-day programmable thermostat', 'HVAC', 'Honeywell', 45.00, 95.00, 25, 5),
('BREAKER-20A', '20 Amp Circuit Breaker', 'Single pole 20 amp breaker', 'Electrical', 'Square D', 12.00, 25.00, 30, 8);

-- Insert sample work order parts
INSERT INTO work_order_parts (work_order_line_id, part_id, quantity_used, unit_cost) VALUES
((SELECT line_id FROM work_order_lines wol 
  JOIN work_orders wo ON wol.work_order_id = wo.work_order_id 
  WHERE wo.title = 'Quarterly HVAC Maintenance' AND wol.line_number = 1), 
 (SELECT part_id FROM parts WHERE part_number = 'FILTER-20X25X1'), 2, 8.50),

((SELECT line_id FROM work_order_lines wol 
  JOIN work_orders wo ON wol.work_order_id = wo.work_order_id 
  WHERE wo.title = 'Quarterly HVAC Maintenance' AND wol.line_number = 2), 
 (SELECT part_id FROM parts WHERE part_number = 'FILTER-20X25X1'), 2, 8.50),

((SELECT line_id FROM work_order_lines wol 
  JOIN work_orders wo ON wol.work_order_id = wo.work_order_id 
  WHERE wo.title = 'Water Heater Repair' AND wol.line_number = 2), 
 (SELECT part_id FROM parts WHERE part_number = 'ELEMENT-4500W'), 1, 25.00);

-- Insert sample time entries
INSERT INTO time_entries (work_order_id, agent_id, start_time, end_time, total_hours, hourly_rate, entry_type, description) VALUES
((SELECT work_order_id FROM work_orders WHERE title = 'AC Unit Not Cooling'),
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP003'),
 '2024-01-10 16:00:00-06', '2024-01-10 19:00:00-06', 3.0, 45.00, 'regular', 'Emergency AC repair - diagnosed and repaired refrigerant leak'),

((SELECT work_order_id FROM work_orders WHERE title = 'Water Heater Repair'),
 (SELECT agent_id FROM service_agents WHERE employee_id = 'EMP002'),
 '2024-01-12 14:00:00-06', '2024-01-12 16:00:00-06', 2.0, 75.00, 'regular', 'Water heater element replacement');