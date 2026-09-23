import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://mggkhnzdlpdbwlppbnud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ2tobnpkbHBkYndscHBibnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzYxMDYsImV4cCI6MjEwNTc1MjEwNn0._ibawQj520kfPfnZrgLAZLZkDelAq_0Jw97XXszL2bs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-public-key')
  );
};

// Cliente Supabase conectado diretamente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
