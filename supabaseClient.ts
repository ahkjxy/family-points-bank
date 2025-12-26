import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mfgfbwhznqpdjumtsrus.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2pDY4atjEw5MVSWeakl4HA_exf_osvS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
