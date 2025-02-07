import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'

// Mock environment variables
vi.mock('../env.d.ts', () => ({
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'test-key',
  VITE_LOAD_SERVICE_URL: 'http://localhost:3001',
  VITE_QUOTE_SERVICE_URL: 'http://localhost:3002',
  VITE_SHIPMENT_SERVICE_URL: 'http://localhost:3003',
  VITE_CARRIER_SERVICE_URL: 'http://localhost:3004',
  VITE_MESSAGE_SERVICE_URL: 'http://localhost:3005',
  VITE_ENABLE_VOICE: 'true',
  VITE_ENABLE_AI: 'true',
  VITE_GOOGLE_MAPS_API_KEY: 'test-key',
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
