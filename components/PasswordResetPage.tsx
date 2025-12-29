import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PasswordResetModal } from './PasswordResetModal';

export function PasswordResetPage() {
  const [ready, setReady] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (type === 'recovery' && access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token });
      setShowReset(true);
      const cleaned = window.location.origin + window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, cleaned);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowReset(true);
      }
    });
    setReady(true);
    return () => sub.subscription?.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#F9F4FF] via-white to-[#EAF6FF] px-6 py-12">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/80 p-8 space-y-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Family Points Bank</p>
        <h2 className="text-2xl font-black text-gray-900">重置密码</h2>
        <p className="text-sm text-gray-600">请通过邮箱收到的链接进入此页，完成密码设置。</p>
        {!ready && <div className="text-sm text-gray-400">正在初始化...</div>}
        <PasswordResetModal open={showReset} onClose={() => setShowReset(false)} />
        {!showReset && ready && (
          <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4">
            未检测到重置令牌，请从最新的重置邮件链接进入。
          </div>
        )}
      </div>
    </div>
  );
}
