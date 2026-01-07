import { useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { INITIAL_TASKS, INITIAL_REWARDS } from '../constants';

export function useDataSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const seedFamilyIfEmpty = useCallback(async (familyId: string, session: Session | null) => {
    try {
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId);
      if ((profileCount ?? 0) > 0) return;

      const adminName = (session?.user?.email?.split('@')[0] || '管理员').slice(0, 20);
      const { data: insertedProfiles } = await supabase
        .from('profiles')
        .insert([
          { family_id: familyId, name: adminName, balance: 0, role: 'admin', avatar_color: 'bg-blue-600' },
        ])
        .select();

      const adminProfileId = insertedProfiles?.[0]?.id;

      await supabase.from('tasks').insert(
        INITIAL_TASKS.map((t) => ({
          family_id: familyId,
          category: t.category,
          title: t.title,
          description: t.description,
          points: t.points,
          frequency: t.frequency,
        }))
      );

      await supabase.from('rewards').insert(
        INITIAL_REWARDS.map((r) => ({
          family_id: familyId,
          title: r.title,
          points: r.points,
          type: r.type,
          image_url: r.imageUrl,
        }))
      );

      if (adminProfileId) {
        await supabase.from('families').update({ current_profile_id: adminProfileId }).eq('id', familyId);
      }
    } catch (e) {
      console.warn('Seed family failed', e);
    }
  }, []);

  const ensureFamilyForSession = useCallback(async (session: Session, syncId?: string) => {
    const userId = session.user.id;
    let targetFamilyId = syncId?.trim() || '';

    if (targetFamilyId) {
      await supabase
        .from('family_members')
        .upsert({ family_id: targetFamilyId, user_id: userId, role: 'owner' }, { onConflict: 'family_id,user_id' });
    } else {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (memberships?.length) {
        targetFamilyId = memberships[0].family_id as string;
      }
    }

    if (!targetFamilyId) {
      const { data: created, error: createErr } = await supabase
        .from('families')
        .insert({ name: `${session.user.email?.split('@')[0] || '我的'}的家庭` })
        .select()
        .single();
      if (createErr || !created?.id) throw createErr || new Error('创建家庭失败');
      targetFamilyId = created.id as string;
    }

    await supabase
      .from('family_members')
      .upsert({ family_id: targetFamilyId, user_id: userId, role: 'owner' }, { onConflict: 'family_id,user_id' });
    await seedFamilyIfEmpty(targetFamilyId, session);

    return targetFamilyId;
  }, [seedFamilyIfEmpty]);

  return {
    isLoading,
    isSyncing,
    setIsLoading,
    setIsSyncing,
    fatalError,
    setFatalError,
    seedFamilyIfEmpty,
    ensureFamilyForSession,
  };
}
