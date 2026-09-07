import { Router } from 'express';

const router = Router();

/**
 * GET /ping
 *
 * Health-check endpoint. Returns HTTP 200 with a JSON body.
 * Used to verify the server is running before configuring ngrok or webhooks.
 */
router.get('/ping', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Codence backend is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
