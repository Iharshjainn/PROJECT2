import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lqsbauulglekdzgtfrva.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxc2JhdXVsZ2xla2R6Z3RmcnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzgzOTUsImV4cCI6MjEwNDcxNDM5NX0.tyoQRZKJy0K-8JDP9m46XQpfJmkZn5yRlxf-DRg55u0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your_supabase_anon_key')
);

// Initialize client if configured, otherwise create a mock-safe instance
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
