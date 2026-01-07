import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (e) {
        console.warn('Auth init failed', e);
      } finally {
        setAuthReady(true);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOAuthCallback = async (url: string) => {
    if (url.includes('code=')) {
      try {
        await supabase.auth.exchangeCodeForSession(url);
        const cleaned = new URL(url);
        cleaned.searchParams.delete('code');
        cleaned.searchParams.delete('token');
        cleaned.searchParams.delete('type');
        if (cleaned.hash) cleaned.hash = '';
        window.history.replaceState({}, document.title, cleaned.toString());
      } catch (e) {
        console.warn('exchangeCodeForSession failed', e);
      }
    }
  };

  return { session, authReady, handleOAuthCallback };
}
