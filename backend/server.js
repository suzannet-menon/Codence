/**
 * server.js — Codence Express Backend
 *
 * Entry point. Configures middleware, mounts routes, starts the server.
 *
 * Start with:
 *   npm run dev   (node --watch, auto-restarts on file changes)
 *   npm start     (production)
 *
 * Default port: 5000 (override with PORT env variable)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import pingRoutes      from './routes/pingRoutes.js';
import webhookRoutes   from './routes/webhookRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import devRoutes       from './routes/devRoutes.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-GitHub-Event', 'X-Hub-Signature-256'],
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Body parsing
//
// We use a custom `verify` callback to preserve the raw request body buffer.
// The webhook controller needs the raw bytes to compute HMAC-SHA256.
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/', pingRoutes);
app.use('/', webhookRoutes);
app.use('/', interviewRoutes);

// Development-only routes (test seeding / inspection)
// NOT mounted in production
if (process.env.NODE_ENV !== 'production') {
  app.use('/', devRoutes);
  console.log('[SERVER] Dev routes mounted (POST /dev/seed-interview, GET /dev/store)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// Stack traces are NOT sent to clients.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // JSON parse errors from express.json() middleware
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }
  console.error('[SERVER] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[SERVER] Codence backend running on http://localhost:${PORT}`);
  console.log(`[SERVER] Webhook endpoint: POST http://localhost:${PORT}/webhook`);
  console.log(`[SERVER] Health check:     GET  http://localhost:${PORT}/ping`);
});

export default app;
