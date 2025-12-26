import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { FIXED_SYNC_ID, INITIAL_PROFILES, INITIAL_TASKS, INITIAL_REWARDS } from './constants';

// Fix: Define __dirname for ES modules environment where it is not globally available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const defaultState = {
      currentProfileId: INITIAL_PROFILES[0]?.id ?? 'admin-only',
      profiles: INITIAL_PROFILES,
      tasks: INITIAL_TASKS,
      rewards: INITIAL_REWARDS,
      syncId: FIXED_SYNC_ID,
    };

    const resolvePath = (syncId: string) => path.resolve(__dirname, `db/${syncId}.json`);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'local-json-api',
          configureServer(server) {
            server.middlewares.use((req, res, next) => {
              const urlPath = req.url?.split('?')[0] || '';
              const match = urlPath.match(/^\/api\/state\/([^/?#]+)/);
              if (!match) return next();

              const syncId = decodeURIComponent(match[1]);
              const dataPath = resolvePath(syncId);

              const handleError = (err: unknown, status = 500) => {
                res.statusCode = status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, message: (err as Error)?.message || 'Unknown error' }));
              };

              if (req.method === 'GET') {
                (async () => {
                  try {
                    if (!fs.existsSync(dataPath)) {
                      handleError(new Error('家庭不存在'), 404);
                      return;
                    }
                    const raw = await fsp.readFile(dataPath, 'utf-8');
                    const fallback = { ...defaultState, syncId };
                    res.setHeader('Content-Type', 'application/json');
                    res.end(raw?.trim() ? raw : JSON.stringify(fallback));
                  } catch (e) {
                    handleError(e);
                  }
                })();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    await fsp.mkdir(path.dirname(dataPath), { recursive: true });
                    const payload = { ...parsed, syncId };
                    await fsp.writeFile(dataPath, JSON.stringify(payload, null, 2), 'utf-8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true }));
                  } catch (e) {
                    handleError(e);
                  }
                });
                return;
              }

              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, message: 'Method Not Allowed' }));
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix: Use the locally defined __dirname to resolve root path
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});