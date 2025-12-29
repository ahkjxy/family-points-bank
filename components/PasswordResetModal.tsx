import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface PasswordResetModalProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordResetModal({ open, onClose }: PasswordResetModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!password.trim() || !confirm.trim()) return setError('请输入新密码并确认');
    if (password !== confirm) return setError('两次输入不一致');
    if (password.length < 6) return setError('密码至少 6 位');
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setMessage('密码已更新，请重新登录');
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError((err as Error)?.message || '重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">Reset Password</p>
          <h3 className="text-xl font-bold text-gray-900">设置新密码</h3>
          <p className="text-sm text-gray-500">请输入新密码并确认，提交后会立即生效。</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
              placeholder="至少 6 位"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">确认新密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D94]/60"
              placeholder="再次输入"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-60"
          >
            {loading ? '提交中...' : '确认重置'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold hover:border-[#FF4D94] hover:text-[#FF4D94]"
          >
            取消
          </button>
        </form>
        {message && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl">{message}</div>}
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">{error}</div>}
      </div>
    </div>
  );
}
