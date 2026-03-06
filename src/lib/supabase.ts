import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://lfepxevjxaijwpddvosg.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZXB4ZXZqeGFpandwZGR2b3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODI3NDMsImV4cCI6MjA4ODE1ODc0M30.xDvmtcI4i-i9rwBI1Gpy8rI6eDOr3AEs8AVSs9B5j3E'
);
