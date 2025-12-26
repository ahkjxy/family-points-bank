// 将本地 db JSON 转成 UUID 主键并导入 Supabase（适配最新表结构）
// 用法：SUPABASE_URL=... SUPABASE_KEY=... FAMILY_ID=<可选 UUID> node scripts/importToSupabase.js
// 如果未设置 FAMILY_ID，将为该导入生成新的 UUID 作为 families.id

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const jsonPath = path.join(root, 'db', '王僚原.json');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mfgfbwhznqpdjumtsrus.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_2pDY4atjEw5MVSWeakl4HA_exf_osvS';
const familyIdEnv = process.env.FAMILY_ID;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && uuidRegex.test(v.trim());
const ensureUuid = (v) => (isUuid(v) ? v.trim() : randomUUID());
const toIso = (ts) => {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString();
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
};

async function main() {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  const familyId = isUuid(familyIdEnv) ? familyIdEnv : randomUUID();
  const familyName = data.syncId || data.name || '未命名家庭';

  const profileIdMap = new Map();
  const profiles = Array.isArray(data.profiles)
    ? data.profiles.map((p) => {
        const id = ensureUuid(p.id);
        profileIdMap.set(p.id, id);
        return {
          id,
          family_id: familyId,
          name: p.name,
          balance: Number(p.balance) || 0,
          role: p.role || 'child',
          avatar_color: p.avatarColor,
        };
      })
    : [];

  const tasks = Array.isArray(data.tasks)
    ? data.tasks.map((t) => ({
        id: ensureUuid(t.id),
        family_id: familyId,
        category: t.category,
        title: t.title,
        description: t.description,
        points: Number(t.points) || 0,
        frequency: t.frequency,
      }))
    : [];

  const rewards = Array.isArray(data.rewards)
    ? data.rewards.map((r) => ({
        id: ensureUuid(r.id),
        family_id: familyId,
        title: r.title,
        points: Number(r.points) || 0,
        type: r.type,
        image_url: r.imageUrl,
      }))
    : [];

  const transactions = Array.isArray(data.profiles)
    ? data.profiles.flatMap((p) => {
        if (!Array.isArray(p.history)) return [];
        const profileId = profileIdMap.get(p.id) || ensureUuid(p.id);
        return p.history.map((h) => ({
          id: ensureUuid(h.id),
          family_id: familyId,
          profile_id: profileId,
          title: h.title,
          points: Number(h.points) || 0,
          type: h.type,
          timestamp: toIso(h.timestamp),
        }));
      })
    : [];

  const sourceCurrent = data.currentProfileId;
  const currentProfileId = sourceCurrent && profileIdMap.get(sourceCurrent)
    ? profileIdMap.get(sourceCurrent)
    : profiles[0]?.id || null;

  console.log('准备导入 -> familyId:', familyId, 'profiles:', profiles.length, 'tasks:', tasks.length, 'rewards:', rewards.length, 'tx:', transactions.length);

  // families（先插入基本信息，不带 current_profile_id）
  await supabase.from('families').upsert({ id: familyId, name: familyName });

  if (profiles.length) {
    await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
  }
  if (tasks.length) {
    await supabase.from('tasks').upsert(tasks, { onConflict: 'id' });
  }
  if (rewards.length) {
    await supabase.from('rewards').upsert(rewards, { onConflict: 'id' });
  }
  if (transactions.length) {
    await supabase.from('transactions').upsert(transactions, { onConflict: 'id' });
  }

  if (currentProfileId) {
    await supabase.from('families').update({ current_profile_id: currentProfileId }).eq('id', familyId);
  }

  console.log('导入完成');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
