import { supabase } from '../supabaseClient';
import { INITIAL_TASKS, INITIAL_REWARDS } from '../constants';
import type { FamilyState, Profile } from '../types';
import type { Session } from '@supabase/supabase-js';

export async function fetchFamilyData(familyId: string): Promise<FamilyState | null> {
  try {
    const { data, error } = await supabase
      .from('families')
      .select(`
        id, name, current_profile_id,
        profiles (*),
        tasks (*),
        rewards (*),
        transactions (*, profile_id, family_id)
      `)
      .eq('id', familyId)
      .single();

    if (error || !data) {
      console.error('Fetch family error:', error);
      return null;
    }

    const tx = (data as any).transactions || [];
    const profiles = ((data as any).profiles || []).map((p: any) => {
      const history = tx
        .filter((t: any) => t.profile_id === p.id)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          points: t.points,
          timestamp: t.timestamp ? new Date(t.timestamp).getTime() : Date.now(),
          type: t.type,
        }))
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return { ...p, avatarColor: p.avatar_color || p.avatarColor, avatarUrl: p.avatar_url || p.avatarUrl || null, history } as Profile;
    });

    return {
      currentProfileId: (data as any).current_profile_id || profiles[0]?.id || '',
      profiles,
      tasks: (data as any).tasks || [],
      rewards: ((data as any).rewards || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        points: r.points,
        type: r.type,
        imageUrl: r.image_url,
        status: r.status,
        requestedBy: r.requested_by,
        requestedAt: r.requested_at ? new Date(r.requested_at).getTime() : undefined,
      })),
      syncId: familyId,
    };
  } catch (e) {
    console.error('Fetch family failed', e);
    return null;
  }
}

export async function grantDailyEnergy(familyId: string, profiles: Profile[]): Promise<void> {
  if (!familyId || !profiles.length) return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dailyTitle = '每日元气+1';

  const { data: existingTx } = await supabase
    .from('transactions')
    .select('id, profile_id, timestamp')
    .eq('family_id', familyId)
    .gte('timestamp', todayStart.toISOString())
    .eq('title', dailyTitle);

  const credited = new Set(existingTx?.map((t) => t.profile_id) || []);
  const targets = profiles.filter((p) => !credited.has(p.id));

  if (!targets.length) return;

  const now = Date.now();
  const txList = targets.map((p, idx) => ({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `daily-${now}-${idx}-${p.id}`,
    family_id: familyId,
    profile_id: p.id,
    title: dailyTitle,
    points: 1,
    type: 'earn',
    timestamp: new Date(now + idx).toISOString(),
  }));

  const { error: txErr } = await supabase.from('transactions').insert(txList);
  if (txErr) throw txErr;

  await Promise.all(
    targets.map((p) =>
      supabase
        .from('profiles')
        .update({ balance: p.balance + 1 })
        .eq('id', p.id)
        .eq('family_id', familyId)
    )
  );
}

export async function seedFamily(familyId: string, session: Session | null): Promise<void> {
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
}
