import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '@/config/env';
import type { Database } from './types';

export const supabase = createClient<Database>(
  clientEnv.supabaseUrl,
  clientEnv.supabasePublishableKey,
  {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
