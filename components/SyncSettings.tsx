import { Icon } from './Icon';

interface SyncSettingsProps {
  onSync: () => void;
  onPrint: () => void;
  isSyncing: boolean;
}

export function SyncSettings({ onSync, onPrint, isSyncing }: SyncSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4">数据同步</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Icon name="sync" size={20} className="text-blue-500 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">同步云端数据</p>
              <p className="text-xs text-gray-500 mt-1">将本地数据同步到云端，或从云端拉取最新数据</p>
            </div>
          </div>
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-full px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <Icon name="refresh" size={16} />
                立即同步
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-6 border border-pink-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4">打印设置</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Icon name="print" size={20} className="text-pink-500 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">打印家庭制度手册</p>
              <p className="text-xs text-gray-500 mt-1">生成包含所有任务和奖励规则的 PDF 文档</p>
            </div>
          </div>
          <button
            onClick={onPrint}
            disabled={isSyncing}
            className="w-full px-4 py-2 bg-white text-pink-600 font-semibold rounded-lg border border-pink-200 hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="print" size={16} />
            打印手册
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-4">使用说明</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <p>• 同步功能会自动保存所有配置到云端</p>
          <p>• 修改后建议及时同步以防数据丢失</p>
          <p>• 打印功能可用于制作家庭积分规则海报</p>
          <p>• 管理员可以管理所有成员、任务和奖励</p>
        </div>
      </div>
    </div>
  );
}
