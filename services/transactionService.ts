import { supabase } from '../supabaseClient';
import type { Transaction } from '../types';

export async function createTransaction(tx: Omit<Transaction, 'id'> & { familyId: string; profileId: string }): Promise<Transaction> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`;

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      id,
      family_id: tx.familyId,
      profile_id: tx.profileId,
      title: tx.title,
      points: tx.points,
      type: tx.type,
      timestamp: new Date(tx.timestamp).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await updateProfileBalance(tx.profileId, tx.familyId, tx.points);

  return {
    id: data.id,
    title: data.title,
    points: data.points,
    timestamp: new Date(data.timestamp).getTime(),
    type: data.type as Transaction['type'],
  };
}

async function updateProfileBalance(profileId: string, familyId: string, pointsChange: number): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', profileId)
    .eq('family_id', familyId)
    .single();

  if (!profile) throw new Error('Profile not found');

  const newBalance = profile.balance + pointsChange;
  const { error } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', profileId)
    .eq('family_id', familyId);

  if (error) throw error;

  return newBalance;
}

export async function getTransactions(familyId: string, profileId?: string): Promise<Transaction[]> {
  const query = supabase
    .from('transactions')
    .select('*')
    .eq('family_id', familyId);

  if (profileId) {
    query.eq('profile_id', profileId);
  }

  const { data, error } = await query.order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((t) => ({
    id: t.id,
    title: t.title,
    points: t.points,
    timestamp: new Date(t.timestamp).getTime(),
    type: t.type as Transaction['type'],
  }));
}
