import { useEffect, useState } from "react";
import { Badge, Profile } from "../types";
import { BadgeDisplay } from "./BadgeDisplay";
import { Icon } from "./Icon";
import { supabase } from "../supabaseClient";
import { useToast } from "./Toast";

interface BadgeSectionProps {
  profile: Profile;
  familyId: string;
}

interface AvailableBadge {
  condition: string;
  badge_type: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  requirement: number;
}

export function BadgeSection({ profile, familyId }: BadgeSectionProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<AvailableBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"earned" | "available">("earned");
  const { showToast } = useToast();

  useEffect(() => {
    loadBadges();
  }, [profile.id]);

  // 验证是否为有效的 UUID
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const loadBadges = async () => {
    setLoading(true);
    try {
      // 检查 profile.id 是否为有效的 UUID
      if (!isValidUUID(profile.id)) {
        console.warn("Profile ID is not a valid UUID:", profile.id);
        setBadges([]);
        setAvailableBadges([]);
        setLoading(false);
        return;
      }

      // 加载已获得的徽章
      const { data: earnedBadges, error: earnedError } = await supabase
        .from("badges")
        .select("*")
        .eq("profile_id", profile.id)
        .order("earned_at", { ascending: false });

      if (earnedError) throw earnedError;

      setBadges(
        (earnedBadges || []).map((b) => ({
          id: b.id,
          type: b.type,
          title: b.title,
          description: b.description,
          icon: b.icon,
          earnedAt: new Date(b.earned_at).getTime(),
          condition: b.condition,
        }))
      );

      // 加载可获得的徽章
      const { data: available, error: availableError } = await supabase.rpc(
        "get_available_badges",
        {
          p_profile_id: profile.id,
        }
      );

      if (availableError) {
        console.warn("Failed to load available badges:", availableError);
      } else {
        setAvailableBadges(available || []);
      }
    } catch (error) {
      console.error("Failed to load badges:", error);
      showToast({ type: "error", title: "加载徽章失败" });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBadges = async () => {
    // 检查 profile.id 是否为有效的 UUID
    if (!isValidUUID(profile.id)) {
      showToast({ 
        type: "error", 
        title: "无法领取徽章", 
        description: "请先同步数据到云端" 
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("grant_eligible_badges", {
        p_profile_id: profile.id,
      });

      if (error) throw error;

      const count = data || 0;
      if (count > 0) {
        showToast({
          type: "success",
          title: "恭喜获得新徽章！",
          description: `成功获得 ${count} 个新徽章`,
        });
        await loadBadges();
      } else {
        showToast({ type: "info", title: "暂无可领取的徽章" });
      }
    } catch (error) {
      showToast({ type: "error", title: "领取失败", description: (error as Error).message });
    }
  };

  const getProgressPercentage = (progress: number, requirement: number) => {
    return Math.min((progress / requirement) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">成就徽章</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            已获得 {badges.length} 个徽章
          </p>
        </div>
        <button
          onClick={handleClaimBadges}
          className="px-6 py-3 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-2xl text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
        >
          <Icon name="reward" size={16} />
          领取徽章
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "已获得",
            value: badges.length,
            icon: "reward",
            color: "text-[#FF4D94]",
          },
          {
            label: "可获得",
            value: availableBadges.length,
            icon: "plus",
            color: "text-emerald-500",
          },
          {
            label: "连续天数",
            value: profile.history.filter((h) => h.type === "earn").length > 0 ? "7" : "0",
            icon: "history",
            color: "text-amber-500",
          },
          {
            label: "完成任务",
            value: profile.history.filter((h) => h.type === "earn").length,
            icon: "home",
            color: "text-indigo-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`${stat.color}`}>
                <Icon name={stat.icon as any} size={20} />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
        <button
          onClick={() => setActiveTab("earned")}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "earned"
              ? "bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
          }`}
        >
          已获得 ({badges.length})
        </button>
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "available"
              ? "bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
          }`}
        >
          可获得 ({availableBadges.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-100 dark:border-white/5 min-h-[400px]">
        {!isValidUUID(profile.id) ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Icon name="settings" size={64} className="mx-auto mb-4 opacity-20 text-gray-400" />
            <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              数据未同步
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              成就徽章功能需要将数据同步到云端。请前往设置页面完成数据同步。
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "earned" ? (
          <BadgeDisplay badges={badges} />
        ) : (
          <div className="space-y-4">
            {availableBadges.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Icon name="reward" size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold mb-2">暂无可获得的徽章</p>
                <p className="text-sm">继续完成任务，解锁更多成就！</p>
              </div>
            ) : (
              availableBadges.map((badge, index) => (
                <div
                  key={index}
                  className="group bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-[#FF4D94]/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-black text-gray-900 dark:text-white">
                            {badge.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {badge.description}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
                          {badge.badge_type === "streak"
                            ? "连续"
                            : badge.badge_type === "milestone"
                              ? "里程碑"
                              : badge.badge_type === "achievement"
                                ? "成就"
                                : "特殊"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            进度：{badge.progress} / {badge.requirement}
                          </span>
                          <span className="text-[#FF4D94] font-bold">
                            {getProgressPercentage(badge.progress, badge.requirement).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] transition-all duration-500"
                            style={{
                              width: `${getProgressPercentage(badge.progress, badge.requirement)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
