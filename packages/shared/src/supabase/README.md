# LaneRunner Supabase Setup

## Overview
This directory contains the database schema, migrations, and configuration for the LaneRunner platform using Supabase.

## Structure
```
supabase/
├── migrations/           # Database migrations
│   ├── 20250203000000_initial_schema.sql    # Base schema
│   ├── 20250203000001_rls_policies.sql      # Row Level Security
│   ├── 20250203000002_functions.sql         # Database functions
│   └── 20250203000003_search_indexes.sql    # Search and performance
└── README.md            # This file
```

## Database Schema
The database is structured around the following core tables:
- `users`: User profiles and authentication
- `carrier_profiles`: Carrier company information
- `carrier_vehicles`: Vehicle management
- `loads`: Freight load listings
- `quotes`: Load quotes from carriers
- `shipments`: Active shipment tracking
- `documents`: Shipment documentation
- `messages`: Communication system
- `notifications`: User notifications

## Security
- Row Level Security (RLS) is enabled on all tables
- Custom policies control access based on user roles
- Secure functions use `security definer` when needed
- All sensitive operations are audited

## Performance
- Optimized indexes for common queries
- Full-text search capabilities
- Location-based queries using PostGIS
- Efficient timestamp range queries

## Functions
- `get_nearby_carriers`: Find carriers in a service area
- `calculate_shipment_price`: Calculate shipping rates
- `update_carrier_rating`: Update carrier ratings
- `get_unread_message_count`: Get user's unread messages
- `get_active_shipments`: Get user's active shipments

## Development

### Prerequisites
1. Supabase CLI installed
2. Access to Supabase project

### Local Development
1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Apply migrations:
   ```bash
   supabase db reset
   ```

3. Generate types:
   ```bash
   supabase gen types typescript --local > ../src/types/database.ts
   ```

### Production Deployment
1. Link to your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Push migrations:
   ```bash
   supabase db push
   ```

## Environment Variables
Required variables in your `.env` file:
```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```
