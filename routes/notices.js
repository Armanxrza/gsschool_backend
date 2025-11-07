import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verify } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '..', 'data', 'notices.json');

const router = Router();

const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const write = (d) => fs.writeFileSync(dataFile, JSON.stringify(d, null, 2));

router.get('/', (_req, res) => {
  const list = read();
  // Filter out expired notices
  const now = new Date();
  const active = list.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);
  res.json(active);
});

router.post('/', verify, (req, res) => {
  const list = read();
  const item = {
    id: Date.now().toString(),
    title: req.body.title || 'Notice',
    content: req.body.content || '',
    level: req.body.level || 'info',
    // optional image URL (uploaded via /api/upload)
    image: req.body.image || null,
    createdAt: new Date().toISOString(),
    expiresAt: req.body.expiresAt || null
  };
  list.unshift(item);
  write(list);
  res.json(item);
});

router.delete('/:id', verify, (req, res) => {
  const list = read();
  const next = list.filter(n => n.id !== req.params.id);
  write(next);
  res.json({ ok: true });
});

export default router;
