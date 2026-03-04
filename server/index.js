import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../uploads');

try {
  await fs.access(UPLOADS_DIR);
} catch {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

const app = express();
const port = process.env.PORT || 4111;

// Session management - store valid session tokens
const validSessions = new Map();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Password hash - uses AUTH_PASSWORD from .env file
if (!process.env.AUTH_PASSWORD) {
  console.error('ERROR: AUTH_PASSWORD environment variable is required. Please set it in .env file.');
  process.exit(1);
}
const PASSWORD_HASH = crypto.createHash('sha256').update(process.env.AUTH_PASSWORD).digest('hex');

// Generate a secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Simple in-memory rate limiter for auth attempts
const authAttempts = new Map();
const MAX_AUTH_ATTEMPTS = 10;
const AUTH_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = authAttempts.get(ip);
  if (!record || now > record.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_LOCKOUT_MS });
    return true;
  }
  if (record.count >= MAX_AUTH_ATTEMPTS) return false;
  record.count++;
  return true;
}

function resetRateLimit(ip) {
  authAttempts.delete(ip);
}

// Simple in-memory rate limiter for upload requests
const uploadAttempts = new Map();
const MAX_UPLOADS_PER_WINDOW = 60;
const UPLOAD_WINDOW_MS = 60 * 1000; // 1 minute

function checkUploadRateLimit(ip) {
  const now = Date.now();
  const record = uploadAttempts.get(ip);
  if (!record || now > record.resetAt) {
    uploadAttempts.set(ip, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_UPLOADS_PER_WINDOW) return false;
  record.count++;
  return true;
}

// Simple in-memory rate limiter for destructive (delete) requests
const deleteAttempts = new Map();
const MAX_DELETES_PER_WINDOW = 60;
const DELETE_WINDOW_MS = 60 * 1000; // 1 minute

function checkDeleteRateLimit(ip) {
  const now = Date.now();
  const record = deleteAttempts.get(ip);
  if (!record || now > record.resetAt) {
    deleteAttempts.set(ip, { count: 1, resetAt: now + DELETE_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_DELETES_PER_WINDOW) return false;
  record.count++;
  return true;
}

// Periodic cleanup of expired rate limiter entries to prevent unbounded Map growth
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

function cleanupRateLimitMaps() {
  const now = Date.now();
  for (const [ip, record] of authAttempts) {
    if (record.resetAt <= now) authAttempts.delete(ip);
  }
  for (const [ip, record] of uploadAttempts) {
    if (record.resetAt <= now) uploadAttempts.delete(ip);
  }
  for (const [ip, record] of deleteAttempts) {
    if (record.resetAt <= now) deleteAttempts.delete(ip);
  }
}

setInterval(cleanupRateLimitMaps, RATE_LIMIT_CLEANUP_INTERVAL_MS).unref();

// Regex for strictly numeric strings (used for ID validation and proxy config)
const DIGITS_ONLY = /^\d+$/;

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.avif',
  '.mp4', '.webm', '.mov', '.avi', '.mkv',
  '.mp3', '.ogg', '.wav', '.flac', '.aac',
  '.pdf', '.txt', '.csv', '.json', '.xml',
  '.zip', '.tar', '.gz', '.7z',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);

// Validate session token
function isValidSession(token) {
  if (!token) return false;
  const session = validSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    validSessions.delete(token);
    return false;
  }
  return true;
}

// Parse cookies from request
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
  }
  return cookies;
}

app.use(cors({
  origin: process.env.CORS_ORIGIN || false,
  credentials: true,
}));
// Trust proxy if configured, so req.ip returns the real client IP
if (process.env.TRUST_PROXY !== undefined) {
  let trustProxy = process.env.TRUST_PROXY;
  // Convert numeric and boolean-like strings to appropriate types
  if (DIGITS_ONLY.test(trustProxy)) {
    trustProxy = Number(trustProxy);
  } else if (trustProxy === 'true') {
    trustProxy = true;
  } else if (trustProxy === 'false') {
    trustProxy = false;
  }
  app.set('trust proxy', trustProxy);
}
app.use(express.json());

