import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname);
const PORT = process.env.PORT || 8000;
const AI_KEY = process.env.ANTHROPIC_API_KEY || process.env.RENDER_AI_API_KEY || process.env.AI_API_KEY;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

function send(res, status, body, contentType = 'text/plain') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

async function serveStatic(req, res) {
  const reqUrl = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = path.normalize(path.join(PUBLIC_DIR, reqUrl === '/' ? 'index.html' : reqUrl));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    return send(res, 403, 'Forbidden');
  }
  try {
    const fileStat = await stat(safePath);
    if (fileStat.isDirectory()) {
      return serveStatic({ url: '/index.html' }, res);
    }
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const data = await readFile(safePath);
    send(res, 200, data, contentType);
  } catch (err) {
    send(res, 404, 'Not found');
  }
}

function parseAnthropicResponse(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  const extractText = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    if (typeof obj.text === 'string' && (obj.type === 'output_text' || obj.type === 'message' || obj.type === 'input_text')) {
      return obj.text;
    }
    if (typeof obj.output_text === 'string') return obj.output_text;
    if (Array.isArray(obj.output)) {
      return obj.output.map(extractText).join('');
    }
    if (Array.isArray(obj.content)) {
      return obj.content.map(extractText).join('');
    }
    return Object.values(obj).map(extractText).join('');
  };
  const result = extractText(payload);
  return result || JSON.stringify(payload);
}

async function handleScan(req, res) {
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed');

  let body = '';
  for await (const chunk of req) body += chunk;
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    return send(res, 400, JSON.stringify({ error: 'Invalid JSON payload.' }), 'application/json');
  }

  const prompt = payload.prompt || 'Extract all subjects, grades, credits and student info from this mark sheet / grade card.';
  const imageBase64 = payload.base64;
  const mediaType = payload.mediaType || 'image/png';
  const requestApiKey = payload.apiKey || AI_KEY;
  if (!imageBase64) {
    return send(res, 400, JSON.stringify({ error: 'Missing image base64 payload.' }), 'application/json');
  }
  if (!requestApiKey) {
    return send(res, 401, JSON.stringify({ error: 'API key missing for Anthropic request. Set RENDER_AI_API_KEY in Render or save an Anthropic key in Settings.' }), 'application/json');
  }

  const imageUrl = `data:${mediaType};base64,${imageBase64}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': requestApiKey,
        'anthropic-version': '2024-12-17',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4.6',
        max_tokens_to_sample: 4000,
        input: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageUrl },
        ],
      }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      const errorMessage = responseData.error?.message || responseData.error || JSON.stringify(responseData);
      return send(res, response.status, JSON.stringify({ error: `AI provider error: ${errorMessage}` }), 'application/json');
    }

    const text = parseAnthropicResponse(responseData);
    return send(res, 200, JSON.stringify({ text, raw: responseData }), 'application/json');
  } catch (err) {
    return send(res, 500, JSON.stringify({ error: (err && err.message) || 'Unknown server scan error' }), 'application/json');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    return send(res, 204, '', 'text/plain');
  }
  if (url.pathname === '/api/scan' || url.pathname === '/api/scan/') {
    return handleScan(req, res);
  }
  if (url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ status: 'ok' }), 'application/json');
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
