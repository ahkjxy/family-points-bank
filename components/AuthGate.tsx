import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#F9F4FF] via-white to-[#EAF6FF] px-6 py-12">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/80 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Family Points Bank</p>
          <h2 className="text-2xl font-black text-gray-900">登录后使用家庭积分</h2>
          <p className="text-sm text-gray-600">已有账号可直接密码登录；新用户可注册或使用魔法链接。</p>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl text-sm font-semibold">
          <button
            className={`flex-1 py-2 rounded-xl ${mode === 'password' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => { setMode('password'); clearNotice(); }}
          >密码登录 / 注册</button>
          <button
            className={`flex-1 py-2 rounded-xl ${mode === 'magic' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            onClick={() => { setMode('magic'); clearNotice(); }}
          >魔法链接</button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">邮箱</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">密码</label>
              <input
                type="password"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition"
              >
                {loading ? '处理中...' : '登录'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSignup}
                className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 font-bold hover:border-[#FF4D94] hover:text-[#FF4D94]"
              >注册</button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetPassword}
                className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold hover:border-[#7C4DFF] hover:text-[#7C4DFF]"
              >忘记密码</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagic} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">邮箱</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              {loading ? '发送中...' : '发送登录链接'}
            </button>
          </form>
        )}

        {message && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl">{message}</div>}
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{error}</div>}
        <p className="text-xs text-gray-500 text-center">登录后我们会为你创建或关联一个家庭空间。</p>
      </div>

      <PasswordResetModal open={showReset} onClose={() => setShowReset(false)} />

      {showResetRequest && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">Reset Link</p>
                <h3 className="text-xl font-bold text-gray-900">发送重置密码邮件</h3>
                <p className="text-sm text-gray-500">请输入需要重置的邮箱，我们会发送重置链接。</p>
              </div>
              <button
                onClick={() => setShowResetRequest(false)}
                className="text-gray-400 hover:text-gray-600"
              >×</button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">邮箱</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
                placeholder="you@example.com"
                disabled={resetLoading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendReset}
                disabled={resetLoading}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-60"
              >
                {resetLoading ? '发送中...' : '发送重置邮件'}
              </button>
              <button
                onClick={() => setShowResetRequest(false)}
                disabled={resetLoading}
                className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold hover:border-[#FF4D94] hover:text-[#FF4D94]"
              >取消</button>
            </div>
            {resetMsg && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl">{resetMsg}</div>}
            {resetErr && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{resetErr}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
