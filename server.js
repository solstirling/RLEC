const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tally.json');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tally: 0 }, null, 2));
  }
}

function readTally() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const tally = Number(parsed.tally);
    return Number.isFinite(tally) ? tally : 0;
  } catch {
    return 0;
  }
}

function writeTally(value) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tally: value }, null, 2));
}

function updateTally(delta) {
  const next = readTally() + delta;
  writeTally(next);
  return next;
}

function serveIndex(res) {
  const filePath = path.join(ROOT, 'index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendText(res, 500, 'Failed to read index.html');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

function requestHandler(req, res) {
  const method = req.method || 'GET';
  const url = req.url || '/';

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    serveIndex(res);
    return;
  }

  if (method === 'GET' && url === '/api/tally') {
    sendJson(res, 200, { tally: readTally() });
    return;
  }

  if (method === 'POST' && url === '/api/tally/increment') {
    sendJson(res, 200, { tally: updateTally(1) });
    return;
  }

  if (method === 'POST' && url === '/api/tally/decrement') {
    sendJson(res, 200, { tally: updateTally(-1) });
    return;
  }

  sendJson(res, 404, { error: 'Not Found' });
}

ensureDataFile();

const server = http.createServer(requestHandler);
server.listen(PORT, HOST, () => {
  console.log(`RLEC server running on http://${HOST}:${PORT}`);
});
