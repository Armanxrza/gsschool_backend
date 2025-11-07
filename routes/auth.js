import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '@dmin##';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@dmin22';
const JWT_SECRET = process.env.JWT_SECRET || 'very-secret-key-change';
const TOKEN_COOKIE = 'gs_token';
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  // For cross-site requests (frontend on gsschool.edu.np, backend on render.com),
  // cookies need SameSite=None and Secure=true to be accepted by modern browsers.
  // Note: Third-party cookies may still be blocked; we also return the token in the body
  // and accept Authorization: Bearer <token> as an alternative.
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd, // secure cookies only over HTTPS in production
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(TOKEN_COOKIE, token, COOKIE_OPTIONS);
  return token;
}

function getTokenFromReq(req) {
  const bearer = req.headers.authorization || '';
  if (bearer.startsWith('Bearer ')) return bearer.slice(7);
  return req.cookies[TOKEN_COOKIE] || null;
}

function verify(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = setAuthCookie(res, { username: ADMIN_USERNAME, role: 'admin' });
    return res.json({ ok: true, user: { username: ADMIN_USERNAME }, token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', verify, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export { verify };
export const AUTH_CONFIG = {
  TOKEN_COOKIE,
  COOKIE_OPTIONS,
  isProd,
};
export default router;
