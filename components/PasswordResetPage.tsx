import { useEffect, useState } from 'react';
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFD] dark:bg-[#0F172A] px-6 py-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#7C4DFF]/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[#FF4D94]/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-[480px] bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] border border-white/80 dark:border-white/5 p-12 lg:p-16 text-center space-y-8 animate-in zoom-in-95 duration-700 relative z-10">
        <div className="w-24 h-24 bg-gradient-to-br from-[#7C4DFF] to-[#9E7AFF] rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#7C4DFF]/30 rotate-3 transition-transform hover:rotate-0 duration-500">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#7C4DFF] mb-2">Security Portal</p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">重置通行密码</h2>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed px-4">请确保您是通过最新的重置邮件链接进入此页，以完成新密码的设置。</p>
        </div>

        {!ready && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-10 h-10 border-4 border-[#7C4DFF] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">正在安全连接...</p>
          </div>
        )}

        <PasswordResetModal open={showReset} onClose={() => setShowReset(false)} />

        {!showReset && ready && (
          <div className="mt-8 p-8 rounded-[40px] bg-rose-50/50 dark:bg-rose-500/5 border border-dashed border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-4">
            <div className="flex flex-col items-center gap-4">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm font-black leading-tight">未检测到有效的重置令牌</p>
              <p className="text-[11px] font-bold opacity-80 leading-relaxed">
                重置令牌已失效或链接不完整。<br/>
                请返回登录页重新申请重置邮件。
              </p>
              <a href="/" className="mt-4 px-8 py-3 bg-white dark:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-md transition-all">返回登录页</a>
            </div>
          </div>
        )}

        <div className="pt-8 text-center border-t border-gray-100 dark:border-white/5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Family Points Bank · Security</p>
        </div>
      </div>
    </div>
  );
}
