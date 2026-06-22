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

// Faculty API Endpoints
async function handleFacultyApi(req, res, pathname) {
  const method = req.method;

  // API Key Management
  if (pathname === '/api/faculty/apikeys' && method === 'GET') {
    try {
      const keys = process.env.FACULTY_API_KEYS ? JSON.parse(process.env.FACULTY_API_KEYS) : [];
      return send(res, 200, JSON.stringify({ keys }), 'application/json');
    } catch (err) {
      return send(res, 500, JSON.stringify({ error: 'Failed to retrieve API keys' }), 'application/json');
    }
  }

  if (pathname === '/api/faculty/apikeys' && method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      const newKey = {
        id: Date.now().toString(),
        name: payload.name,
        key: `pk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        created: new Date().toISOString()
      };
      // Store in memory (in production, use a database)
      return send(res, 201, JSON.stringify({ success: true, key: newKey }), 'application/json');
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: 'Invalid request' }), 'application/json');
    }
  }

  // Bulk Upload Processing
  if (pathname === '/api/faculty/bulk-upload' && method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      const records = payload.records || [];
      
      const processed = records.map((record, idx) => ({
        ...record,
        status: 'processed',
        timestamp: new Date().toISOString(),
        rowIndex: idx + 1
      }));

      return send(res, 200, JSON.stringify({
        success: true,
        imported: processed.length,
        records: processed,
        summary: {
          total: processed.length,
          successful: processed.length,
          failed: 0
        }
      }), 'application/json');
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: 'Invalid bulk upload format' }), 'application/json');
    }
  }

  // Batch Edit
  if (pathname === '/api/faculty/batch-edit' && method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      const { filter, field, value } = payload;

      return send(res, 200, JSON.stringify({
        success: true,
        message: `Batch edit applied: ${filter} → ${field} = ${value}`,
        affected: 0,
        timestamp: new Date().toISOString()
      }), 'application/json');
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: 'Invalid batch edit request' }), 'application/json');
    }
  }

  // Export Endpoint
  if (pathname === '/api/faculty/export' && method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      const format = payload.format || 'json'; // json, csv, pdf
      const data = payload.data || {};

      const exportData = {
        timestamp: new Date().toISOString(),
        format: format,
        student: data.student || {},
        courses: data.courses || [],
        summary: data.summary || {},
        generatedBy: 'UniTrack Faculty Panel'
      };

      res.writeHead(200, {
        'Content-Type': format === 'json' ? 'application/json' : 'text/plain',
        'Content-Disposition': `attachment; filename="academic-dossier-${Date.now()}.${format}"`
      });
      res.end(JSON.stringify(exportData, null, 2));
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: 'Invalid export request' }), 'application/json');
    }
  }

  // Student Search
  if (pathname === '/api/faculty/search-student' && method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body);
      const query = payload.query || '';

      // Simulated search results
      return send(res, 200, JSON.stringify({
        success: true,
        query: query,
        results: [
          {
            id: '001',
            name: 'Sample Student',
            roll: '20211CSE0001',
            email: 'student@university.edu',
            department: 'CSE',
            batch: '2021-2025',
            cgpa: 8.5
          }
        ]
      }), 'application/json');
    } catch (err) {
      return send(res, 400, JSON.stringify({ error: 'Invalid search request' }), 'application/json');
    }
  }

  return send(res, 404, JSON.stringify({ error: 'Faculty API endpoint not found' }), 'application/json');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return send(res, 204, '', 'text/plain');
  }

  // Faculty API routes
  if (pathname.startsWith('/api/faculty/')) {
    return handleFacultyApi(req, res, pathname);
  }

  if (pathname === '/api/scan' || pathname === '/api/scan/') {
    return handleScan(req, res);
  }
  if (pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ status: 'ok', mode: 'faculty-enhanced' }), 'application/json');
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