// Auth verification endpoint
app.post('/api/auth/verify', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ authenticated: false, error: 'Too many attempts. Try again later.' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(401).json({ authenticated: false, error: 'Password required' });
  }
  
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  if (crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(PASSWORD_HASH, 'hex'))) {
    resetRateLimit(ip);
    const token = generateSessionToken();
    validSessions.set(token, { expires: Date.now() + SESSION_DURATION });
    
    // Set cookie header manually
    res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_DURATION / 1000}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    
    return res.json({ authenticated: true });
  }
  
  return res.status(401).json({ authenticated: false, error: 'Invalid password' });
});

// Auth status check endpoint
app.get('/api/auth/status', (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const cookies = parseCookies(req);
  const token = cookies.session;
  
  if (isValidSession(token)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

// Auth middleware for protected routes
function authMiddleware(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.session;
  
  if (isValidSession(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Protect uploads with auth
app.use('/uploads', authMiddleware, express.static(UPLOADS_DIR));

const DIST_DIR = path.join(__dirname, '../dist');

try {
  await fs.access(DIST_DIR);
  app.use(express.static(DIST_DIR));
} catch (e) {
  console.error('WARNING: dist directory not found. Did you run "npm run build"?');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('File type not allowed'));
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + ext)
  }
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

await db.init();

const decode = (encoded) => {
  if (!encoded) return encoded;
  if (!/^[0-9a-fA-F]+$/.test(encoded) || encoded.length % 4 !== 0) return encoded;
  
  try {
    const key = 'syncspace';
    let decoded = '';
    for (let i = 0; i < encoded.length; i += 4) {
      const hex = encoded.substr(i, 4);
      const code = parseInt(hex, 16);
      decoded += String.fromCharCode(code ^ key.charCodeAt((i / 4) % key.length));
    }
    return decoded;
  } catch (e) {
    return encoded;
  }
};

app.get('/api/clips', authMiddleware, async (req, res) => {
  try {
    const clips = await db.getClips();
    res.json(clips);
  } catch (error) {
    console.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

app.post('/api/clips', authMiddleware, (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (!checkUploadRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many uploads. Please slow down.' });
  }
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      let status = 400;
      let message;
      if (err.message === 'File type not allowed') {
        message = 'File type not allowed';
      } else if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        message = 'File too large. Max 10MB';
      } else {
        message = 'File upload failed';
      }
      return res.status(status).json({ error: message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { type, content } = req.body;
    const allowedTypes = new Set(['text', 'image', 'file']);
    if (!allowedTypes.has(type)) {
      return res.status(400).json({ error: 'Invalid clip type' });
    }

    if (req.files && req.files.length > 0) {
      const clips = [];
      for (const file of req.files) {
        const file_path = `/uploads/${file.filename}`;
        const clip = await db.addClip({
          type,
          content: decode(content),
          file_path,
          original_name: file.originalname,
        });
        clips.push(clip);
      }
      res.json(clips);
    } else {
      const clip = await db.addClip({
        type,
        content: decode(content),
        file_path: null
      });
      res.json(clip);
    }
  } catch (error) {
    console.error('Error saving clip:', error);
    res.status(500).json({ error: 'Failed to save clip' });
  }
});

app.delete('/api/clips/:id', authMiddleware, async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    if (!checkDeleteRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    const idParam = req.params.id;
    if (!DIGITS_ONLY.test(idParam)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const id = Number(idParam);
    const deleted = await db.deleteClip(id);

    // Remove the associated file from disk to prevent storage leaks
    if (deleted && deleted.file_path) {
      const filename = path.basename(deleted.file_path);
      const filePath = path.resolve(UPLOADS_DIR, filename);
      // Guard against path traversal: ensure the target is inside UPLOADS_DIR
      if (filePath.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
        try {
          await fs.unlink(filePath);
        } catch (unlinkErr) {
          if (unlinkErr.code !== 'ENOENT') {
            console.error('Error removing uploaded file:', unlinkErr);
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

app.get('*', async (req, res) => {
  try {
    await fs.access(path.join(DIST_DIR, 'index.html'));
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  } catch (e) {
    res.status(404).send('App not built. Please run "npm run build" on the server.');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
