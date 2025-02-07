import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const createSupabaseClient = (
  supabaseUrl: string,
  supabaseKey: string,
  options: {
    realtime?: boolean;
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
    };
  } = {}
) => {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: options.auth?.persistSession ?? true,
      autoRefreshToken: options.auth?.autoRefreshToken ?? true,
    },
    realtime: options.realtime
      ? {
          params: {
            eventsPerSecond: 10,
          },
        }
      : undefined,
  });
};

export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    },
  });
};
