import React from 'react';
import { Icon } from './Icon';

interface EditModalProps {
  editingItem: { type: 'task' | 'reward'; item: any } | null;
  onClose: () => void;
  onSave: (type: 'task' | 'reward', item: any) => void;
  onUpdate: (payload: { type: 'task' | 'reward'; item: any }) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving?: boolean;
}

export function EditModal({ editingItem, onClose, onSave, onUpdate, fileInputRef, onImageChange, saving = false }: EditModalProps) {
  if (!editingItem) return null;

  const { type, item } = editingItem;
  const updateItem = (patch: Record<string, any>) => onUpdate({ ...editingItem, item: { ...item, ...patch } });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xl" onClick={onClose}></div>
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-2xl w-full max-w-[580px] rounded-[56px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.4)] relative z-10 p-10 lg:p-14 space-y-8 animate-in slide-in-from-bottom-12 duration-500 border border-white/20 dark:border-white/5 max-h-[92vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-start px-2">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-[#FF4D94] uppercase tracking-[0.4em] mb-1">Configuration</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {type === 'reward' ? '上架商品' : item.id ? '修改规则' : '创建新规则'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 dark:text-gray-600 hover:text-[#FF4D94] transition-all p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 group"
          >
            <Icon name="plus" size={32} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (saving) return; onSave(type, item); }} className="space-y-8">
          {type === 'reward' && (
            <div className="space-y-3 px-2">
              <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-1 tracking-[0.2em]">奖品图示 / Cover Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-full h-48 bg-gray-50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FF4D94]/5 hover:border-[#FF4D94]/30 transition-all duration-500 overflow-hidden shadow-inner"
              >
                {item.imageUrl ? (
                  <>
                    <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white text-[10px] font-black uppercase tracking-widest">更换图片</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-gray-300 dark:text-gray-600 group-hover:text-[#FF4D94] transition-colors">
                    <div className="w-16 h-16 rounded-[24px] bg-white dark:bg-white/5 flex items-center justify-center shadow-sm border border-gray-100 dark:border-white/10">
                      <Icon name="reward" size={32} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-400 dark:text-gray-500 group-hover:text-[#FF4D94]">点击上传高清图</span>
                      <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600 mt-1 uppercase tracking-widest">Recommended: 800x600 PNG/JPG</p>
                    </div>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={onImageChange} accept="image/*" className="hidden" />
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">标题说明 / Title</label>
              <div className="relative group">
                <input 
                  required 
                  value={item.title || ''} 
                  onChange={e => updateItem({ title: e.target.value })} 
                  className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-base outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner group-hover:border-gray-200 dark:group-hover:border-white/10" 
                  placeholder="输入一个响亮的名称..." 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">变动数值 / Value</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    required 
                    value={item.points || 0} 
                    onChange={e => updateItem({ points: parseInt(e.target.value) || 0 })} 
                    className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-xl points-font outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner" 
                  />
                  <span className="absolute right-8 text-xs font-black text-gray-300 uppercase tracking-widest pointer-events-none">Pts</span>
                </div>
              </div>
              {type === 'task' ? (
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">结算周期 / Cycle</label>
                  <select
                    value={item.frequency || '每日'}
                    onChange={e => updateItem({ frequency: e.target.value })}
                    className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    {['每日', '每次', '每周', '每月', '每学期', '每年'].map(opt => (
                      <option key={opt} value={opt} className="bg-white dark:bg-gray-800 font-bold">{opt}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">奖项类别 / Type</label>
                  <select 
                    value={item.type || '实物奖品'} 
                    onChange={e => updateItem({ type: e.target.value })} 
                    className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[24px] font-black text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option className="bg-white dark:bg-gray-800 font-bold">实物奖品</option>
                    <option className="bg-white dark:bg-gray-800 font-bold">特权奖励</option>
                  </select>
                </div>
              )}
            </div>

            {type === 'task' && (
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">所属分类 / Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'learning', label: '学习习惯', icon: '📘' },
                    { id: 'chores', label: '家务劳作', icon: '🧹' },
                    { id: 'discipline', label: '行为自律', icon: '⏰' },
                    { id: 'penalty', label: '违规扣减', icon: '⚠️' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => updateItem({ category: cat.id })}
                      className={`p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                        item.category === cat.id 
                          ? 'border-[#FF4D94] bg-[#FF4D94]/5 shadow-[0_8px_16px_-4px_rgba(255,77,148,0.2)]' 
                          : 'border-transparent bg-gray-50 dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className={`text-[10px] font-black tracking-tighter ${item.category === cat.id ? 'text-[#FF4D94]' : 'text-gray-400 dark:text-gray-500'}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 ml-4 tracking-[0.2em]">规则摘要 / Summary</label>
              <textarea 
                value={item.description || ''} 
                onChange={e => updateItem({ description: e.target.value })} 
                className="w-full px-8 py-5 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[32px] font-bold text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner min-h-[120px] resize-none leading-relaxed" 
                placeholder="详细说明下这个规则吧，让大家更有动力..." 
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[24px] transition-all"
            >
              放弃更改
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-[2] py-5 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-[0_20px_40px_-12px_rgba(255,77,148,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all ${saving ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="plus" size={18} />
              )}
              {saving ? '保存同步中...' : '确认发布规则'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
