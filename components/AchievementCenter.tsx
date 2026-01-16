import { useState } from "react";
import { Profile } from "../types";
import { BadgeSection } from "./BadgeSection";
import { PointsPrediction } from "./PointsPrediction";
import { Icon } from "./Icon";

interface AchievementCenterProps {
  currentProfile: Profile;
  familyId: string;
}

export function AchievementCenter({ currentProfile, familyId }: AchievementCenterProps) {
  const [activeTab, setActiveTab] = useState<"badges" | "prediction">("badges");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#1A1A1A] to-[#333] dark:from-[#0F172A] dark:to-[#1E293B] p-8 lg:p-10 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/5">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-gradient-to-br from-[#7C4DFF]/30 to-[#FF4D94]/30 blur-[100px] rounded-full"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FF4D94] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D94] animate-pulse"></div>
            成就中心
          </div>
          <h3 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight mb-2">
            我的成就与预测
          </h3>
          <p className="text-white/50 font-medium max-w-lg tracking-wide">
            查看你的徽章成就，预测未来积分趋势
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white dark:bg-[#1E293B] rounded-[28px] border border-gray-100 dark:border-white/5 shadow-sm">
        <button
          onClick={() => setActiveTab("badges")}
          className={`flex-1 px-6 py-3.5 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === "badges"
              ? "bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-xl"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
          }`}
        >
          <Icon name="reward" size={14} />
          成就徽章
        </button>
        <button
          onClick={() => setActiveTab("prediction")}
          className={`flex-1 px-6 py-3.5 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === "prediction"
              ? "bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white shadow-xl"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
          }`}
        >
          <Icon name="history" size={14} />
          趋势预测
        </button>
      </div>

      {/* Content */}
      {activeTab === "badges" ? (
        <BadgeSection profile={currentProfile} familyId={familyId} />
      ) : (
        <PointsPrediction profileId={currentProfile.id} currentBalance={currentProfile.balance} />
      )}
    </div>
  );
}
