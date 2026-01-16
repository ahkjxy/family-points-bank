import { useState } from "react";
import { Profile } from "../types";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  currentProfile: Profile;
  profiles: Profile[];
  onTransfer: (toProfileId: string, points: number, message: string) => Promise<void>;
}

export function TransferModal({
  open,
  onClose,
  currentProfile,
  profiles,
  onTransfer,
}: TransferModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [points, setPoints] = useState<number>(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const availableProfiles = profiles.filter((p) => p.id !== currentProfile.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfileId) {
      showToast({ type: "error", title: "请选择接收成员" });
      return;
    }

    if (points <= 0) {
      showToast({ type: "error", title: "转赠积分必须大于0" });
      return;
    }

    if (points > currentProfile.balance) {
      showToast({ type: "error", title: "积分不足", description: `当前余额：${currentProfile.balance}` });
      return;
    }

    setLoading(true);
    try {
      await onTransfer(selectedProfileId, points, message.trim());
      const toProfile = profiles.find((p) => p.id === selectedProfileId);
      showToast({
        type: "success",
        title: "转赠成功",
        description: `已向 ${toProfile?.name} 转赠 ${points} 元气值`,
      });
      setSelectedProfileId("");
      setPoints(1);
      setMessage("");
      onClose();
    } catch (error) {
      showToast({ type: "error", title: "转赠失败", description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E293B] rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">转赠元气值</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              当前余额：{currentProfile.balance} 元气值
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
          >
            <Icon name="plus" size={20} className="rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              选择接收成员 *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {availableProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    selectedProfileId === profile.id
                      ? "border-[#FF4D94] bg-[#FF4D94]/5"
                      : "border-gray-200 dark:border-white/10 hover:border-[#FF4D94]/50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${profile.avatarColor} flex items-center justify-center text-white text-lg font-black`}
                  >
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      profile.name[0]
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-black text-gray-900 dark:text-white">
                      {profile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      余额：{profile.balance} 元气值
                    </p>
                  </div>
                  {selectedProfileId === profile.id && (
                    <div className="w-6 h-6 rounded-full bg-[#FF4D94] flex items-center justify-center">
                      <Icon name="plus" size={12} className="text-white rotate-45" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              转赠数量 *
            </label>
            <div className="relative">
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min={1}
                max={currentProfile.balance}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPoints(Math.min(10, currentProfile.balance))}
                  className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-300 transition-colors"
                >
                  10
                </button>
                <button
                  type="button"
                  onClick={() => setPoints(Math.min(50, currentProfile.balance))}
                  className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-300 transition-colors"
                >
                  50
                </button>
                <button
                  type="button"
                  onClick={() => setPoints(currentProfile.balance)}
                  className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-300 transition-colors"
                >
                  全部
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              留言（可选）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="写点什么鼓励的话吧..."
              rows={3}
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/100</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💝</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                  温馨提示
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  转赠后无法撤回，请确认接收成员和数量无误
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProfileId || points <= 0}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-2xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  转赠中...
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} className="rotate-45" />
                  确认转赠
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
