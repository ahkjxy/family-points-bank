import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

// 极简默认数据（仅当本地文件为空时使用）
const defaultState = {
  currentProfileId: 'admin-only',
  profiles: [],
  tasks: [],
  rewards: [],
  syncId: '',
};

// 在 Vercel 函数中，process.cwd() 指向构建产物根目录，db 会被 includeFiles 一起打包
const resolvePath = (syncId: string) => path.join(process.cwd(), 'db', `${syncId}.json`);

export default async function handler(req: any, res: any) {
  const syncId = (() => {
    const raw = (req.query && (req.query as any).syncId) || '';
    try {
      return decodeURIComponent(String(raw)).trim();
    } catch {
      return String(raw).trim();
    }
  })();

  res.setHeader('Content-Type', 'application/json');

  if (!syncId) {
    res.status(400).json({ ok: false, message: 'Missing syncId' });
    return;
  }

  const dataPath = resolvePath(syncId);

  const handleError = (err: unknown, status = 500) => {
    console.error('api/state error', err);
    try {
      res.status(status).json({ ok: false, message: (err as Error)?.message || 'Unknown error' });
    } catch (e) {
      console.error('api/state response error', e);
    }
  };

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(dataPath)) {
        res.status(404).json({ ok: false, message: '家庭不存在' });
        return;
      }
      const raw = await fsp.readFile(dataPath, 'utf-8');
      const fallback = { ...defaultState, syncId };
      const parsed = raw?.trim() ? JSON.parse(raw) : fallback;
      res.status(200).json(parsed);
    } catch (e) {
      handleError(e);
    }
    return;
  }

  if (req.method === 'POST') {
    // Vercel 函数为只读文件系统，线上无法写入本地 db。
    res.status(403).json({ ok: false, message: '只读环境：线上不可写入 db 文件' });
    return;
  }

  res.status(405).json({ ok: false, message: 'Method Not Allowed' });
}
