import { Router } from 'express';
import { getInterview, submitInterview } from '../controllers/interviewController.js';

const router = Router();

/**
 * GET /interview/:id
 *
 * Fetch interview context and AI-generated questions.
 * Called by the frontend when a developer opens an interview link.
 */
router.get('/interview/:id', getInterview);

/**
 * POST /interview/:id/submit
 *
 * Submit the developer's answers.
 * Body: { questions: string[], answers: string[] }
 */
router.post('/interview/:id/submit', submitInterview);

export default router;
