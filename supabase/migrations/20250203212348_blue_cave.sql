/*
  # Test Data for LaneRunner

  1. Test Users
    - Creates test users for each role (shippers, carriers, brokers)
    - Sets up carrier profiles with different capabilities
  
  2. Test Loads
    - Creates various loads with different statuses
    - Assigns loads to different shippers
  
  3. Test Data
    - Adds quotes, shipments, and messages
    - Creates realistic scenarios for testing workflows
*/

-- Test Users
INSERT INTO auth.users (id, email) VALUES
  ('d7bed82f-5222-4920-b301-9b0c6a429b1d', 'acme_shipping@example.com'),
  ('e9d2e7c0-a140-4e89-b33c-49c253b7e4cc', 'fastfreight@example.com'),
  ('f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b', 'mega_carriers@example.com'),
  ('b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f', 'swift_transport@example.com'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d', 'broker1@example.com');

-- Company Profiles
INSERT INTO users (id, role, company_name, contact_name, phone) VALUES
  ('d7bed82f-5222-4920-b301-9b0c6a429b1d', 'shipper', 'ACME Shipping', 'John Doe', '555-0101'),
  ('e9d2e7c0-a140-4e89-b33c-49c253b7e4cc', 'shipper', 'FastFreight Inc', 'Jane Smith', '555-0102'),
  ('f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b', 'carrier', 'Mega Carriers LLC', 'Bob Wilson', '555-0103'),
  ('b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f', 'carrier', 'Swift Transport Co', 'Alice Brown', '555-0104'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d', 'broker', 'Prime Logistics', 'Charlie Davis', '555-0105');

-- Carrier Profiles
INSERT INTO carrier_profiles (user_id, mc_number, dot_number, insurance_expiry, equipment_types, service_areas, rating) VALUES
  ('f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b', 'MC123456', 'DOT123456', NOW() + INTERVAL '1 year', 
   ARRAY['dry_van', 'reefer'], 
   ARRAY['California', 'Nevada', 'Arizona'], 
   4.8),
  ('b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f', 'MC789012', 'DOT789012', NOW() + INTERVAL '6 months', 
   ARRAY['flatbed', 'step_deck'], 
   ARRAY['Texas', 'Oklahoma', 'Louisiana'], 
   4.5);

-- Test Loads
INSERT INTO loads (id, shipper_id, carrier_id, origin, destination, pickup_date, delivery_date, 
                  equipment_type, weight, status, rate, created_at) VALUES
  -- Active loads for ACME Shipping
  ('1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p', 
   'd7bed82f-5222-4920-b301-9b0c6a429b1d', NULL,
   'Los Angeles, CA', 'Phoenix, AZ', 
   NOW() + INTERVAL '2 days', NOW() + INTERVAL '3 days',
   'dry_van', 25000, 'posted', 2500,
   NOW() - INTERVAL '1 day'),
   
  ('2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
   'd7bed82f-5222-4920-b301-9b0c6a429b1d',
   'f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   'San Francisco, CA', 'Las Vegas, NV',
   NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days',
   'reefer', 30000, 'assigned', 3000,
   NOW() - INTERVAL '2 days'),

  -- Active loads for FastFreight
  ('3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
   'e9d2e7c0-a140-4e89-b33c-49c253b7e4cc', NULL,
   'Dallas, TX', 'Houston, TX',
   NOW() + INTERVAL '3 days', NOW() + INTERVAL '4 days',
   'flatbed', 35000, 'posted', 1800,
   NOW() - INTERVAL '12 hours'),

  ('4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
   'e9d2e7c0-a140-4e89-b33c-49c253b7e4cc',
   'b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f',
   'Austin, TX', 'New Orleans, LA',
   NOW() + INTERVAL '4 days', NOW() + INTERVAL '5 days',
   'step_deck', 28000, 'in_transit', 2200,
   NOW() - INTERVAL '3 days');

-- Test Quotes
INSERT INTO quotes (load_id, carrier_id, price, delivery_date, status, created_at) VALUES
  ('1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p', 
   'f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   2400, NOW() + INTERVAL '3 days', 'pending',
   NOW() - INTERVAL '12 hours'),
   
  ('3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
   'b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f',
   1750, NOW() + INTERVAL '4 days', 'pending',
   NOW() - INTERVAL '6 hours');

-- Test Shipments
INSERT INTO shipments (load_id, carrier_id, driver_id, current_location, eta, status, created_at) VALUES
  ('2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
   'f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   'f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   '(37.7749,-122.4194)',
   NOW() + INTERVAL '2 days',
   'in_transit',
   NOW() - INTERVAL '1 day'),
   
  ('4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
   'b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f',
   'b2c9e1d8-a765-4f32-b543-9d8c7a6b5e4f',
   '(30.2672,-97.7431)',
   NOW() + INTERVAL '5 days',
   'in_transit',
   NOW() - INTERVAL '2 days');

-- Test Messages
INSERT INTO messages (sender_id, recipient_id, load_id, message_text, created_at, read) VALUES
  ('f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   'd7bed82f-5222-4920-b301-9b0c6a429b1d',
   '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
   'Hi, I''m interested in your load from San Francisco to Las Vegas. Is it still available?',
   NOW() - INTERVAL '2 days',
   true),
   
  ('d7bed82f-5222-4920-b301-9b0c6a429b1d',
   'f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
   'Yes, it''s available. Would you like to submit a quote?',
   NOW() - INTERVAL '2 days',
   false);

-- Test Notifications
INSERT INTO notifications (user_id, message, read_status, created_at) VALUES
  ('f4b8c2a1-d876-4d34-9c2e-7c3b2f8e1a5b',
   'New load matching your equipment type has been posted',
   false,
   NOW() - INTERVAL '1 hour'),
   
  ('d7bed82f-5222-4920-b301-9b0c6a429b1d',
   'You have received a new quote for your load',
   false,
   NOW() - INTERVAL '30 minutes');