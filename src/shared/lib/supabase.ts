// PionG Hub: Supabase Client Configuration - Conexão Real com PostgreSQL
// Referencia: docs/piong-blueprint/05-arquitetura-inferida.md

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getDatabase } from '../database';

// Import environment variables (process.env para backend Node.js)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Create Supabase client for real-time and auth features
export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({} as SupabaseClient);

// Re-export the PostgreSQL database instance for direct queries
export const db = getDatabase();

// Mantém a interface para compatibilidade
export default supabase;