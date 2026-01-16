import { Badge } from "../types";
import { Icon } from "./Icon";

interface BadgeDisplayProps {
  badges: Badge[];
  compact?: boolean;
}

const BADGE_COLORS = {
  streak: "from-amber-400 to-orange-500",
  milestone: "from-blue-400 to-indigo-500",
  achievement: "from-emerald-400 to-green-500",
  special: "from-purple-400 to-pink-500",
};

export function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  if (!badges.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <Icon name="reward" size={32} className="mx-auto mb-2 opacity-30" />
        <p>暂无徽章，完成任务获得成就！</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex -space-x-2">
        {badges.slice(0, 3).map((badge) => (
          <div
            key={badge.id}
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${BADGE_COLORS[badge.type]} border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-xs font-black shadow-lg`}
            title={badge.title}
          >
            {badge.icon}
          </div>
        ))}
        {badges.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] font-black">
            +{badges.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="group bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:shadow-xl transition-all"
        >
          <div
            className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${BADGE_COLORS[badge.type]} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform mb-3`}
          >
            {badge.icon}
          </div>
          <h4 className="text-sm font-black text-gray-900 dark:text-white text-center mb-1">
            {badge.title}
          </h4>
          <p className="text-[10px] text-gray-400 text-center mb-2">{badge.description}</p>
          <p className="text-[9px] text-gray-400 text-center">
            {new Date(badge.earnedAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
      ))}
    </div>
  );
}
