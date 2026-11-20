import type { Plugin, ViteDevServer } from 'vite';
import { 
  handleAdminUserOperation, 
  handleResolveLoginId,
  handleFirstLoginChallenge,
  handleCompleteFirstLogin
} from './adminBackend.ts';
import { handleAIChatRequest } from './aiChatBackend.ts';

export function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api-plugin',
    configureServer(server: ViteDevServer) {
      // 1. ADMIN USER MANAGEMENT
      server.middlewares.use('/api/admin/users', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        try {
          const authHeader = req.headers['authorization'] || '';
          const token = (authHeader as string).replace('Bearer ', '').trim();

          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyText = Buffer.concat(buffers).toString('utf-8');
          const body = bodyText ? JSON.parse(bodyText) : {};

          const result = await handleAdminUserOperation(token, body);

          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });

      // 2. AI CHAT ENDPOINT FOR STUDENT PORTAL
      server.middlewares.use('/api/ai/chat', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        try {
          const authHeader = req.headers['authorization'] || '';
          const token = (authHeader as string).replace('Bearer ', '').trim();

          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyText = Buffer.concat(buffers).toString('utf-8');
          const body = bodyText ? JSON.parse(bodyText) : {};

          const result = await handleAIChatRequest(token, body);

          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });

      // 3. SECURE LOGIN ID RESOLUTION ENDPOINT (Public resolution for Login ID -> Email)
      server.middlewares.use('/api/auth/resolve-login-id', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'content-type');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyText = Buffer.concat(buffers).toString('utf-8');
          const body = bodyText ? JSON.parse(bodyText) : {};
          const loginId = body?.login_id;

          if (!loginId || !String(loginId).trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'login_id is required' }));
            return;
          }

          const email = await handleResolveLoginId(String(loginId).trim());
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: true, email }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });

      // 4. FIRST LOGIN CHALLENGE ENDPOINT
      server.middlewares.use('/api/auth/first-login-challenge', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'content-type');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyText = Buffer.concat(buffers).toString('utf-8');
          const body = bodyText ? JSON.parse(bodyText) : {};

          const result = await handleFirstLoginChallenge(body);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });

      // 5. COMPLETE FIRST LOGIN & PASSWORD SETUP ENDPOINT
      server.middlewares.use('/api/auth/complete-first-login', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'content-type');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyText = Buffer.concat(buffers).toString('utf-8');
          const body = bodyText ? JSON.parse(bodyText) : {};

          const result = await handleCompleteFirstLogin(body);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
        }
      });
    }
  };
}
