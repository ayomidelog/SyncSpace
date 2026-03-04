import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'db.json');

let _lastId = 0;

function generateId() {
  const ts = Date.now();
  if (ts <= _lastId) {
    _lastId++;
  } else {
    _lastId = ts;
  }
  return _lastId;
}

class JSONDatabase {
  constructor() {
    this.lock = Promise.resolve();
    this.queue = [];
    this.processing = false;
  }

  async init() {
    try {
      await fs.access(DB_PATH);
    } catch {
      await fs.writeFile(DB_PATH, JSON.stringify({ clips: [] }, null, 2));
    }
  }

  async enqueue(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing) return;
    if (this.queue.length === 0) return;

    this.processing = true;
    const { operation, resolve, reject } = this.queue.shift();

    let releaseLock;
    try {
      await this.lock;

      this.lock = new Promise(r => { releaseLock = r; });

      const result = await operation();

      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      if (releaseLock) releaseLock();
      this.processing = false;
      this.processQueue();
    }
  }

  async getClips() {
    return this.enqueue(async () => {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data).clips;
    });
  }

  async addClip(clip) {
    return this.enqueue(async () => {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      const db = JSON.parse(data);
      
      const newClip = {
        id: generateId(),
        created_at: new Date().toISOString(),
        ...clip
      };
      
      db.clips.unshift(newClip);
      
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
      return newClip;
    });
  }

  async deleteClip(id) {
    return this.enqueue(async () => {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      const db = JSON.parse(data);

      const toDelete = db.clips.find(c => c.id === id) || null;
      db.clips = db.clips.filter(c => c.id !== id);

      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
      return toDelete;
    });
  }
}

export const db = new JSONDatabase();
