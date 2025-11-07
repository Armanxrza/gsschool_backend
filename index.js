import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter, { AUTH_CONFIG } from './routes/auth.js';
import contentRouter from './routes/content.js';
import noticesRouter from './routes/notices.js';
import galleryRouter from './routes/gallery.js';
import uploadRouter from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure data files exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const ensureFile = (name, initial) => {
  const file = path.join(dataDir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initial, null, 2));
};
ensureFile('home.json', {
  hero: {
    backgroundImage: '/building.png',
    titleLine1: 'Gaurishankar English Boarding',
    titleLine2: 'Secondary School',
    tagline: 'Nurturing Excellence • Inspiring Innovation • Building Character'
  },
  leadership: [
    { name: "Chairman's Message", title: 'Janardan Nepal', message: 'I urge all potential students... Wish you all have a wonderful experience in Gaurishankar.', image: '/janardan.jpg' },
    { name: "Director's Message", title: 'Dhaneshwor Sah', message: 'We embrace modern teaching methodologies...', image: '/Dhaneshwor.jpg' },
    { name: "Principal's Message", title: 'Mahesh Thapa', message: "We prioritize your success and well-being...", image: '/mahesh.jpg' }
  ]
});
ensureFile('about.json', {
  header: {
    title: 'About Us',
    subtitle: 'Discover our journey of educational excellence, values that guide us, and the vision that drives us forward'
  },
  values: [],
  objectives: [],
  timeline: []
});
ensureFile('notices.json', []);
ensureFile('gallery.json', []);
// Additional pages to manage via CMS
['faculty','facilities','achievements','testimonials','admissions','activities','contact','courses'].forEach((p) => {
  ensureFile(`${p}.json`, {
    header: { title: p.charAt(0).toUpperCase() + p.slice(1), subtitle: '' },
    content: '',
    images: []
  });
});
// Footer content
ensureFile('footer.json', {
  about: {
    title: 'Gaurishankar College',
    description: 'Nurturing minds, shaping futures. Excellence in education since our establishment, providing quality learning experiences in Science, Management, and Law.',
    under: 'Under the Management of Hillside College Of Engineering',
    logo: '/logo.png'
  },
  quickLinks: [
    { name: 'About Us', path: '/about' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Download Booklet', path: '/faculty' },
    { name: 'Download Calender', path: '/admissions' },
    { name: 'Download Brochure', path: '/contact' }
  ],
  contact: {
    address: ['Mahalaxmi-2, Imadol, Balkumari', 'Lalitpur, Nepal'],
    phone: '01-5203132',
    email: 'schoolgaurishankar@gmail.com'
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100063762841241',
    instagram: '#',
    youtube: '#'
  },
  legal: {
    copyright: '© 2025 Gaurishankar English Boarding Secondary School/College. All rights reserved. Madani Technology Pvt. Ltd.',
    privacy: '#',
    terms: '#'
  }
});

// CORS: allow localhost/127.0.0.1 from any port (dev friendly) + production domain
const allowedOrigins = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/gsschool\.edu\.np$/,
  /^https?:\/\/www\.gsschool\.edu\.np$/,
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((rx) => rx.test(origin))) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Static serving for uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/content', contentRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (_req, res) => {
  // gather basic stats
  const now = new Date();
  const uptimeSeconds = process.uptime();
  const node = process.version;
  const env = process.env.NODE_ENV || 'development';
  // data counts
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf-8'));
  const counts = {};
  try { counts.notices = readJson('notices.json').length; } catch { counts.notices = 0; }
  try { counts.gallery = readJson('gallery.json').length; } catch { counts.gallery = 0; }
  const pageKeys = ['home','about','faculty','facilities','achievements','testimonials','admissions','activities','contact','courses'];
  const pages = {};
  for (const k of pageKeys) {
    try { const j = readJson(`${k}.json`); pages[k] = { hasHeader: !!j.header, images: Array.isArray(j.images) ? j.images.length : 0 }; } catch { pages[k] = { hasHeader: false, images: 0 }; }
  }
  // uploads dir write check
  let uploadsWritable = true;
  try { fs.accessSync(uploadsDir, fs.constants.W_OK); } catch { uploadsWritable = false; }
  const corsOrigins = allowedOrigins.map((rx) => rx.toString());
  res.json({
    status: 'ok',
    time: now.toISOString(),
    uptimeSeconds,
    node,
    env,
    data: { counts, pages },
    security: {
      authCookie: AUTH_CONFIG?.TOKEN_COOKIE || 'gs_token',
      cookieOptions: AUTH_CONFIG?.COOKIE_OPTIONS || null,
      corsOrigins,
      uploadsWritable,
    }
  });
});

// Serve static frontend files (production)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Fallback: serve index.html for all non-API routes (SPA support)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
