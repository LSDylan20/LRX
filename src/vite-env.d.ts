/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_LOAD_SERVICE_URL: string
    readonly VITE_QUOTE_SERVICE_URL: string
    readonly VITE_SHIPMENT_SERVICE_URL: string
    readonly VITE_CARRIER_SERVICE_URL: string
    readonly VITE_MESSAGE_SERVICE_URL: string
    readonly VITE_ENABLE_VOICE: string
    readonly VITE_ENABLE_AI: string
    readonly VITE_GOOGLE_MAPS_API_KEY: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  