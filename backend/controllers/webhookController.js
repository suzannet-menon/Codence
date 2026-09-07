/**
 * webhookController.js
 *
 * Handles POST /webhook.
 *
 * Flow:
 *  1. Verify X-Hub-Signature-256 (if GITHUB_WEBHOOK_SECRET is set)
 *  2. Identify X-GitHub-Event header
 *  3. For pull_request events with relevant actions → parse + normalise payload
 *  4. Fetch changed files from GitHub API (scorer needs the file list)
 *  5. Pass normalised PR to Person B's scorePR()
 *  6. If score < 50 → skip interview
 *  7. If score >= 50 → create interview ID, store context, return interviewId
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { parsePullRequestPayload } from '../utils/githubParser.js';
import { getPullRequestFiles, getPullRequestDiff } from '../services/githubService.js';
import { scorePR } from '../services/scorer.js';
import * as interviewStore from '../services/interviewStore.js';

// Actions that indicate a PR is ready for scoring
const SUPPORTED_ACTIONS = ['opened', 'reopened', 'synchronize'];

// Importance threshold — must match README / team agreement
const IMPORTANCE_THRESHOLD = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Signature verification (HMAC-SHA256)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the X-Hub-Signature-256 header from GitHub.
 * If GITHUB_WEBHOOK_SECRET is not set, verification is skipped (dev convenience).
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // Secret not configured — skip verification (useful for local testing)
    console.warn('[WEBHOOK] GITHUB_WEBHOOK_SECRET not set — skipping signature validation');
    return true;
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[WEBHOOK] Missing X-Hub-Signature-256 header');
    return false;
  }

  // req.rawBody is attached by the express.json({ verify: ... }) middleware in server.js
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /webhook
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleWebhook(req, res) {
  // ── 1. Signature verification ─────────────────────────────────────────────
  if (!verifySignature(req)) {
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }

  // ── 2. Event identification ────────────────────────────────────────────────
  const event = req.headers['x-github-event'];
  console.log(`[WEBHOOK] Event: ${event}`);

  if (event !== 'pull_request') {
    console.log(`[WEBHOOK] Ignored event: ${event}`);
    return res.status(200).json({ success: true, message: `Event '${event}' ignored` });
  }

  // ── 3. Parse payload ──────────────────────────────────────────────────────
  let normalizedPR;
  try {
    normalizedPR = parsePullRequestPayload(req.body);
  } catch (err) {
    console.error('[WEBHOOK] Payload parse error:', err.message);
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  const { action, prNumber, prTitle, repositoryName, repositoryOwner, author } = normalizedPR;

  console.log(`[WEBHOOK] Action: ${action}`);
  console.log(`[WEBHOOK] Repository: ${repositoryOwner}/${repositoryName}`);
  console.log(`[WEBHOOK] PR #${prNumber}: ${prTitle}`);
  console.log(`[WEBHOOK] Author: ${author}`);

  // ── 4. Filter supported actions ────────────────────────────────────────────
  if (!SUPPORTED_ACTIONS.includes(action)) {
    console.log(`[WEBHOOK] Unsupported action: ${action} — skipping`);
    return res.status(200).json({ success: true, message: `Action '${action}' not scored` });
  }

  // ── 5. Fetch file list from GitHub API ────────────────────────────────────
  let files = [];
  let diff = '';

  try {
    console.log(`[GITHUB] Fetching PR files`);
    files = await getPullRequestFiles(repositoryOwner, repositoryName, prNumber);
    console.log(`[GITHUB] ${files.length} file(s) changed`);
  } catch (err) {
    console.error('[GITHUB] Failed to fetch PR files:', err.message);
    // Non-fatal: scorer will run with empty file list (may under-score, but won't crash)
  }

  try {
    diff = await getPullRequestDiff(repositoryOwner, repositoryName, prNumber);
    console.log(`[GITHUB] Diff fetched (${diff.length} chars)`);
  } catch (err) {
    console.error('[GITHUB] Failed to fetch PR diff:', err.message);
    // Non-fatal: Gemini will generate less specific questions, but flow continues
  }

  // Attach enriched data to the normalised PR
  normalizedPR.diff = diff;

  // ── 6. Score the PR (Person B) ─────────────────────────────────────────────
  // scorePR() expects { title, files: [{ filename, status }] }
  const scorerInput = {
    title: prTitle,
    files,
  };

  let scoreResult;
  try {
    scoreResult = scorePR(scorerInput);
  } catch (err) {
    console.error('[SCORER] scorePR threw an error:', err.message);
    return res.status(500).json({ success: false, error: 'Scoring failed' });
  }

  const { score, reasons } = scoreResult;
  const important = score >= IMPORTANCE_THRESHOLD;

  console.log(`[SCORER] Score: ${score}`);
  console.log(`[SCORER] Important: ${important}`);
  if (reasons.length) {
    console.log('[SCORER] Reasons:', reasons.join(' | '));
  }

  // ── 7a. Below threshold — skip interview ───────────────────────────────────
  if (!important) {
    return res.status(200).json({
      success: true,
      important: false,
      score,
      message: 'Pull request does not require an interview',
    });
  }

  // ── 7b. Above threshold — create interview ─────────────────────────────────
  const interviewId = uuidv4();

  interviewStore.save(interviewId, {
    id: interviewId,
    pr: normalizedPR,
    files,
    score,
    reasons,
    createdAt: new Date().toISOString(),
  });

  console.log(`[INTERVIEW] Created: ${interviewId}`);

  return res.status(200).json({
    success: true,
    important: true,
    interviewId,
    score,
    pr: {
      title: prTitle,
      url: normalizedPR.prUrl,
      repository: `${repositoryOwner}/${repositoryName}`,
      author,
    },
  });
}
