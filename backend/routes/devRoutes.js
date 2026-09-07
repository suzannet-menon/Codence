/**
 * devRoutes.js
 *
 * Development-only routes for local testing.
 * These routes are NOT mounted in production (NODE_ENV=production).
 *
 * Routes:
 *   POST /dev/seed-interview   — inject a fake interview session into interviewStore
 *   GET  /dev/store            — inspect contents of interviewStore
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as interviewStore from '../services/interviewStore.js';

const router = Router();

/**
 * POST /dev/seed-interview
 *
 * Creates a pre-scored interview session so the interview flow can be tested
 * without needing a real GitHub webhook + live GitHub API.
 *
 * Body (all optional — sensible defaults are used):
 * {
 *   prTitle?         : string
 *   prUrl?           : string
 *   repositoryOwner? : string
 *   repositoryName?  : string
 *   author?          : string
 *   diff?            : string
 *   score?           : number
 *   reasons?         : string[]
 * }
 *
 * Response: { success: true, interviewId: "..." }
 */
router.post('/dev/seed-interview', (req, res) => {
  const {
    prTitle         = 'fix: refactor auth middleware',
    prUrl           = 'https://github.com/testowner/testrepo/pull/42',
    repositoryOwner = 'testowner',
    repositoryName  = 'testrepo',
    author          = 'bob',
    diff            = '--- a/auth/middleware.js\n+++ b/auth/middleware.js\n@@ refactored @@',
    score           = 65,
    reasons         = ['Touches auth/', 'Added file', 'Keyword: fix'],
  } = req.body || {};

  const interviewId = uuidv4();

  interviewStore.save(interviewId, {
    id: interviewId,
    pr: {
      prTitle,
      prUrl,
      repositoryName,
      repositoryOwner,
      author,
      baseBranch: 'main',
      headBranch: 'fix-auth',
      diff,
    },
    files: [
      { filename: 'auth/middleware.js', status: 'modified' },
      { filename: 'auth/session.js',   status: 'added'    },
      { filename: 'package.json',       status: 'modified' },
    ],
    score,
    reasons,
    createdAt: new Date().toISOString(),
  });

  console.log(`[DEV] Seeded interview ${interviewId}`);

  return res.status(200).json({ success: true, interviewId });
});

/**
 * GET /dev/store
 *
 * Returns the current number of pending interviews (not the full data,
 * to keep the response small).
 */
router.get('/dev/store', (_req, res) => {
  res.status(200).json({ success: true, pendingInterviews: interviewStore.size() });
});

export default router;
