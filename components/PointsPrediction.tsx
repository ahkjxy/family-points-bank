import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { supabase } from "../supabaseClient";

interface PredictionData {
  date: string;
  predicted_points: number;
  confidence: string;
}

interface PointsPredictionProps {
  profileId: string;
  currentBalance: number;
}

export function PointsPrediction({ profileId, currentBalance }: PointsPredictionProps) {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  // 验证是否为有效的 UUID
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  useEffect(() => {
    if (isValidUUID(profileId)) {
      loadPredictions();
    } else {
      setLoading(false);
      setPredictions([]);
    }
  }, [profileId, days]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("predict_points_trend", {
        p_profile_id: profileId,
        p_days_ahead: days,
      });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error("Failed to load predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "高":
        return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
      case "中":
        return "text-amber-500 bg-amber-50 dark:bg-amber-500/10";
      case "低":
        return "text-rose-500 bg-rose-50 dark:bg-rose-500/10";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-500/10";
    }
  };

  const maxPoints = Math.max(...predictions.map((p) => p.predicted_points), currentBalance);
  const minPoints = Math.min(...predictions.map((p) => p.predicted_points), currentBalance);

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">积分趋势预测</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            基于历史数据的智能预测
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                days === d
                  ? "bg-[#FF4D94] text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      {!isValidUUID(profileId) ? (
        <div className="text-center py-12 text-gray-400">
          <Icon name="settings" size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold mb-2">数据未同步</p>
          <p className="text-sm">积分预测功能需要将数据同步到云端</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-[#FF4D94] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Icon name="history" size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold mb-2">数据不足</p>
          <p className="text-sm">需要更多历史数据才能进行预测</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart */}
          <div className="relative h-48 bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4D94" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF4D94" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-gray-200 dark:text-white/10"
                  strokeDasharray="2,2"
                />
              ))}

              {/* Current balance line */}
              <line
                x1="0"
                y1={100 - ((currentBalance - minPoints) / (maxPoints - minPoints)) * 100}
                x2="100"
                y2={100 - ((currentBalance - minPoints) / (maxPoints - minPoints)) * 100}
                stroke="#7C4DFF"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />

              {/* Prediction line */}
              <polyline
                points={predictions
                  .map((p, i) => {
                    const x = (i / (predictions.length - 1)) * 100;
                    const y = 100 - ((p.predicted_points - minPoints) / (maxPoints - minPoints)) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#FF4D94"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Area fill */}
              <polygon
                points={`0,100 ${predictions
                  .map((p, i) => {
                    const x = (i / (predictions.length - 1)) * 100;
                    const y = 100 - ((p.predicted_points - minPoints) / (maxPoints - minPoints)) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")} 100,100`}
                fill="url(#predictionGradient)"
              />

              {/* Data points */}
              {predictions.map((p, i) => {
                const x = (i / (predictions.length - 1)) * 100;
                const y = 100 - ((p.predicted_points - minPoints) / (maxPoints - minPoints)) * 100;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill="#FF4D94"
                    className="hover:r-2 transition-all"
                  />
                );
              })}
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
              <span>{Math.round(maxPoints)}</span>
              <span>{Math.round((maxPoints + minPoints) / 2)}</span>
              <span>{Math.round(minPoints)}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#7C4DFF]" />
              <span className="text-gray-600 dark:text-gray-400">当前余额</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF4D94]" />
              <span className="text-gray-600 dark:text-gray-400">预测趋势</span>
            </div>
          </div>

          {/* Predictions List */}
          <div className="space-y-2">
            {predictions.slice(0, 5).map((pred, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] flex items-center justify-center text-white text-xs font-black">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(pred.date).toLocaleDateString("zh-CN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(pred.date).toLocaleDateString("zh-CN", { weekday: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceColor(pred.confidence)}`}
                  >
                    {pred.confidence}置信度
                  </span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {Math.round(pred.predicted_points)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-white/10">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">预测最高</p>
              <p className="text-xl font-black text-emerald-500">{Math.round(maxPoints)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">预测最低</p>
              <p className="text-xl font-black text-rose-500">{Math.round(minPoints)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">平均预测</p>
              <p className="text-xl font-black text-[#FF4D94]">
                {Math.round(
                  predictions.reduce((sum, p) => sum + p.predicted_points, 0) / predictions.length
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
