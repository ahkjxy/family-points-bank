import { useEffect, useState } from 'react';
import { AUTH_REDIRECT } from '../constants';
import { supabase } from '../supabaseClient';
import { PasswordResetModal } from './PasswordResetModal';

type Mode = 'password' | 'magic';

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');

  const clearNotice = () => {
    setMessage('');
    setError('');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    const em = email.trim();
    const pw = password.trim();
    if (!em || !pw) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: em, password: pw });
      if (signErr) {
        if (signErr.message?.includes('Invalid login credentials')) {
          setError('邮箱或密码不正确');
        } else {
          setError(signErr.message);
        }
        return;
      }
      if (data?.session) {
        setMessage('登录成功，正在进入...');
      }
    } catch (err) {
      setError((err as Error)?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    clearNotice();
    const em = email.trim();
    const pw = password.trim();
    if (!em || !pw) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: AUTH_REDIRECT } });
      if (signErr) throw signErr;
      setMessage('已发送确认邮件，请到邮箱完成验证后再登录');
    } catch (err) {
      setError((err as Error)?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    const em = email.trim();
    if (!em) {
      setError('请输入邮箱');
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: AUTH_REDIRECT } });
      if (otpError) throw otpError;
      setMessage('已发送登录链接，请前往邮箱点击确认。');
    } catch (err) {
      setError((err as Error)?.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    setResetEmail(email.trim());
    setResetMsg('');
    setResetErr('');
    setShowResetRequest(true);
  };

  const handleSendReset = async () => {
    setResetMsg('');
    setResetErr('');
    const em = resetEmail.trim();
    if (!em) {
      setResetErr('请输入邮箱');
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: AUTH_REDIRECT });
      if (resetErr) throw resetErr;
      setResetMsg('重置邮件已发送，请查收邮箱并按链接设置新密码。');
    } catch (err) {
      setResetErr((err as Error)?.message || '发送失败，请稍后重试');
    } finally {
      setResetLoading(false);
    }
  };

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
    return () => sub.subscription?.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFD] dark:bg-[#0F172A] px-6 py-12 relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF4D94]/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7C4DFF]/10 blur-[100px] rounded-full animate-pulse duration-[4000ms]"></div>
      
      <div className="w-full max-w-[480px] bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-2xl rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] border border-white/80 dark:border-white/5 p-10 lg:p-14 space-y-8 animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="space-y-3 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#FF4D94]/30 rotate-3 hover:rotate-0 transition-transform duration-500 group">
            <svg className="w-10 h-10 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z" />
            </svg>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF4D94] mb-2">系统登录</p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">欢迎进入元气银行</h2>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">已有账号可直接密码登录；新用户注册即刻开启家庭积分系统。</p>
        </div>

        <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-white/5 rounded-[24px] text-[11px] font-black uppercase tracking-widest">
          <button
            className={`flex-1 py-3.5 rounded-[18px] transition-all duration-300 ${mode === 'password' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
            onClick={() => { setMode('password'); clearNotice(); }}
          >密码登录 / 注册</button>
          <button
            className={`flex-1 py-3.5 rounded-[18px] transition-all duration-300 ${mode === 'magic' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
            onClick={() => { setMode('magic'); clearNotice(); }}
          >魔法链接</button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">电子邮箱</label>
              <input
                type="email"
                className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">通行密码</label>
              <input
                type="password"
                className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                placeholder="请输入您的密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <div className="pt-2 space-y-4">
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-5 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(255,77,148,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-80"
                >
                  {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : '确认登录'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSignup}
                  className="flex-1 py-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                >注册</button>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetPassword}
                className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:text-[#7C4DFF] transition-colors"
              >忘记密码？点击找回</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagic} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">验证邮箱</label>
              <input
                type="email"
                className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-[#7C4DFF] to-[#9E7AFF] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(124,77,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-80"
            >
              {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : '发送魔法链接'}
            </button>
          </form>
        )}

        {(message || error) && (
          <div className={`p-5 rounded-[28px] border animate-in slide-in-from-top-2 duration-500 ${
            message ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            <p className="text-xs font-black leading-relaxed flex gap-3">
              <span className="shrink-0">{message ? '✨' : '⚠️'}</span>
              {message || error}
            </p>
          </div>
        )}

        <div className="pt-4 text-center">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-gray-100 dark:bg-white/5"></span>
            由 Supabase Auth 提供安全保护
            <span className="w-8 h-px bg-gray-100 dark:bg-white/5"></span>
          </p>
        </div>
      </div>

      <PasswordResetModal open={showReset} onClose={() => setShowReset(false)} />

      {showResetRequest && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xl" onClick={() => setShowResetRequest(false)}></div>
          <div className="w-full max-w-[420px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl rounded-[48px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] relative z-10 p-12 space-y-8 border border-white/20 dark:border-white/5 animate-in zoom-in-95 duration-300">
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">密码找回</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">找回通行密码</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">请输入注册邮箱，我们将发送重置链接。</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">验证邮箱</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                  placeholder="you@example.com"
                  disabled={resetLoading}
                />
              </div>

              {(resetMsg || resetErr) && (
                <div className={`p-4 rounded-2xl border ${
                  resetMsg ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}>
                  <p className="text-xs font-black leading-relaxed">{resetMsg || resetErr}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetRequest(false)}
                  disabled={resetLoading}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[20px] transition-all"
                >返回</button>
                <button
                  onClick={handleSendReset}
                  disabled={resetLoading}
                  className="flex-[2] py-4 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_12px_24px_-8px_rgba(255,77,148,0.5)] flex items-center justify-center gap-2"
                >
                  {resetLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '发送重置邮件'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
