import { Router } from 'express';
import { handleWebhook } from '../controllers/webhookController.js';

const router = Router();

/**
 * POST /webhook
 *
 * Receives GitHub webhook events.
 * The signature verification middleware expects req.rawBody to be attached
 * by the custom JSON verify callback in server.js.
 */
router.post('/webhook', handleWebhook);

export default router;
