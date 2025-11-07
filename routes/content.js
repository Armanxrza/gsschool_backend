import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verify } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

const router = Router();
const allowedPages = new Set(['home','about','faculty','facilities','achievements','testimonials','admissions','activities','contact','courses','footer']);

function readJson(name) {
  const file = path.join(dataDir, name);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(name, data) {
  const file = path.join(dataDir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

router.get('/home', (_req, res) => {
  res.json(readJson('home.json'));
});

router.put('/home', verify, (req, res) => {
  writeJson('home.json', req.body);
  res.json({ ok: true });
});

router.get('/about', (_req, res) => {
  res.json(readJson('about.json'));
});

router.put('/about', verify, (req, res) => {
  writeJson('about.json', req.body);
  res.json({ ok: true });
});

export default router;

// Generic page endpoints for additional pages
router.get('/page/:key', (req, res) => {
  const key = String(req.params.key || '').toLowerCase();
  if (!allowedPages.has(key)) return res.status(404).json({ error: 'Not found' });
  try {
    const data = readJson(`${key}.json`);
    return res.json(data);
  } catch (e) {
    return res.status(404).json({ error: 'Not found' });
  }
});

router.put('/page/:key', verify, (req, res) => {
  const key = String(req.params.key || '').toLowerCase();
  if (!allowedPages.has(key)) return res.status(404).json({ error: 'Not found' });
  try {
    writeJson(`${key}.json`, req.body);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save' });
  }
});
