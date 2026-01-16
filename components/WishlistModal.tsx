import { useState } from "react";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

interface WishlistModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, points: number, type: "实物奖品" | "特权奖励", imageUrl?: string) => Promise<void>;
}

export function WishlistModal({ open, onClose, onSubmit }: WishlistModalProps) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState<number>(10);
  const [type, setType] = useState<"实物奖品" | "特权奖励">("实物奖品");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast({ type: "error", title: "请输入愿望名称" });
      return;
    }
    if (points <= 0) {
      showToast({ type: "error", title: "积分必须大于0" });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(title.trim(), points, type, imageUrl || undefined);
      showToast({ type: "success", title: "愿望已提交", description: "等待管理员审核" });
      setTitle("");
      setPoints(10);
      setType("实物奖品");
      setImageUrl("");
      onClose();
    } catch (error) {
      showToast({ type: "error", title: "提交失败", description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E293B] rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">许下愿望</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              告诉我们你想要什么奖励
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
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              愿望名称 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：乐高积木、游乐园门票"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              所需积分 *
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              奖励类型 *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("实物奖品")}
                className={`py-3 px-4 rounded-2xl text-sm font-bold transition-all ${
                  type === "实物奖品"
                    ? "bg-[#FF4D94] text-white shadow-lg"
                    : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                }`}
              >
                🎁 实物奖品
              </button>
              <button
                type="button"
                onClick={() => setType("特权奖励")}
                className={`py-3 px-4 rounded-2xl text-sm font-bold transition-all ${
                  type === "特权奖励"
                    ? "bg-[#FF4D94] text-white shadow-lg"
                    : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                }`}
              >
                ⭐ 特权奖励
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              图片（可选）
            </label>
            <div className="flex items-center gap-4">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="预览"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 dark:border-white/10"
                />
              )}
              <label className="flex-1 py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-all cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imageUrl ? "更换图片" : "上传图片"}
              </label>
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
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-2xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  提交中...
                </>
              ) : (
                "提交愿望"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
