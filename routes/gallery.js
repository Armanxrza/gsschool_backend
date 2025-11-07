import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { verify } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '..', 'data', 'gallery.json');
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });

const router = Router();

const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const write = (d) => fs.writeFileSync(dataFile, JSON.stringify(d, null, 2));

router.get('/', (_req, res) => {
  res.json(read());
});

router.post('/', verify, upload.single('image'), (req, res) => {
  const list = read();
  const filePath = `/uploads/${req.file.filename}`;
  const item = {
    id: Date.now().toString(),
    title: req.body.title || 'Image',
    description: req.body.description || '',
    category: req.body.category || 'uncategorized',
    image: filePath,
    date: req.body.date || new Date().toISOString().slice(0, 10)
  };
  list.unshift(item);
  write(list);
  res.json(item);
});

router.delete('/:id', verify, (req, res) => {
  const list = read();
  const found = list.find(i => i.id === req.params.id);
  const next = list.filter(i => i.id !== req.params.id);
  write(next);
  // Optionally delete file
  if (found && found.image && found.image.startsWith('/uploads/')) {
    const fileOnDisk = path.join(uploadsDir, path.basename(found.image));
    if (fs.existsSync(fileOnDisk)) fs.unlinkSync(fileOnDisk);
  }
  res.json({ ok: true });
});

export default router;
