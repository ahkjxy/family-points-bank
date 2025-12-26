import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { INITIAL_PROFILES, INITIAL_REWARDS, INITIAL_TASKS, FIXED_SYNC_ID } from '../../constants';

const defaultState = {
  currentProfileId: INITIAL_PROFILES[0]?.id ?? 'admin-only',
  profiles: INITIAL_PROFILES,
  tasks: INITIAL_TASKS,
  rewards: INITIAL_REWARDS,
  syncId: FIXED_SYNC_ID,
};

const resolvePath = (syncId: string) => path.resolve(process.cwd(), 'db', `${syncId}.json`);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const syncId = decodeURIComponent((req.query.syncId as string) || '').trim();
  if (!syncId) {
    res.status(400).json({ ok: false, message: 'Missing syncId' });
    return;
  }

  const dataPath = resolvePath(syncId);

  const handleError = (err: unknown, status = 500) => {
    res.status(status).json({ ok: false, message: (err as Error)?.message || 'Unknown error' });
  };

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(dataPath)) {
        handleError(new Error('家庭不存在'), 404);
        return;
      }
      const raw = await fsp.readFile(dataPath, 'utf-8');
      const fallback = { ...defaultState, syncId };
      res.status(200).json(raw?.trim() ? JSON.parse(raw) : fallback);
    } catch (e) {
      handleError(e);
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const parsed = req.body ?? {};
      await fsp.mkdir(path.dirname(dataPath), { recursive: true });
      const payload = { ...parsed, syncId };
      await fsp.writeFile(dataPath, JSON.stringify(payload, null, 2), 'utf-8');
      res.status(200).json({ ok: true });
    } catch (e) {
      handleError(e);
    }
    return;
  }

  res.status(405).json({ ok: false, message: 'Method Not Allowed' });
}
