import React, { RefObject } from 'react';
import { Icon } from './Icon';

interface EditModalProps {
  editingItem: { type: 'task' | 'reward'; item: any } | null;
  onClose: () => void;
  onSave: (type: 'task' | 'reward', item: any) => void;
  onUpdate: (payload: { type: 'task' | 'reward'; item: any }) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving?: boolean;
}

export function EditModal({ editingItem, onClose, onSave, onUpdate, fileInputRef, onImageChange, saving = false }: EditModalProps) {
  if (!editingItem) return null;

  const { type, item } = editingItem;
  const updateItem = (patch: Record<string, any>) => onUpdate({ ...editingItem, item: { ...item, ...patch } });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[550px] rounded-[48px] shadow-3xl relative z-10 p-10 space-y-6 animate-in slide-in-from-bottom-8 border border-gray-100 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center px-2">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 font-display tracking-tight">
              {type === 'reward' ? '上架商品' : item.id ? '修改规则' : '创建新规则'}
            </h3>
            <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-bold">MODE: {type.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-[#FF4D94] transition-all p-2 rounded-full hover:bg-gray-100"><Icon name="plus" size={32} className="rotate-45" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (saving) return; onSave(type, item); }} className="space-y-5">
          {type === 'reward' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">奖品图片 Reward Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50 hover:border-pink-200 transition-all overflow-hidden"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Icon name="reward" size={32} />
                    <span className="text-[10px] font-bold">点击上传图片</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={onImageChange} accept="image/*" className="hidden" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">标题说明 Title</label>
            <input required value={item.title || ''} onChange={e => updateItem({ title: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all" placeholder="输入名称..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">变动数值 Points</label>
              <input type="number" required value={item.points || 0} onChange={e => updateItem({ points: parseInt(e.target.value) || 0 })} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all" />
            </div>
            {type === 'task' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">结算周期 Cycle</label>
                <select
                  value={item.frequency || '每日'}
                  onChange={e => updateItem({ frequency: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all"
                >
                  {['每日', '每次', '每周', '每月', '每学期', '每年'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">奖项类别 Type</label>
                <select value={item.type || '实物奖品'} onChange={e => updateItem({ type: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94]">
                  <option>实物奖品</option>
                  <option>特权奖励</option>
                </select>
              </div>
            )}
          </div>

          {type === 'task' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">所属分类 Group</label>
              <select value={item.category || 'learning'} onChange={e => updateItem({ category: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94]">
                <option value="learning">📘 学习习惯类</option>
                <option value="chores">🧹 家务小帮手</option>
                <option value="discipline">⏰ 自律养成类</option>
                <option value="penalty">⚠️ 违规警示项</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">规则详细摘要 Summary</label>
            <textarea value={item.description || ''} onChange={e => updateItem({ description: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-semibold text-xs outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all min-h-[80px] resize-none" placeholder="输入摘要描述..." />
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-bold uppercase text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">放弃</button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-[2] py-4 btn-pop rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${saving ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {saving && <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />}
              {saving ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
